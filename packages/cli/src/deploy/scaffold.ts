import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function generatePackageJson(
  dir: string,
  options?: { appVersion?: string },
): string {
  const appVersion = options?.appVersion ?? "^0.0.1";
  const pkg = {
    name: "wappy-deploy",
    private: true,
    dependencies: {
      "@wappy/app": appVersion,
    },
    scripts: {
      deploy: "npx wrangler@4 deploy",
      migrations:
        "npx wrangler@4 d1 migrations apply wappy-db --remote --migrations-dir app/db/migrations",
    },
  };
  const filePath = join(dir, "package.json");
  writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
  return filePath;
}

interface WranglerConfig {
  name: string;
  compatibility_date: string;
  compatibility_flags: string[];
  main: string;
  no_bundle: boolean;
  assets: { directory: string };
  build: { command: string };
  observability: { enabled: boolean };
  d1_databases: Array<{
    binding: string;
    database_name: string;
    migrations_dir: string;
  }>;
  kv_namespaces: Array<{ binding: string }>;
  r2_buckets: Array<{ binding: string }>;
  durable_objects: {
    bindings: Array<{ name: string; class_name: string }>;
  };
  migrations: Array<{ tag: string; new_sqlite_classes: string[] }>;
  routes?: Array<{ pattern: string; zone_name: string }>;
}

/**
 * Build the wrangler config object. When a custom domain is provided,
 * a `routes` entry is added and the zone name is derived by dropping the
 * first subdomain label (e.g. "wappy.fullscript.cloud" → zone "fullscript.cloud").
 */
function buildWranglerConfig(options?: { domain?: string }): WranglerConfig {
  const config: WranglerConfig = {
    name: "wappy",
    compatibility_date: "2026-03-17",
    compatibility_flags: ["nodejs_compat"],
    main: "app/dist/server/index.js",
    no_bundle: true,
    assets: { directory: "app/dist/client" },
    build: {
      command:
        "node -e \"require('fs').cpSync('node_modules/@wappy/app','app',{recursive:true})\"",
    },
    observability: { enabled: true },
    d1_databases: [
      {
        binding: "DB",
        database_name: "wappy-db",
        migrations_dir: "app/db/migrations",
      },
    ],
    kv_namespaces: [{ binding: "KV" }],
    r2_buckets: [{ binding: "R2" }],
    durable_objects: {
      bindings: [
        { name: "UserRoom", class_name: "UserRoom" },
        { name: "SessionRoom", class_name: "SessionRoom" },
      ],
    },
    migrations: [
      {
        tag: "v1",
        new_sqlite_classes: ["UserRoom", "SessionRoom"],
      },
    ],
  };

  if (options?.domain) {
    const domain = options.domain;
    const parts = domain.split(".");
    // Zone name = everything after the first label (drop the subdomain)
    const zoneName = parts.length > 2 ? parts.slice(1).join(".") : domain;
    config.routes = [{ pattern: `${domain}/*`, zone_name: zoneName }];
  }

  return config;
}

export function generateWranglerConfig(
  dir: string,
  options?: { domain?: string },
): string {
  const config = buildWranglerConfig(options);
  const filePath = join(dir, "wrangler.jsonc");
  writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
  return filePath;
}
