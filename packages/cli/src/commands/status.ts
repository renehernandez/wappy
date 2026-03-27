import { defineCommand } from "citty";
import consola from "consola";
import { getServerUrl, readCredentials } from "../config";

export default defineCommand({
  meta: {
    name: "status",
    description: "Show current configuration and auth state",
  },
  run() {
    const serverUrl = getServerUrl();
    const credentials = readCredentials();

    if (!serverUrl && !credentials) {
      consola.info('Not configured. Run "wappy init" to get started.');
      return;
    }

    console.log("");
    console.log(`  Server:  ${serverUrl || "(not configured)"}`);
    console.log(
      `  Device:  ${credentials?.machineName || "(not authenticated)"}`,
    );
    console.log(
      `  Status:  ${credentials ? "Authenticated" : "Not authenticated"}`,
    );
    console.log("");
  },
});
