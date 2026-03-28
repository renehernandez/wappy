import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts, machines } from "../../../../db/schema";
import { handleGetConnect } from "../connect";

const CONNECT_DEVICE_TOKEN = "connect-test-device-token";
const CONNECT_ACCOUNT_ID = "acc-connect-test";
const CONNECT_ACCOUNT_EMAIL = "connect-test@example.com";

function makeDeviceRequest(url: string): Request {
  return new Request(url, {
    headers: {
      Authorization: `Bearer device:${CONNECT_DEVICE_TOKEN}`,
    },
  });
}

function makeCfRequest(url: string, email: string): Request {
  const payload = btoa(JSON.stringify({ email }));
  const fakeJwt = `header.${payload}.sig`;
  return new Request(url, {
    headers: {
      "CF-Access-JWT-Assertion": fakeJwt,
    },
  });
}

beforeAll(async () => {
  await applyMigrations();
  const db = getTestDb();

  await db.insert(accounts).values({
    id: CONNECT_ACCOUNT_ID,
    email: CONNECT_ACCOUNT_EMAIL,
    seq: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(machines).values({
    id: "machine-connect-test",
    accountId: CONNECT_ACCOUNT_ID,
    name: "connect-test-machine",
    deviceToken: CONNECT_DEVICE_TOKEN,
    createdAt: new Date().toISOString(),
  });
});

describe("GET /api/connect", () => {
  it("returns status ok without user when no auth is present", async () => {
    const res = await handleGetConnect(
      new Request("https://test.example.com/api/connect"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.user).toBeUndefined();
  });

  it("returns user info when CF Access JWT is present", async () => {
    const res = await handleGetConnect(
      makeCfRequest("https://test.example.com/api/connect", "warp@example.com"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe("warp@example.com");
    expect(typeof body.user.accountId).toBe("string");
  });

  it("returns user info when device token is present", async () => {
    const res = await handleGetConnect(
      makeDeviceRequest("https://test.example.com/api/connect"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(CONNECT_ACCOUNT_EMAIL);
    expect(body.user.accountId).toBe(CONNECT_ACCOUNT_ID);
  });
});
