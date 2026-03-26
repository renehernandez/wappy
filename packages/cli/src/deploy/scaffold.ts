import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getMigrationsPath,
  getWorkerBundlePath,
  getWranglerTemplate,
} from "../bundle";

export interface ScaffoldOptions {
  d1DatabaseId: string;
  kvNamespaceId: string;
  r2BucketName: string;
}

export interface ScaffoldResult {
  dir: string;
  cleanup: () => void;
}

export function scaffoldDeployDir(opts: ScaffoldOptions): ScaffoldResult {
  const dir = mkdtempSync(join(tmpdir(), "wapi-deploy-"));

  // Write wrangler.jsonc with real IDs
  const config = getWranglerTemplate()
    .replace("DATABASE_ID_PLACEHOLDER", opts.d1DatabaseId)
    .replace("KV_ID_PLACEHOLDER", opts.kvNamespaceId)
    .replace("R2_BUCKET_PLACEHOLDER", opts.r2BucketName);
  writeFileSync(join(dir, "wrangler.jsonc"), config);

  // Copy Worker bundle
  const workerPath = getWorkerBundlePath();
  cpSync(workerPath, join(dir, "dist"), { recursive: true });

  // Copy migrations
  const migrationsPath = getMigrationsPath();
  mkdirSync(join(dir, "migrations"), { recursive: true });
  cpSync(migrationsPath, join(dir, "migrations"), { recursive: true });

  const cleanup = () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort
    }
  };

  return { dir, cleanup };
}

export function substituteTemplate(
  template: string,
  d1Id: string,
  kvId: string,
  r2BucketName = "wapi-storage",
): string {
  return template
    .replace("DATABASE_ID_PLACEHOLDER", d1Id)
    .replace("KV_ID_PLACEHOLDER", kvId)
    .replace("R2_BUCKET_PLACEHOLDER", r2BucketName);
}
