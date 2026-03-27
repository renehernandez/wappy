import { createInterface } from "node:readline";
import { defineCommand } from "citty";
import consola from "consola";
import { getAdapter, listAdapters } from "../adapters/registry";
import { createApiClient } from "../api";
import { getServerUrl, readCredentials } from "../config";
import { SessionSync } from "../sync/session-sync";

export default defineCommand({
  meta: {
    name: "run",
    description: "Run an AI coding tool with session capture",
  },
  args: {
    tool: {
      type: "positional",
      description: "Tool to run (e.g. claude, codex)",
      required: true,
    },
  },
  async run({ args, rawArgs }) {
    const serverUrl = getServerUrl();
    const credentials = readCredentials();

    if (!serverUrl || !credentials) {
      consola.error('Not authenticated. Run "wappy auth" first.');
      process.exit(1);
    }

    const adapter = getAdapter(args.tool);
    if (!adapter) {
      consola.error(
        `Unknown tool "${args.tool}". Available: ${listAdapters().join(", ")}`,
      );
      process.exit(1);
    }

    const available = await adapter.isAvailable();
    if (!available) {
      consola.error(
        `"${args.tool}" is not installed or not in PATH. Install it first.`,
      );
      process.exit(1);
    }

    // Extra args passed to the tool (everything after the tool name)
    const toolArgs = rawArgs.slice(1);
    const cwd = process.cwd();

    // Set up session sync
    const api = createApiClient(serverUrl, credentials.deviceToken);
    const sync = new SessionSync(api, adapter.name);

    // Spawn the tool
    const child = adapter.spawn(toolArgs, { cwd });

    if (!child.stdout) {
      consola.error("Failed to capture tool output (no stdout pipe).");
      process.exit(1);
    }

    // Read JSON lines from stdout
    const rl = createInterface({ input: child.stdout });

    rl.on("line", (line) => {
      const msg = adapter.parseMessage(line);
      if (msg) {
        sync.handleMessage(msg);
      }
    });

    // Forward signals
    const onSignal = (signal: NodeJS.Signals) => {
      child.kill(signal);
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);

    // Wait for exit
    const exitCode = await new Promise<number>((resolve) => {
      child.on("exit", (code) => resolve(code ?? 0));
      child.on("error", (err) => {
        consola.error(`Tool process error: ${err.message}`);
        resolve(1);
      });
    });

    // Clean up
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);

    await sync.end();
    process.exit(exitCode);
  },
});
