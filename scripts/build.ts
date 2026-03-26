#!/usr/bin/env tsx
/**
 * Build orchestrator: builds the app, builds CLI, then copies Worker output.
 *
 * Order matters: tsup has `clean: true` which wipes dist/, so we copy AFTER tsup.
 *
 * Usage: tsx scripts/build.ts
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIR = resolve(ROOT, "app");
const CLI_DIR = resolve(ROOT, "packages/cli");
const APP_OUTPUT = resolve(APP_DIR, "dist");
const APP_MIGRATIONS = resolve(APP_DIR, "db/migrations");
const BUNDLE_TARGET = resolve(CLI_DIR, "dist/worker-bundle");

function run(cmd: string, cwd: string) {
  console.log(`\n> ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

// Step 1: Build the app
console.log("\n=== Step 1: Building app ===");
run("pnpm vite build", APP_DIR);

if (!existsSync(APP_OUTPUT)) {
  console.error("ERROR: app/dist/ not found after build");
  process.exit(1);
}

// Step 2: Build the CLI (tsup cleans dist/)
console.log("\n=== Step 2: Building CLI ===");
run("pnpm tsup", CLI_DIR);

// Step 3: Copy Worker output + migrations AFTER tsup (so clean doesn't delete it)
console.log("\n=== Step 3: Copying Worker bundle to CLI ===");
if (existsSync(BUNDLE_TARGET)) {
  rmSync(BUNDLE_TARGET, { recursive: true });
}
mkdirSync(BUNDLE_TARGET, { recursive: true });

cpSync(APP_OUTPUT, resolve(BUNDLE_TARGET, "app-dist"), { recursive: true });
cpSync(APP_MIGRATIONS, resolve(BUNDLE_TARGET, "migrations"), {
  recursive: true,
});

console.log(`Copied to ${BUNDLE_TARGET}`);

console.log("\n=== Build complete ===");
console.log(`CLI: ${CLI_DIR}/dist/index.js`);
console.log(`Worker bundle: ${BUNDLE_TARGET}/`);
