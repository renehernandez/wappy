import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generatePackageJson,
  generateWranglerConfig,
} from "../deploy/scaffold";
import { useTempDir } from "./helpers";

const tmp = useTempDir("wappy-scaffold-test");

describe("generatePackageJson", () => {
  it("writes a package.json with @wappy/app dependency", () => {
    const filePath = generatePackageJson(tmp.dir);
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));

    expect(pkg.name).toBe("wappy-deploy");
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies["@wappy/app"]).toBeDefined();
  });

  it("uses the provided appVersion", () => {
    const filePath = generatePackageJson(tmp.dir, { appVersion: "^1.2.3" });
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(pkg.dependencies["@wappy/app"]).toBe("^1.2.3");
  });

  it("defaults to ^0.0.1 when no version is provided", () => {
    const filePath = generatePackageJson(tmp.dir);
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(pkg.dependencies["@wappy/app"]).toBe("^0.0.1");
  });

  it("includes deploy and migrations scripts", () => {
    const filePath = generatePackageJson(tmp.dir);
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(pkg.scripts.deploy).toBeDefined();
    expect(pkg.scripts.migrations).toBeDefined();
  });

  it("returns the path of the written file", () => {
    const filePath = generatePackageJson(tmp.dir);
    expect(filePath).toBe(join(tmp.dir, "package.json"));
  });

  it("is idempotent — overwriting produces the same result", () => {
    generatePackageJson(tmp.dir);
    const filePath = generatePackageJson(tmp.dir);
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(pkg.name).toBe("wappy-deploy");
  });
});

describe("generateWranglerConfig", () => {
  it("writes a wrangler.jsonc with required bindings and build command", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));

    expect(config.name).toBe("wappy");
    expect(config.main).toBe("app/dist/server/index.js");
    expect(config.assets.directory).toBe("app/dist/client");
    expect(config.build.command).toContain("@wappy/app");
    expect(config.no_bundle).toBe(true);
  });

  it("includes all required CF bindings", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));

    expect(config.d1_databases?.[0]?.binding).toBe("DB");
    expect(config.kv_namespaces?.[0]?.binding).toBe("KV");
    expect(config.r2_buckets?.[0]?.binding).toBe("R2");
    expect(config.durable_objects?.bindings).toHaveLength(2);
    expect(config.migrations).toHaveLength(1);
  });

  it("omits resource IDs — wrangler auto-provisions them", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));

    expect(config.d1_databases?.[0]?.database_id).toBeUndefined();
    expect(config.kv_namespaces?.[0]?.id).toBeUndefined();
  });

  it("sets migrations_dir to app/db/migrations", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.d1_databases?.[0]?.migrations_dir).toBe("app/db/migrations");
  });

  it("does not add routes when no domain is provided", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes).toBeUndefined();
  });

  it("adds routes when domain option is given", () => {
    const filePath = generateWranglerConfig(tmp.dir, {
      domain: "wappy.example.com",
    });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes?.[0]?.pattern).toBe("wappy.example.com/*");
    expect(config.routes?.[0]?.zone_name).toBe("example.com");
  });

  it("derives zone name by dropping first subdomain label", () => {
    const filePath = generateWranglerConfig(tmp.dir, {
      domain: "wappy.fullscript.cloud",
    });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes?.[0]?.zone_name).toBe("fullscript.cloud");
  });

  it("handles multi-level TLD correctly", () => {
    const filePath = generateWranglerConfig(tmp.dir, {
      domain: "wappy.example.co.uk",
    });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes?.[0]?.zone_name).toBe("example.co.uk");
  });

  it("returns the path of the written file", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    expect(filePath).toBe(join(tmp.dir, "wrangler.jsonc"));
  });

  it("is idempotent — overwriting produces the same result", () => {
    generateWranglerConfig(tmp.dir);
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.name).toBe("wappy");
  });
});
