import { defineCommand } from "citty";
import consola from "consola";
import { execaCommand } from "execa";
import { getServerUrl, readCredentials } from "../config";

export default defineCommand({
  meta: {
    name: "run",
    description: "Run a command with WAPI session tracking",
  },
  args: {
    command: {
      type: "positional",
      description: "Command to run (e.g. claude, codex)",
      required: true,
    },
  },
  async run({ args, rawArgs }) {
    const serverUrl = getServerUrl();
    const credentials = readCredentials();

    if (!serverUrl || !credentials) {
      consola.error('Not authenticated. Run "wapi auth" first.');
      process.exit(1);
    }

    consola.info("Session sync coming soon. Running command normally.\n");

    // rawArgs contains everything after the subcommand
    const command = [args.command, ...rawArgs.slice(1)].join(" ");

    try {
      const result = await execaCommand(command, {
        stdio: "inherit",
        reject: false,
      });
      process.exit(result.exitCode ?? 0);
    } catch (err) {
      consola.error(
        `Failed to run command: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }
  },
});
