import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "wappy",
    version: "0.0.1",
    description: "WAPPY — AI session sync on Cloudflare Workers",
  },
  subCommands: {
    init: () => import("./commands/init").then((m) => m.default),
    auth: () => import("./commands/auth").then((m) => m.default),
    status: () => import("./commands/status").then((m) => m.default),
    devices: () => import("./commands/devices").then((m) => m.default),
    config: () => import("./commands/config").then((m) => m.default),
    logout: () => import("./commands/logout").then((m) => m.default),
    run: () => import("./commands/wrap").then((m) => m.default),
  },
});

runMain(main);
