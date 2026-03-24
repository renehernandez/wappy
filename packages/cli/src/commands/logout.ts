import { defineCommand } from "citty";
import consola from "consola";
import { deleteCredentials, readCredentials } from "../config";

export default defineCommand({
  meta: {
    name: "logout",
    description:
      "Remove local credentials (does not revoke the device on the server)",
  },
  run() {
    const credentials = readCredentials();
    if (!credentials) {
      consola.info("Already logged out.");
      return;
    }

    deleteCredentials();
    consola.success("Logged out.");
  },
});
