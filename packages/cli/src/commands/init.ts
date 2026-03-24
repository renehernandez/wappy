import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import consola from "consola";
import { execaCommand } from "execa";
import { updateConfig } from "../config";

async function checkWrangler() {
  try {
    await execaCommand("wrangler --version");
    return true;
  } catch {
    return false;
  }
}

function parseD1Id(output: string): string | null {
  const match = output.match(/database_id\s*[=:]\s*"?([0-9a-f-]+)"?/i);
  return match?.[1] ?? null;
}

function parseKvId(output: string): string | null {
  const match = output.match(/id\s*[=:]\s*"?([0-9a-f-]+)"?/i);
  return match?.[1] ?? null;
}

function parseDeployUrl(output: string): string | null {
  const match = output.match(/(https:\/\/[^\s]+\.workers\.dev)/);
  return match?.[1] ?? null;
}

export default defineCommand({
  meta: {
    name: "init",
    description: "Provision Cloudflare resources and deploy WAPI",
  },
  args: {
    dir: {
      type: "string",
      description: "Path to the WAPI project directory",
      default: ".",
    },
  },
  async run({ args }) {
    const projectDir = resolve(args.dir);
    const appDir = resolve(projectDir, "app");

    // Check wrangler
    if (!(await checkWrangler())) {
      consola.error(
        "wrangler is not installed. Install it with: npm install -g wrangler",
      );
      process.exit(1);
    }

    consola.info("Provisioning WAPI on your Cloudflare account...\n");

    // Create D1 database
    consola.start("Creating D1 database...");
    let d1Id: string;
    try {
      const result = await execaCommand("wrangler d1 create wapi-db", {
        cwd: appDir,
      });
      const parsed = parseD1Id(result.stdout + result.stderr);
      if (!parsed) {
        consola.error("Failed to parse D1 database ID from output:");
        console.log(result.stdout);
        process.exit(1);
      }
      d1Id = parsed;
      consola.success(`D1 database created: ${d1Id}`);
    } catch (err) {
      consola.error("Failed to create D1 database:", String(err));
      process.exit(1);
    }

    // Create KV namespace
    consola.start("Creating KV namespace...");
    let kvId: string;
    try {
      const result = await execaCommand(
        "wrangler kv namespace create wapi-kv",
        { cwd: appDir },
      );
      const parsed = parseKvId(result.stdout + result.stderr);
      if (!parsed) {
        consola.error("Failed to parse KV namespace ID from output:");
        console.log(result.stdout);
        process.exit(1);
      }
      kvId = parsed;
      consola.success(`KV namespace created: ${kvId}`);
    } catch (err) {
      consola.error("Failed to create KV namespace:", String(err));
      process.exit(1);
    }

    // Generate wrangler.jsonc from template
    consola.start("Generating wrangler.jsonc...");
    const templatePath = resolve(appDir, "wrangler.template.jsonc");
    const outputPath = resolve(appDir, "wrangler.jsonc");
    try {
      let template = readFileSync(templatePath, "utf-8");
      template = template.replace("DATABASE_ID_PLACEHOLDER", d1Id);
      template = template.replace("KV_ID_PLACEHOLDER", kvId);
      writeFileSync(outputPath, template);
      consola.success("wrangler.jsonc generated");
    } catch (err) {
      consola.error("Failed to generate wrangler.jsonc:", String(err));
      process.exit(1);
    }

    // Apply migrations
    consola.start("Applying D1 migrations...");
    try {
      await execaCommand("wrangler d1 migrations apply wapi-db --remote", {
        cwd: appDir,
        stdin: "inherit",
      });
      consola.success("Migrations applied");
    } catch (err) {
      consola.error("Failed to apply migrations:", String(err));
      process.exit(1);
    }

    // Deploy
    consola.start("Deploying Worker...");
    let deployUrl: string | null = null;
    try {
      await execaCommand("pnpm run build", { cwd: appDir });
      const deployResult = await execaCommand("wrangler deploy", {
        cwd: appDir,
      });
      deployUrl = parseDeployUrl(deployResult.stdout + deployResult.stderr);
      consola.success(`Deployed to ${deployUrl || "Cloudflare Workers"}`);
    } catch (err) {
      consola.error("Failed to deploy:", String(err));
      process.exit(1);
    }

    // Save config
    if (deployUrl) {
      updateConfig({ serverUrl: deployUrl });
      consola.success(`Server URL saved: ${deployUrl}`);
    }

    // CF Access instructions
    console.log("\n──────────────────────────────────────");
    console.log("Next step: Configure Cloudflare Access");
    console.log("──────────────────────────────────────\n");
    console.log("1. Go to https://one.dash.cloudflare.com");
    console.log("2. Navigate to Access > Applications > Add an Application");
    console.log('3. Select "Self-hosted"');
    console.log(
      `4. Set the Application Domain to: ${deployUrl || "<your-worker-url>"}`,
    );
    console.log(
      "5. Configure an identity provider (One-time PIN, Google, GitHub, etc.)",
    );
    console.log("6. Create a policy to allow your email/domain\n");
    console.log(
      'Once configured, run "wapi auth" to authenticate this device.',
    );
  },
});

export { parseD1Id, parseKvId, parseDeployUrl };
