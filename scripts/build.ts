#!/usr/bin/env tsx
/**
 * Build orchestrator: builds the app, then builds the CLI.
 *
 * Usage: tsx scripts/build.ts
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIR = resolve(ROOT, "app");
const CLI_DIR = resolve(ROOT, "packages/cli");
const APP_OUTPUT = resolve(APP_DIR, "dist");

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

// Step 2: Build the CLI
console.log("\n=== Step 2: Building CLI ===");
run("pnpm tsup", CLI_DIR);

console.log("\n=== Build complete ===");
console.log(`CLI: ${CLI_DIR}/dist/index.js`);
