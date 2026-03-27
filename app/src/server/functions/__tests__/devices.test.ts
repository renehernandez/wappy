import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts } from "../../../../db/schema";
import {
  approveDevice,
  createDeviceCode,
  denyDevice,
  listDevices,
  pollDeviceCode,
  revokeDevice,
} from "../devices";

let db: ReturnType<typeof getTestDb>;

beforeAll(async () => {
  await applyMigrations();
  db = getTestDb();
  await db.insert(accounts).values({
    id: "acc-1",
    email: "test@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

describe("createDeviceCode", () => {
  it("generates a code with correct format", async () => {
    const result = await createDeviceCode("my-laptop", "wappy.dev", db);

    expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.verifyUrl).toBe(
      `https://wappy.dev/auth/device?code=${result.code}`,
    );
    expect(result.expiresIn).toBe(600);
  });
});

describe("pollDeviceCode", () => {
  it("returns pending for a fresh code", async () => {
    const { code } = await createDeviceCode("laptop", "wappy.dev", db);
    const result = await pollDeviceCode(code, db);

    expect(result.status).toBe("pending");
  });

  it("returns expired for unknown code", async () => {
    const result = await pollDeviceCode("XXXX-YYYY", db);
    expect(result.status).toBe("expired");
  });
});

describe("approveDevice", () => {
  it("creates a machine and returns device token", async () => {
    const { code } = await createDeviceCode("approve-test", "wappy.dev", db);
    const result = await approveDevice(code, "acc-1", db);

    expect(result).not.toBeNull();
    expect(result!.machineId).toBeDefined();
    expect(result!.deviceToken).toBeDefined();
    expect(result!.deviceToken.length).toBe(64);
  });

  it("poll returns approved with token after approval", async () => {
    const { code } = await createDeviceCode("poll-approved", "wappy.dev", db);
    await approveDevice(code, "acc-1", db);
    const result = await pollDeviceCode(code, db);

    expect(result.status).toBe("approved");
    if (result.status === "approved") {
      expect(result.deviceToken).toBeDefined();
    }
  });

  it("returns null for already approved code", async () => {
    const { code } = await createDeviceCode("double-approve", "wappy.dev", db);
    await approveDevice(code, "acc-1", db);
    const result = await approveDevice(code, "acc-1", db);

    expect(result).toBeNull();
  });
});

describe("denyDevice", () => {
  it("poll returns denied after denial", async () => {
    const { code } = await createDeviceCode("deny-test", "wappy.dev", db);
    await denyDevice(code, db);
    const result = await pollDeviceCode(code, db);

    expect(result.status).toBe("denied");
  });
});

describe("listDevices", () => {
  it("returns approved devices for account", async () => {
    const devices = await listDevices("acc-1", db);
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0].name).toBeDefined();
    expect(devices[0].id).toBeDefined();
  });
});

describe("revokeDevice", () => {
  it("sets revokedAt on the machine", async () => {
    const { code } = await createDeviceCode("revoke-test", "wappy.dev", db);
    const approved = await approveDevice(code, "acc-1", db);

    await revokeDevice(approved!.machineId, "acc-1", db);

    const devices = await listDevices("acc-1", db);
    const revoked = devices.find((d) => d.id === approved!.machineId);
    expect(revoked?.revokedAt).not.toBeNull();
  });
});
