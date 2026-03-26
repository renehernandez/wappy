import { defineCommand } from "citty";
import consola from "consola";
import { execaCommand } from "execa";
import open from "open";
import { updateConfig } from "../config";
import { scaffoldDeployDir } from "../deploy/scaffold";

const WRANGLER = "npx wrangler@4";

async function checkWrangler(): Promise<boolean> {
  try {
    await execaCommand(`${WRANGLER} --version`);
    return true;
  } catch {
    return false;
  }
}

async function checkWranglerAuth(): Promise<boolean> {
  try {
    const result = await execaCommand(`${WRANGLER} whoami`);
    return !result.stdout.includes("not authenticated");
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
    description:
      "Deploy WAPI to your Cloudflare account (no repo clone needed)",
  },
  async run() {
    consola.info("Setting up WAPI on your Cloudflare account...\n");

    // Step 1: Check wrangler
    if (!(await checkWrangler())) {
      consola.error(
        "wrangler is required but not found.\nInstall: npm install -g wrangler",
      );
      process.exit(1);
    }

    if (!(await checkWranglerAuth())) {
      consola.error(`Not logged in to Cloudflare.\nRun: ${WRANGLER} login`);
      process.exit(1);
    }

    consola.success("Wrangler authenticated");

    // Step 2: Create D1 database
    consola.start("Creating D1 database...");
    let d1Id: string;
    try {
      const result = await execaCommand(`${WRANGLER} d1 create wapi-db`);
      const parsed = parseD1Id(result.stdout + result.stderr);
      if (!parsed) {
        consola.error("Failed to parse D1 database ID from output:");
        console.log(result.stdout);
        process.exit(1);
      }
      d1Id = parsed;
      consola.success(`D1 database created: ${d1Id}`);
    } catch (err) {
      consola.error(`Failed to create D1 database: ${String(err)}`);
      process.exit(1);
    }

    // Step 3: Create KV namespace
    consola.start("Creating KV namespace...");
    let kvId: string;
    try {
      const result = await execaCommand(
        `${WRANGLER} kv namespace create wapi-kv`,
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
      consola.error(`Failed to create KV namespace: ${String(err)}`);
      consola.warn(`Resources created so far: D1 database (${d1Id})`);
      process.exit(1);
    }

    // Step 4: Scaffold temp dir and deploy
    consola.start("Preparing deployment...");
    let scaffold: ReturnType<typeof scaffoldDeployDir>;
    try {
      scaffold = scaffoldDeployDir({
        d1DatabaseId: d1Id,
        kvNamespaceId: kvId,
      });
    } catch (err) {
      consola.error(
        `Failed to prepare deployment: ${err instanceof Error ? err.message : String(err)}`,
      );
      consola.warn(`Resources created: D1 (${d1Id}), KV (${kvId})`);
      process.exit(1);
    }

    let deployUrl: string | null = null;
    try {
      consola.start("Deploying Worker...");
      const deployResult = await execaCommand(`${WRANGLER} deploy`, {
        cwd: scaffold.dir,
      });
      deployUrl = parseDeployUrl(deployResult.stdout + deployResult.stderr);
      consola.success(`Deployed to ${deployUrl || "Cloudflare Workers"}`);

      // Step 5: Apply migrations
      consola.start("Applying D1 migrations...");
      await execaCommand(`${WRANGLER} d1 migrations apply wapi-db --remote`, {
        cwd: scaffold.dir,
        stdin: "inherit",
      });
      consola.success("Migrations applied");
    } catch (err) {
      consola.error(`Deployment failed: ${String(err)}`);
      consola.warn(
        `Resources created: D1 (${d1Id}), KV (${kvId}). You may need to clean these up manually in the Cloudflare dashboard.`,
      );
    } finally {
      scaffold.cleanup();
    }

    // Step 6: Save config
    if (deployUrl) {
      updateConfig({ serverUrl: deployUrl });
      consola.success(`Server URL saved: ${deployUrl}`);
    }

    // Step 7: CF Access instructions
    console.log("\n──────────────────────────────────────────");
    console.log("  Next: Configure Cloudflare Access");
    console.log("──────────────────────────────────────────\n");
    console.log("  1. Open Cloudflare Zero Trust dashboard");
    console.log("  2. Go to Access > Applications > Add Application");
    console.log('  3. Select "Self-hosted"');
    console.log(`  4. Set domain: ${deployUrl || "<your-worker-url>"}`);
    console.log("  5. Add an identity provider (One-time PIN, Google, etc.)");
    console.log("  6. Create a policy for your email\n");

    try {
      await open("https://one.dash.cloudflare.com");
      consola.info("Opened Cloudflare Zero Trust dashboard in your browser.");
    } catch {
      consola.info("Open https://one.dash.cloudflare.com to set up Access.");
    }

    console.log(
      '\nOnce Access is configured, run "wapi auth" to authenticate.\n',
    );
  },
});

export { parseD1Id, parseKvId, parseDeployUrl };
