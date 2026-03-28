import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts, deviceCodes, machines } from "../../../../../db/schema";
import { handlePostDeviceCode } from "../code";
import { handleGetDevices } from "../index";
import { handleGetDevicePoll } from "../poll";
import { handlePostDeviceRevoke } from "../revoke";

const DEVICE_TOKEN = "device-test-token-devices";
const ACCOUNT_ID = "acc-devices-test";
const MACHINE_ID = "machine-devices-test";
const ACCOUNT_EMAIL = "devices-test@example.com";

function makeRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    headers: {
      Authorization: `Bearer device:${DEVICE_TOKEN}`,
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    },
    ...init,
  });
}

function unauthRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

function makeCfRequest(
  url: string,
  email: string,
  init: RequestInit = {},
): Request {
  const payload = btoa(JSON.stringify({ email }));
  const fakeJwt = `header.${payload}.sig`;
  return new Request(url, {
    headers: {
      "CF-Access-JWT-Assertion": fakeJwt,
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    },
    ...init,
  });
}

beforeAll(async () => {
  await applyMigrations();
  const db = getTestDb();

  await db.insert(accounts).values({
    id: ACCOUNT_ID,
    email: ACCOUNT_EMAIL,
    seq: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(machines).values({
    id: MACHINE_ID,
    accountId: ACCOUNT_ID,
    name: "test-machine",
    deviceToken: DEVICE_TOKEN,
    createdAt: new Date().toISOString(),
  });
});

describe("POST /api/devices/code", () => {
  it("creates a device code with valid name", async () => {
    const res = await handlePostDeviceCode(
      unauthRequest("https://test.example.com/api/devices/code", {
        method: "POST",
        body: JSON.stringify({ name: "my-laptop" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(typeof body.code).toBe("string");
    expect(typeof body.verifyUrl).toBe("string");
    expect(body.expiresIn).toBe(600);
  });

  it("returns 400 when name is missing", async () => {
    const res = await handlePostDeviceCode(
      unauthRequest("https://test.example.com/api/devices/code", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await handlePostDeviceCode(
      unauthRequest("https://test.example.com/api/devices/code", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/devices/poll", () => {
  it("returns pending for a newly created code", async () => {
    // Insert a pending device code directly
    const db = getTestDb();
    const testCode = "POLL-PEND";
    await db.insert(deviceCodes).values({
      code: testCode,
      machineName: "test-poll-machine",
      status: "pending",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const res = await handleGetDevicePoll(
      unauthRequest(
        `https://test.example.com/api/devices/poll?code=${testCode}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("pending");
  });

  it("returns approved with device token for approved code", async () => {
    const db = getTestDb();
    const testCode = "POLL-APPR";
    const token = "test-approved-token";
    await db.insert(deviceCodes).values({
      code: testCode,
      machineName: "test-approved-machine",
      status: "approved",
      deviceToken: token,
      accountId: ACCOUNT_ID,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const res = await handleGetDevicePoll(
      unauthRequest(
        `https://test.example.com/api/devices/poll?code=${testCode}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("approved");
    expect(body.deviceToken).toBe(token);
  });

  it("returns expired for a nonexistent code", async () => {
    const res = await handleGetDevicePoll(
      unauthRequest(
        "https://test.example.com/api/devices/poll?code=NONEXISTENT",
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("expired");
  });

  it("returns 400 when code query param is missing", async () => {
    const res = await handleGetDevicePoll(
      unauthRequest("https://test.example.com/api/devices/poll"),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/devices", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handleGetDevices(
      unauthRequest("https://test.example.com/api/devices"),
    );
    expect(res.status).toBe(401);
  });

  it("returns devices for authenticated device token request", async () => {
    const res = await handleGetDevices(
      makeRequest("https://test.example.com/api/devices"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns devices for CF Access JWT request", async () => {
    const res = await handleGetDevices(
      makeCfRequest("https://test.example.com/api/devices", ACCOUNT_EMAIL),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/devices/revoke", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handlePostDeviceRevoke(
      unauthRequest("https://test.example.com/api/devices/revoke", {
        method: "POST",
        body: JSON.stringify({ machineId: MACHINE_ID }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("revokes a device and returns success", async () => {
    // Create a new machine to revoke so it doesn't break other tests
    const db = getTestDb();
    const revokeToken = "revoke-test-token";
    const revokeMachineId = "machine-to-revoke";
    await db.insert(machines).values({
      id: revokeMachineId,
      accountId: ACCOUNT_ID,
      name: "revoke-me",
      deviceToken: revokeToken,
      createdAt: new Date().toISOString(),
    });

    const res = await handlePostDeviceRevoke(
      makeRequest("https://test.example.com/api/devices/revoke", {
        method: "POST",
        body: JSON.stringify({ machineId: revokeMachineId }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it("returns 400 when machineId is missing", async () => {
    const res = await handlePostDeviceRevoke(
      makeRequest("https://test.example.com/api/devices/revoke", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });
});
