import { hostname } from "node:os";
import { defineCommand } from "citty";
import consola from "consola";
import open from "open";
import { createApiClient } from "../api";
import { getServerUrl, readCredentials, writeCredentials } from "../config";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default defineCommand({
  meta: {
    name: "auth",
    description: "Authenticate this device with your WAPI server",
  },
  args: {
    name: {
      type: "string",
      description: "Device name",
      default: hostname(),
    },
  },
  async run({ args }) {
    const serverUrl = getServerUrl();
    if (!serverUrl) {
      consola.error(
        'No server URL configured. Run "wapi init" or "wapi config set serverUrl <url>".',
      );
      process.exit(1);
    }

    // Check existing credentials
    const existing = readCredentials();
    if (existing) {
      consola.warn(
        `Already authenticated as device "${existing.machineName}".`,
      );
      const confirm = await consola.prompt("Re-authenticate?", {
        type: "confirm",
      });
      if (!confirm) return;
    }

    const api = createApiClient(serverUrl);
    const machineName = args.name;

    // Request device code
    consola.start("Requesting device code...");
    let code: string;
    let verifyUrl: string;
    try {
      const result = await api.createDeviceCode(machineName);
      code = result.code;
      verifyUrl = result.verifyUrl;
    } catch (err) {
      consola.error(
        `Failed to request device code: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }

    // Display URL and try to open browser
    console.log("\n  Authenticate by visiting:\n");
    console.log(`  ${verifyUrl}\n`);

    try {
      await open(verifyUrl);
      consola.info("Opened in your browser.");
    } catch {
      consola.info("Open the URL above in any browser to approve this device.");
    }

    // Poll for approval
    consola.start("Waiting for approval...");
    while (true) {
      await sleep(2000);

      try {
        const result = await api.pollDeviceCode(code);

        if (result.status === "approved") {
          writeCredentials({
            deviceToken: result.deviceToken,
            machineName,
          });
          consola.success("Authenticated!");
          return;
        }

        if (result.status === "denied") {
          consola.error("Device authorization was denied.");
          process.exit(1);
        }

        if (result.status === "expired") {
          consola.error('Device code expired. Run "wapi auth" to try again.');
          process.exit(1);
        }

        // status === "pending" — keep polling
      } catch (err) {
        consola.error(
          `Polling failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    }
  },
});
