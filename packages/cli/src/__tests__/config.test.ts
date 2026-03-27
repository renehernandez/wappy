import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "wapi-test-"));
  vi.stubEnv("XDG_CONFIG_HOME", tempDir);
  vi.stubEnv("WAPI_SERVER_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tempDir, { recursive: true, force: true });
});

// Re-import each time to pick up env changes
async function loadConfig() {
  // Clear module cache to pick up new env vars
  const mod = await import("../config");
  return mod;
}

describe("config", () => {
  it("uses XDG_CONFIG_HOME for config path", async () => {
    const { getConfigPath } = await loadConfig();
    expect(getConfigPath()).toBe(join(tempDir, "wapi", "config.json"));
  });

  it("reads empty config when no file exists", async () => {
    const { readConfig } = await loadConfig();
    expect(readConfig()).toEqual({});
  });

  it("writes and reads config", async () => {
    const { writeConfig, readConfig } = await loadConfig();
    writeConfig({ serverUrl: "https://test.workers.dev" });
    expect(readConfig()).toEqual({ serverUrl: "https://test.workers.dev" });
  });

  it("updateConfig merges with existing", async () => {
    const { writeConfig, updateConfig, readConfig } = await loadConfig();
    writeConfig({ serverUrl: "https://a.dev", deviceName: "laptop" });
    updateConfig({ serverUrl: "https://b.dev" });
    expect(readConfig()).toEqual({
      serverUrl: "https://b.dev",
      deviceName: "laptop",
    });
  });

  it("writes credentials with 0600 permissions", async () => {
    const { writeCredentials, getCredentialsPath } = await loadConfig();
    writeCredentials({ deviceToken: "tok-123", machineName: "my-mac" });

    const stat = statSync(getCredentialsPath());
    // 0600 = owner read/write only (octal 33152 on macOS includes file type bits)
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("reads and deletes credentials", async () => {
    const { writeCredentials, readCredentials, deleteCredentials } =
      await loadConfig();
    writeCredentials({ deviceToken: "tok-123", machineName: "my-mac" });
    expect(readCredentials()).toEqual({
      deviceToken: "tok-123",
      machineName: "my-mac",
    });

    deleteCredentials();
    expect(readCredentials()).toBeNull();
  });

  it("deleteCredentials is idempotent", async () => {
    const { deleteCredentials } = await loadConfig();
    expect(() => deleteCredentials()).not.toThrow();
  });
});

describe("deployment state", () => {
  it("reads empty deployment when no file exists", async () => {
    const { readDeployment } = await loadConfig();
    expect(readDeployment()).toEqual({});
  });

  it("writes and reads deployment state", async () => {
    const { writeDeployment, readDeployment } = await loadConfig();
    writeDeployment({
      accountId: "abc123",
      workerName: "wapi",
      workerUrl: "https://wapi.workers.dev",
    });
    expect(readDeployment()).toEqual({
      accountId: "abc123",
      workerName: "wapi",
      workerUrl: "https://wapi.workers.dev",
    });
  });

  it("updateDeployment merges with existing", async () => {
    const { writeDeployment, updateDeployment, readDeployment } =
      await loadConfig();
    writeDeployment({ accountId: "abc123", workerName: "wapi" });
    updateDeployment({ workerUrl: "https://w.dev" });
    expect(readDeployment()).toEqual({
      accountId: "abc123",
      workerName: "wapi",
      workerUrl: "https://w.dev",
    });
  });

  it("updateDeployment overwrites individual fields", async () => {
    const { writeDeployment, updateDeployment, readDeployment } =
      await loadConfig();
    writeDeployment({ accountId: "old", workerName: "wapi" });
    updateDeployment({ accountId: "new" });
    expect(readDeployment()).toEqual({
      accountId: "new",
      workerName: "wapi",
    });
  });

  it("stores deployment path under config dir", async () => {
    const { getDeploymentPath } = await loadConfig();
    expect(getDeploymentPath()).toBe(join(tempDir, "wapi", "deployment.json"));
  });
});

describe("getServerUrl", () => {
  it("returns env var when set", async () => {
    vi.stubEnv("WAPI_SERVER_URL", "https://env.workers.dev");
    const { getServerUrl } = await loadConfig();
    expect(getServerUrl()).toBe("https://env.workers.dev");
  });

  it("returns config value when env var is empty", async () => {
    vi.stubEnv("WAPI_SERVER_URL", "");
    const { writeConfig, getServerUrl } = await loadConfig();
    writeConfig({ serverUrl: "https://config.workers.dev" });
    expect(getServerUrl()).toBe("https://config.workers.dev");
  });

  it("returns null when nothing configured", async () => {
    vi.stubEnv("WAPI_SERVER_URL", "");
    const { getServerUrl } = await loadConfig();
    expect(getServerUrl()).toBeNull();
  });
});
