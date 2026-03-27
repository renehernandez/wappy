import { readFileSync, writeFileSync } from "node:fs";
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
    devDependencies: {
      wrangler: "^4.0.0",
    },
    scripts: {
      deploy: "npx wrangler@4 deploy",
      migrations: "npx wrangler@4 d1 migrations apply wappy-db --remote",
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
  rules: Array<{ type: string; globs: string[] }>;
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
  routes?: Array<{ pattern: string; custom_domain: boolean }>;
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
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
    assets: { directory: "app/dist/client" },
    build: {
      command:
        "node -e \"const fs=require('fs');fs.rmSync('app',{recursive:true,force:true});fs.cpSync('node_modules/@wappy/app','app',{recursive:true})\"",
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
    config.routes = [{ pattern: options.domain, custom_domain: true }];
  }

  return config;
}

export function generateMiseToml(dir: string): string {
  const content = `[tools]
node = "24.14.0"
`;
  const filePath = join(dir, "mise.toml");
  writeFileSync(filePath, content);
  return filePath;
}

export function patchWranglerConfig(
  filePath: string,
  updates: {
    d1DatabaseId?: string;
    kvNamespaceId?: string;
    r2BucketName?: string;
  },
): void {
  const raw = readFileSync(filePath, "utf-8");
  const config = JSON.parse(raw);

  if (updates.d1DatabaseId && config.d1_databases?.[0]) {
    config.d1_databases[0].database_id = updates.d1DatabaseId;
  }
  if (updates.kvNamespaceId && config.kv_namespaces?.[0]) {
    config.kv_namespaces[0].id = updates.kvNamespaceId;
  }
  if (updates.r2BucketName && config.r2_buckets?.[0]) {
    config.r2_buckets[0].bucket_name = updates.r2BucketName;
  }

  writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
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
