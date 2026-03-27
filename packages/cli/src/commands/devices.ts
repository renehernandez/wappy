import { defineCommand } from "citty";
import consola from "consola";
import { createApiClient } from "../api";
import { getServerUrl, readCredentials } from "../config";

export default defineCommand({
  meta: {
    name: "devices",
    description: "List and manage registered devices",
  },
  args: {
    action: {
      type: "positional",
      description: "Action: list (default) or revoke",
      required: false,
    },
    target: {
      type: "positional",
      description: "Device name or ID to revoke",
      required: false,
    },
  },
  async run({ args }) {
    const serverUrl = getServerUrl();
    const credentials = readCredentials();

    if (!serverUrl || !credentials) {
      consola.error('Not authenticated. Run "wappy auth" first.');
      process.exit(1);
    }

    const api = createApiClient(serverUrl, credentials.deviceToken);
    const action = args.action || "list";

    if (action === "list" || !action) {
      const devices = await api.listDevices();

      if (devices.length === 0) {
        consola.info("No devices registered.");
        return;
      }

      console.log("");
      console.log("  Registered devices:\n");
      for (const d of devices) {
        const status = d.revokedAt ? "revoked" : "active";
        const lastSeen = d.lastSeenAt
          ? new Date(d.lastSeenAt).toLocaleString()
          : "never";
        console.log(
          `  ${status === "active" ? "●" : "○"} ${d.name.padEnd(20)} ${status.padEnd(10)} last seen: ${lastSeen}`,
        );
      }
      console.log("");
    } else if (action === "revoke") {
      if (!args.target) {
        consola.error("Usage: wappy devices revoke <name-or-id>");
        process.exit(1);
      }

      const devices = await api.listDevices();
      const match = devices.find(
        (d) => d.name === args.target || d.id === args.target,
      );

      if (!match) {
        consola.error(`No device found matching "${args.target}".`);
        process.exit(1);
      }

      if (match.revokedAt) {
        consola.warn(`Device "${match.name}" is already revoked.`);
        return;
      }

      const confirm = await consola.prompt(`Revoke device "${match.name}"?`, {
        type: "confirm",
      });
      if (!confirm) return;

      await api.revokeDevice(match.id);
      consola.success(`Device "${match.name}" revoked.`);
    } else {
      consola.error(`Unknown action "${action}". Use "list" or "revoke".`);
      process.exit(1);
    }
  },
});
