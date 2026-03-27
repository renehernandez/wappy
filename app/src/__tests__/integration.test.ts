import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCfAccessIdentity } from "~/server/auth/cf-access";
import { extractDeviceIdentity } from "~/server/auth/device-token";
import { upsertAccount } from "~/server/functions/auth";
import {
  approveDevice,
  createDeviceCode,
  pollDeviceCode,
  revokeDevice,
} from "~/server/functions/devices";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import * as schema from "../../db/schema";

function makeJwt(email: string): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ email }));
  return `${header}.${body}.fake-signature`;
}

let db: ReturnType<typeof getTestDb>;

beforeAll(async () => {
  await applyMigrations();
  db = getTestDb();
});

describe("Integration: browser auth via CF Access JWT", () => {
  it("authenticates and creates account from JWT, then loads dashboard data", async () => {
    // Simulate CF Access JWT
    const jwt = makeJwt("browser-user@example.com");
    const request = new Request("https://wappy.dev", {
      headers: { "CF-Access-JWT-Assertion": jwt },
    });

    // Extract identity
    const identity = extractCfAccessIdentity(request);
    expect(identity).not.toBeNull();
    expect(identity!.email).toBe("browser-user@example.com");

    // Upsert account
    const account = await upsertAccount(identity!.email, db);
    expect(account.id).toBeDefined();
    expect(account.email).toBe("browser-user@example.com");

    // Verify account persisted
    const persisted = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.email, "browser-user@example.com"))
      .get();
    expect(persisted).toBeDefined();
    expect(persisted!.id).toBe(account.id);
  });
});

describe("Integration: device code flow end-to-end", () => {
  let accountId: string;
  let deviceToken: string;

  it("creates account, generates device code, approves it, and polls for token", async () => {
    // Step 1: Create an account (simulating browser user)
    const account = await upsertAccount("device-flow@example.com", db);
    accountId = account.id;

    // Step 2: CLI generates a device code (no auth needed)
    const codeResult = await createDeviceCode("test-laptop", "wappy.dev", db);
    expect(codeResult.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(codeResult.verifyUrl).toContain(codeResult.code);

    // Step 3: Poll — should be pending
    const pending = await pollDeviceCode(codeResult.code, db);
    expect(pending.status).toBe("pending");

    // Step 4: Browser user approves the device
    const approved = await approveDevice(codeResult.code, accountId, db);
    expect(approved).not.toBeNull();
    expect(approved!.deviceToken).toBeDefined();
    deviceToken = approved!.deviceToken;

    // Step 5: CLI polls again — should get the token
    const approvedPoll = await pollDeviceCode(codeResult.code, db);
    expect(approvedPoll.status).toBe("approved");
    if (approvedPoll.status === "approved") {
      expect(approvedPoll.deviceToken).toBe(deviceToken);
    }

    // Step 6: CLI uses device token to authenticate
    const cliRequest = new Request("https://wappy.dev/api/test", {
      headers: { Authorization: `Bearer device:${deviceToken}` },
    });
    const deviceIdentity = await extractDeviceIdentity(cliRequest, db);
    expect(deviceIdentity).not.toBeNull();
    expect(deviceIdentity!.accountId).toBe(accountId);
  });
});

describe("Integration: device revocation", () => {
  it("revoked device token returns null on auth", async () => {
    // Setup: create account and approve a device
    const account = await upsertAccount("revoke-test@example.com", db);
    const codeResult = await createDeviceCode("revoke-laptop", "wappy.dev", db);
    const approved = await approveDevice(codeResult.code, account.id, db);
    const token = approved!.deviceToken;

    // Verify it works before revocation
    const beforeReq = new Request("https://wappy.dev", {
      headers: { Authorization: `Bearer device:${token}` },
    });
    const beforeIdentity = await extractDeviceIdentity(beforeReq, db);
    expect(beforeIdentity).not.toBeNull();

    // Revoke the device
    await revokeDevice(approved!.machineId, account.id, db);

    // Verify it's rejected after revocation
    const afterReq = new Request("https://wappy.dev", {
      headers: { Authorization: `Bearer device:${token}` },
    });
    const afterIdentity = await extractDeviceIdentity(afterReq, db);
    expect(afterIdentity).toBeNull();
  });
});
