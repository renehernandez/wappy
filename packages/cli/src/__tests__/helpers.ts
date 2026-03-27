import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";

export function useTempDir(prefix: string): { readonly dir: string } {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    get dir() {
      return dir;
    },
  };
}
