import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateMiseToml,
  generatePackageJson,
  generateWranglerConfig,
  patchWranglerConfig,
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

  it("includes wrangler as a devDependency", () => {
    const filePath = generatePackageJson(tmp.dir);
    const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(pkg.devDependencies.wrangler).toBe("^4.0.0");
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

  it("adds custom_domain route when domain option is given", () => {
    const filePath = generateWranglerConfig(tmp.dir, {
      domain: "wappy.example.com",
    });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes?.[0]?.pattern).toBe("wappy.example.com");
    expect(config.routes?.[0]?.custom_domain).toBe(true);
  });

  it("returns the path of the written file", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    expect(filePath).toBe(join(tmp.dir, "wrangler.jsonc"));
  });

  it("includes ESModule rules for JS files", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0].type).toBe("ESModule");
    expect(config.rules[0].globs).toContain("**/*.js");
  });

  it("build.command cleans app/ before copying", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.build.command).toContain("rmSync");
    expect(config.build.command).toContain("cpSync");
  });

  it("is idempotent — overwriting produces the same result", () => {
    generateWranglerConfig(tmp.dir);
    const filePath = generateWranglerConfig(tmp.dir);
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.name).toBe("wappy");
  });
});

describe("generateMiseToml", () => {
  it("writes mise.toml with node version", () => {
    const filePath = generateMiseToml(tmp.dir);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain('node = "24.14.0"');
  });

  it("returns the path of the written file", () => {
    const filePath = generateMiseToml(tmp.dir);
    expect(filePath).toBe(join(tmp.dir, "mise.toml"));
  });
});

describe("patchWranglerConfig", () => {
  it("patches D1 database ID into existing config", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    patchWranglerConfig(filePath, { d1DatabaseId: "d1-abc-123" });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.d1_databases[0].database_id).toBe("d1-abc-123");
  });

  it("patches KV namespace ID into existing config", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    patchWranglerConfig(filePath, { kvNamespaceId: "kv-xyz-789" });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.kv_namespaces[0].id).toBe("kv-xyz-789");
  });

  it("patches R2 bucket name into existing config", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    patchWranglerConfig(filePath, { r2BucketName: "my-bucket" });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.r2_buckets[0].bucket_name).toBe("my-bucket");
  });

  it("patches multiple fields at once", () => {
    const filePath = generateWranglerConfig(tmp.dir);
    patchWranglerConfig(filePath, {
      d1DatabaseId: "d1-id",
      kvNamespaceId: "kv-id",
      r2BucketName: "r2-name",
    });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.d1_databases[0].database_id).toBe("d1-id");
    expect(config.kv_namespaces[0].id).toBe("kv-id");
    expect(config.r2_buckets[0].bucket_name).toBe("r2-name");
  });

  it("preserves other fields when patching", () => {
    const filePath = generateWranglerConfig(tmp.dir, {
      domain: "wappy.example.com",
    });
    patchWranglerConfig(filePath, { d1DatabaseId: "d1-id" });
    const config = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(config.routes[0].pattern).toBe("wappy.example.com");
    expect(config.name).toBe("wappy");
    expect(config.d1_databases[0].database_id).toBe("d1-id");
  });
});
