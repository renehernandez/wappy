import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getMessage,
  getMessages,
  messageKey,
  putMessage,
} from "../r2-messages";

const r2 = () => env.R2;

const makeMsg = (
  overrides: Partial<Parameters<typeof putMessage>[0]> = {},
) => ({
  id: "msg-1",
  sessionId: "sess-1",
  seq: 1,
  role: "user" as const,
  content: "Hello, world",
  metadata: null,
  accountSeq: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(async () => {
  // Clean up any keys from previous tests
  const listed = await r2().list({ prefix: "sessions/" });
  await Promise.all(listed.objects.map((o) => r2().delete(o.key)));
});

describe("messageKey", () => {
  it("zero-pads seq to 6 digits", () => {
    expect(messageKey("sess-abc", 1)).toBe(
      "sessions/sess-abc/msgs/000001.json",
    );
    expect(messageKey("sess-abc", 999999)).toBe(
      "sessions/sess-abc/msgs/999999.json",
    );
  });
});

describe("putMessage / getMessage", () => {
  it("round-trips a message through R2", async () => {
    const msg = makeMsg();
    await putMessage(msg, r2());
    const fetched = await getMessage("sess-1", 1, r2());
    expect(fetched).toEqual(msg);
  });

  it("returns null for a missing key", async () => {
    const result = await getMessage("sess-1", 42, r2());
    expect(result).toBeNull();
  });

  it("stores message with correct R2 key", async () => {
    const msg = makeMsg({ seq: 5 });
    await putMessage(msg, r2());
    const obj = await r2().get("sessions/sess-1/msgs/000005.json");
    expect(obj).not.toBeNull();
  });
});

describe("getMessages", () => {
  it("batch-fetches multiple messages", async () => {
    const msg1 = makeMsg({ id: "m1", seq: 1, content: "First" });
    const msg2 = makeMsg({ id: "m2", seq: 2, content: "Second" });
    await putMessage(msg1, r2());
    await putMessage(msg2, r2());

    const results = await getMessages(
      [
        { sessionId: "sess-1", seq: 1 },
        { sessionId: "sess-1", seq: 2 },
      ],
      r2(),
    );

    expect(results).toHaveLength(2);
    expect(results.map((m) => m.content).sort()).toEqual(["First", "Second"]);
  });

  it("skips missing messages", async () => {
    const msg = makeMsg({ id: "m3", seq: 3, content: "Third" });
    await putMessage(msg, r2());

    const results = await getMessages(
      [
        { sessionId: "sess-1", seq: 3 },
        { sessionId: "sess-1", seq: 99 }, // does not exist
      ],
      r2(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("Third");
  });

  it("returns empty array when no items provided", async () => {
    const results = await getMessages([], r2());
    expect(results).toEqual([]);
  });
});
