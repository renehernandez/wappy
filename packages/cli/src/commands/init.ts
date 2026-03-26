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

interface CfAccount {
  name: string;
  id: string;
}

async function detectAccounts(): Promise<CfAccount[]> {
  try {
    const result = await execaCommand(`${WRANGLER} whoami`);
    const output = result.stdout + result.stderr;
    const accounts: CfAccount[] = [];
    // Parse table rows like: │ Account Name │ abc123def456 │
    const lines = output.split("\n");
    for (const line of lines) {
      const match = line.match(/│\s*(.+?)\s*│\s*([0-9a-f]{32})\s*│/);
      if (match) {
        const name = match[1].trim();
        if (name && name !== "Account Name") {
          accounts.push({ name, id: match[2] });
        }
      }
    }
    return accounts;
  } catch {
    return [];
  }
}

function wranglerEnv(accountId: string): Record<string, string> {
  return { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId } as Record<
    string,
    string
  >;
}

async function findD1Id(
  name: string,
  env: Record<string, string>,
): Promise<string | null> {
  try {
    const result = await execaCommand(`${WRANGLER} d1 list --json`, { env });
    const databases = JSON.parse(result.stdout) as Array<{
      uuid: string;
      name: string;
    }>;
    const db = databases.find((d) => d.name === name);
    return db?.uuid ?? null;
  } catch {
    return null;
  }
}

async function findKvId(
  title: string,
  env: Record<string, string>,
): Promise<string | null> {
  try {
    const result = await execaCommand(`${WRANGLER} kv namespace list`, { env });
    const namespaces = JSON.parse(result.stdout) as Array<{
      id: string;
      title: string;
    }>;
    // KV title is "wapi-wapi-kv" when created with `wrangler kv namespace create wapi-kv`
    const ns = namespaces.find(
      (n) => n.title === title || n.title.includes(title),
    );
    return ns?.id ?? null;
  } catch {
    return null;
  }
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
  args: {
    accountId: {
      type: "string",
      description:
        "Cloudflare account ID (required if you have multiple accounts)",
    },
  },
  async run({ args }) {
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

    // Resolve account ID
    let accountId = args.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      const accounts = await detectAccounts();
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

    // Step 2: Create D1 database
    consola.start("Creating D1 database...");
    let d1Id: string;
    try {
      await execaCommand(`${WRANGLER} d1 create wapi-db`, { env });
      const id = await findD1Id("wapi-db", env);
      if (!id) {
        consola.error("D1 database created but could not find its ID.");
        process.exit(1);
      }
      d1Id = id;
      consola.success(`D1 database created: ${d1Id}`);
    } catch (err) {
      consola.error(`Failed to create D1 database: ${String(err)}`);
      process.exit(1);
    }

    // Step 3: Create KV namespace
    consola.start("Creating KV namespace...");
    let kvId: string;
    try {
      await execaCommand(`${WRANGLER} kv namespace create wapi-kv`, { env });
      const id = await findKvId("wapi-kv", env);
      if (!id) {
        consola.error("KV namespace created but could not find its ID.");
        process.exit(1);
      }
      kvId = id;
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
        env,
      });
      deployUrl = parseDeployUrl(deployResult.stdout + deployResult.stderr);
      consola.success(`Deployed to ${deployUrl || "Cloudflare Workers"}`);

      // Step 5: Apply migrations
      consola.start("Applying D1 migrations...");
      await execaCommand(`${WRANGLER} d1 migrations apply wapi-db --remote`, {
        cwd: scaffold.dir,
        env,
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

export { findD1Id, findKvId, parseDeployUrl };
