import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts, machines } from "../../../../db/schema";
import { extractDeviceIdentity } from "../device-token";

let db: ReturnType<typeof getTestDb>;

beforeAll(async () => {
  await applyMigrations();
  db = getTestDb();

  await db.insert(accounts).values({
    id: "acc-dt",
    email: "device@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(machines).values({
    id: "machine-1",
    accountId: "acc-dt",
    name: "test-machine",
    deviceToken: "valid-token-123",
    createdAt: new Date().toISOString(),
  });

  await db.insert(machines).values({
    id: "machine-revoked",
    accountId: "acc-dt",
    name: "revoked-machine",
    deviceToken: "revoked-token-456",
    createdAt: new Date().toISOString(),
    revokedAt: new Date().toISOString(),
  });
});

describe("extractDeviceIdentity", () => {
  it("extracts identity from valid device token", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer device:valid-token-123" },
    });

    const identity = await extractDeviceIdentity(request, db);

    expect(identity).toEqual({
      accountId: "acc-dt",
      machineId: "machine-1",
    });
  });

  it("updates lastSeenAt on successful auth", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer device:valid-token-123" },
    });

    await extractDeviceIdentity(request, db);

    const machine = await db
      .select()
      .from(machines)
      .where((await import("drizzle-orm")).eq(machines.id, "machine-1"))
      .get();

    expect(machine?.lastSeenAt).not.toBeNull();
  });

  it("returns null for revoked device token", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer device:revoked-token-456" },
    });

    const identity = await extractDeviceIdentity(request, db);
    expect(identity).toBeNull();
  });

  it("returns null for unknown device token", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer device:unknown-token" },
    });

    const identity = await extractDeviceIdentity(request, db);
    expect(identity).toBeNull();
  });

  it("returns null when no Authorization header", async () => {
    const request = new Request("https://example.com");

    const identity = await extractDeviceIdentity(request, db);
    expect(identity).toBeNull();
  });

  it("returns null for non-device Bearer token", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer some-other-token" },
    });

    const identity = await extractDeviceIdentity(request, db);
    expect(identity).toBeNull();
  });
});
