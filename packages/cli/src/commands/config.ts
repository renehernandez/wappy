import { defineCommand } from "citty";
import consola from "consola";
import { readConfig, updateConfig } from "../config";

export default defineCommand({
  meta: {
    name: "config",
    description: "Get or set configuration values",
  },
  args: {
    action: {
      type: "positional",
      description: "Action: get or set",
      required: true,
    },
    key: {
      type: "positional",
      description: "Config key (e.g. serverUrl)",
      required: true,
    },
    value: {
      type: "positional",
      description: "Value to set (only for 'set' action)",
      required: false,
    },
  },
  run({ args }) {
    if (args.action === "get") {
      const config = readConfig();
      const value = config[args.key as keyof typeof config];
      if (value === undefined) {
        consola.warn(`Key "${args.key}" is not set`);
        process.exit(1);
      }
      console.log(value);
    } else if (args.action === "set") {
      if (!args.value) {
        consola.error("Usage: wappy config set <key> <value>");
        process.exit(1);
      }
      updateConfig({ [args.key]: args.value });
      consola.success(`Set ${args.key} = ${args.value}`);
    } else {
      consola.error(`Unknown action "${args.action}". Use "get" or "set".`);
      process.exit(1);
    }
  },
});
