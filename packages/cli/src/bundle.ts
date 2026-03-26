import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function getCliDistDir(): string {
  // Resolve relative to this file's location (which is in dist/ after build)
  const thisFile = fileURLToPath(import.meta.url);
  return dirname(thisFile);
}

export function getWorkerBundlePath(): string {
  const bundlePath = resolve(getCliDistDir(), "worker-bundle", "app-dist");
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Worker bundle not found at ${bundlePath}. The CLI may not have been built correctly.`,
    );
  }
  return bundlePath;
}

export function getMigrationsPath(): string {
  const migrationsPath = resolve(
    getCliDistDir(),
    "worker-bundle",
    "migrations",
  );
  if (!existsSync(migrationsPath)) {
    throw new Error(
      `Migrations not found at ${migrationsPath}. The CLI may not have been built correctly.`,
    );
  }
  return migrationsPath;
}

const WRANGLER_TEMPLATE = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "wapi",
  "compatibility_date": "2026-03-17",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "observability": {
    "enabled": true
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "wapi-db",
      "database_id": "DATABASE_ID_PLACEHOLDER",
      "migrations_dir": "./migrations"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "KV_ID_PLACEHOLDER"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "R2_BUCKET_PLACEHOLDER"
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "name": "UserRoom",
        "class_name": "UserRoom"
      },
      {
        "name": "SessionRoom",
        "class_name": "SessionRoom"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["UserRoom", "SessionRoom"]
    }
  ]
}`;

export function getWranglerTemplate(): string {
  return WRANGLER_TEMPLATE;
}
