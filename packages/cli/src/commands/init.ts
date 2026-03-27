import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineCommand } from "citty";
import consola from "consola";
import { execaCommand } from "execa";
import open from "open";
import { readDeployment, updateConfig, updateDeployment } from "../config";
import {
  generatePackageJson,
  generateWranglerConfig,
} from "../deploy/scaffold";

const WRANGLER = "npx wrangler@4";

async function checkWrangler(): Promise<boolean> {
  try {
    await execaCommand(`${WRANGLER} --version`);
    return true;
  } catch {
    return false;
  }
}

interface CfAccount {
  name: string;
  id: string;
}

interface WhoamiResult {
  isAuthenticated: boolean;
  accounts: CfAccount[];
}

async function checkWranglerAuth(): Promise<WhoamiResult> {
  try {
    const result = await execaCommand(`${WRANGLER} whoami`);
    if (result.stdout.includes("not authenticated")) {
      return { isAuthenticated: false, accounts: [] };
    }
    const output = result.stdout + result.stderr;
    const accounts: CfAccount[] = [];
    for (const line of output.split("\n")) {
      const match = line.match(/│\s*(.+?)\s*│\s*([0-9a-f]{32})\s*│/);
      if (match) {
        const name = match[1].trim();
        if (name && name !== "Account Name") {
          accounts.push({ name, id: match[2] });
        }
      }
    }
    return { isAuthenticated: true, accounts };
  } catch {
    return { isAuthenticated: false, accounts: [] };
  }
}

function wranglerEnv(accountId: string): Record<string, string> {
  return { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId } as Record<
    string,
    string
  >;
}

function ensureGenerated(
  filename: string,
  generate: () => void,
  label: string,
): void {
  const filePath = join(process.cwd(), filename);
  if (!existsSync(filePath)) {
    generate();
    consola.success(`Generated ${label}`);
  } else {
    consola.info(`Using existing ${label}`);
  }
}

export function parseDeployUrl(output: string): string | null {
  const match = output.match(/(https:\/\/[^\s]+\.workers\.dev)/);
  return match?.[1] ?? null;
}

export default defineCommand({
  meta: {
    name: "init",
    description:
      "Deploy WAPI to your Cloudflare account (no repo clone needed)",
  },
  args: {
    accountId: {
      type: "string",
      description:
        "Cloudflare account ID (required if you have multiple accounts)",
    },
    domain: {
      type: "string",
      description: "Custom domain for the Worker (e.g., wapi.fullscript.cloud)",
    },
  },
  async run({ args }) {
    consola.info("Setting up WAPI on your Cloudflare account...\n");

    const state = readDeployment();
    const customDomain = args.domain || undefined;

    // Step 1: Check wrangler
    if (!(await checkWrangler())) {
      consola.error(
        "wrangler is required but not found.\nInstall: npm install -g wrangler",
      );
      process.exit(1);
    }

    const whoami = await checkWranglerAuth();
    if (!whoami.isAuthenticated) {
      consola.error(`Not logged in to Cloudflare.\nRun: ${WRANGLER} login`);
      process.exit(1);
    }

    consola.success("Wrangler authenticated");

    // Step 2: Resolve account ID (prefer arg > env > saved state > detect)
    let accountId =
      args.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || state.accountId;
    if (!accountId) {
      const { accounts } = whoami;
      if (accounts.length === 0) {
        consola.error(
          "No Cloudflare accounts found. Run: npx wrangler@4 login",
        );
        process.exit(1);
      }
      if (accounts.length === 1) {
        accountId = accounts[0].id;
        consola.info(`Using account: ${accounts[0].name}`);
      } else {
        consola.info("Multiple Cloudflare accounts found:\n");
        for (let i = 0; i < accounts.length; i++) {
          console.log(`  ${i + 1}. ${accounts[i].name} (${accounts[i].id})`);
        }
        console.log("");
        const choice = await consola.prompt("Select account:", {
          type: "text",
          placeholder: `Enter number (1-${accounts.length})`,
        });
        const idx = Number.parseInt(String(choice), 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= accounts.length) {
          consola.error("Invalid selection.");
          process.exit(1);
        }
        accountId = accounts[idx].id;
        consola.info(`Using account: ${accounts[idx].name}`);
      }
    }

    const env = wranglerEnv(accountId);
    updateDeployment({ accountId });

    // Step 3: Generate package.json if it doesn't exist
    ensureGenerated(
      "package.json",
      () => generatePackageJson(process.cwd()),
      "package.json",
    );

    // Step 4: Generate wrangler.jsonc if it doesn't exist
    ensureGenerated(
      "wrangler.jsonc",
      () => generateWranglerConfig(process.cwd(), { domain: customDomain }),
      "wrangler.jsonc",
    );

    // Step 5: Install npm dependencies
    consola.start("Installing dependencies...");
    try {
      await execaCommand("npm install", {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      consola.success("Dependencies installed");
    } catch (err) {
      consola.error(`npm install failed: ${String(err)}`);
      process.exit(1);
    }

    // Step 6: Deploy Worker
    let deployUrl: string | null = null;
    try {
      consola.start("Deploying Worker...");
      const deployResult = await execaCommand(`${WRANGLER} deploy`, {
        cwd: process.cwd(),
        env,
      });
      deployUrl = parseDeployUrl(deployResult.stdout + deployResult.stderr);
      consola.success(`Deployed to ${deployUrl || "Cloudflare Workers"}`);
    } catch (err) {
      consola.error(`Deployment failed: ${String(err)}`);
      consola.warn(
        "You may need to clean up resources manually in the Cloudflare dashboard.",
      );
      process.exit(1);
    }

    // Step 7: Apply D1 migrations
    try {
      consola.start("Applying D1 migrations...");
      await execaCommand(
        `${WRANGLER} d1 migrations apply wapi-db --remote --migrations-dir app/db/migrations`,
        {
          cwd: process.cwd(),
          env,
          stdin: "inherit",
        },
      );
      consola.success("Migrations applied");
    } catch (err) {
      consola.error(`Migrations failed: ${String(err)}`);
      process.exit(1);
    }

    // Step 8: Save config + deployment state
    // Prefer custom domain over workers.dev URL when available
    const serverUrl = customDomain
      ? `https://${customDomain}`
      : (deployUrl ?? undefined);

    if (serverUrl) {
      updateConfig({ serverUrl });
      updateDeployment({
        workerName: "wapi",
        workerUrl: deployUrl ?? undefined,
        customDomain,
      });
      consola.success(`Server URL saved: ${serverUrl}`);
    }

    // Step 9: CF Access instructions
    const displayUrl = serverUrl || deployUrl || "<your-worker-url>";
    console.log("\n──────────────────────────────────────────");
    console.log("  Next: Configure Cloudflare Access Control");
    console.log("──────────────────────────────────────────\n");
    console.log("  1. Open the Cloudflare Zero Trust dashboard");
    console.log(
      "  2. Go to Access > Applications > Add Application > Self-hosted",
    );
    console.log(`  3. Set the application domain: ${displayUrl}`);
    console.log("  4. Add an identity provider (One-time PIN, Google, etc.)");
    console.log("  5. Create a policy allowing your email\n");

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
