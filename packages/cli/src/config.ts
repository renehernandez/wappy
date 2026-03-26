import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg || join(homedir(), ".config");
  return join(base, "wapi");
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeJson(path: string, data: unknown, mode?: number) {
  ensureDir(join(path, ".."));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode });
}

export interface Config {
  serverUrl?: string;
  deviceName?: string;
}

export interface Credentials {
  deviceToken: string;
  machineName: string;
}

export interface DeploymentState {
  accountId?: string;
  d1DatabaseId?: string;
  kvNamespaceId?: string;
  r2BucketName?: string;
  workerName?: string;
  workerUrl?: string;
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getCredentialsPath(): string {
  return join(getConfigDir(), "credentials.json");
}

export function readConfig(): Config {
  return readJson<Config>(getConfigPath()) ?? {};
}

export function writeConfig(config: Config) {
  writeJson(getConfigPath(), config);
}

export function updateConfig(updates: Partial<Config>) {
  const current = readConfig();
  writeConfig({ ...current, ...updates });
}

export function readCredentials(): Credentials | null {
  return readJson<Credentials>(getCredentialsPath());
}

export function writeCredentials(creds: Credentials) {
  writeJson(getCredentialsPath(), creds, 0o600);
}

export function deleteCredentials() {
  try {
    unlinkSync(getCredentialsPath());
  } catch {
    // Already gone
  }
}

export function getDeploymentPath(): string {
  return join(getConfigDir(), "deployment.json");
}

export function readDeployment(): DeploymentState {
  return readJson<DeploymentState>(getDeploymentPath()) ?? {};
}

export function writeDeployment(state: DeploymentState) {
  writeJson(getDeploymentPath(), state);
}

export function updateDeployment(updates: Partial<DeploymentState>) {
  const current = readDeployment();
  writeDeployment({ ...current, ...updates });
}

export function getServerUrl(): string | null {
  return process.env.WAPI_SERVER_URL || readConfig().serverUrl || null;
}
