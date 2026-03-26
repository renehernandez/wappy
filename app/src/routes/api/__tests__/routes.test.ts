import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts, machines } from "../../../../db/schema";
import { handleGetMessages, handlePostMessages } from "../messages/index";
import { handlePostSession } from "../sessions/$id";
import { handleGetSessions, handlePostSessions } from "../sessions/index";
import { handleGetSync } from "../sync/index";

const DEVICE_TOKEN = "test-device-token-api";
const ACCOUNT_ID = "acc-api-test";
const MACHINE_ID = "machine-api-test";

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

beforeAll(async () => {
  await applyMigrations();
  const db = getTestDb();

  await db.insert(accounts).values({
    id: ACCOUNT_ID,
    email: "api-test@example.com",
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

beforeEach(async () => {
  // Clean R2 objects
  const listed = await env.R2.list({ prefix: "sessions/" });
  await Promise.all(
    listed.objects.map((o: { key: string }) => env.R2.delete(o.key)),
  );
});

describe("GET /api/sessions", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handleGetSessions(
      unauthRequest("https://test/api/sessions"),
    );
    expect(res.status).toBe(401);
  });

  it("returns empty list initially", async () => {
    const res = await handleGetSessions(
      makeRequest("https://test/api/sessions"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/sessions", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handlePostSessions(
      unauthRequest("https://test/api/sessions", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a session", async () => {
    const res = await handlePostSessions(
      makeRequest("https://test/api/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "Test Session" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.title).toBe("Test Session");
    expect(body.id).toBeDefined();
    expect(body.accountId).toBe(ACCOUNT_ID);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await handlePostSessions(
      makeRequest("https://test/api/sessions", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/sessions/:id (update)", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handlePostSession(
      unauthRequest("https://test/api/sessions/foo", { method: "POST" }),
      "foo",
    );
    expect(res.status).toBe(401);
  });

  it("updates a session", async () => {
    // First create a session
    const createRes = await handlePostSessions(
      makeRequest("https://test/api/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "Update Me" }),
      }),
    );
    const created = (await createRes.json()) as any;

    const res = await handlePostSession(
      makeRequest(`https://test/api/sessions/${created.id}`, {
        method: "POST",
        body: JSON.stringify({ title: "Updated", expectedVersion: 1 }),
      }),
      created.id,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body?.title).toBe("Updated");
  });
});

describe("GET /api/messages", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handleGetMessages(
      unauthRequest("https://test/api/messages?sessionId=x"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when sessionId is missing", async () => {
    const res = await handleGetMessages(
      makeRequest("https://test/api/messages"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/messages", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handlePostMessages(
      unauthRequest("https://test/api/messages", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("adds a message and returns it", async () => {
    // Create a session first
    const sessionRes = await handlePostSessions(
      makeRequest("https://test/api/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "Msg Test Session" }),
      }),
    );
    const session = (await sessionRes.json()) as any;

    const res = await handlePostMessages(
      makeRequest("https://test/api/messages", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.id,
          role: "user",
          content: "Hello from test",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.content).toBe("Hello from test");
    expect(body.role).toBe("user");
    expect(body.sessionId).toBe(session.id);
  });

  it("returns 404 for nonexistent session", async () => {
    const res = await handlePostMessages(
      makeRequest("https://test/api/messages", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "nonexistent-session",
          role: "user",
          content: "Test",
        }),
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/sync", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await handleGetSync(
      unauthRequest("https://test/api/sync?sinceSeq=0"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when sinceSeq is missing", async () => {
    const res = await handleGetSync(makeRequest("https://test/api/sync"));
    expect(res.status).toBe(400);
  });

  it("returns changes since seq", async () => {
    const res = await handleGetSync(
      makeRequest("https://test/api/sync?sinceSeq=0"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(Array.isArray(body.messages)).toBe(true);
    expect(typeof body.seq).toBe("number");
  });
});
