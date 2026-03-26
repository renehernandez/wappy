import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { accounts } from "../../../../db/schema";
import { addMessage, getMessage, listMessages } from "../messages";
import { createSession } from "../sessions";

let db: ReturnType<typeof getTestDb>;
const r2 = () => env.R2;

async function cleanR2() {
  const listed = await r2().list({ prefix: "sessions/" });
  await Promise.all(
    listed.objects.map((o: { key: string }) => r2().delete(o.key)),
  );
}

beforeAll(async () => {
  await applyMigrations();
  db = getTestDb();
  await db.insert(accounts).values({
    id: "acc-msg",
    email: "messages@example.com",
    seq: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

describe("addMessage", () => {
  let sessionId: string;

  beforeAll(async () => {
    const session = await createSession(
      "acc-msg",
      { title: "addMessage test session" },
      db,
    );
    sessionId = session.id;
  });

  beforeEach(cleanR2);

  it("assigns seq=1 for first message", async () => {
    const msg = await addMessage(
      "acc-msg",
      { sessionId, role: "user", content: "Hello" },
      db,
      r2(),
    );

    expect(msg.seq).toBe(1);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
    expect(msg.accountSeq).toBeGreaterThan(0);
  });

  it("assigns incrementing seq for subsequent messages", async () => {
    const msg1 = await addMessage(
      "acc-msg",
      { sessionId, role: "user", content: "First" },
      db,
      r2(),
    );
    const msg2 = await addMessage(
      "acc-msg",
      { sessionId, role: "assistant", content: "Second" },
      db,
      r2(),
    );

    expect(msg2.seq).toBeGreaterThan(msg1.seq);
  });

  it("throws for nonexistent session", async () => {
    await expect(
      addMessage(
        "acc-msg",
        { sessionId: "nonexistent", role: "user", content: "test" },
        db,
        r2(),
      ),
    ).rejects.toThrow("Session not found");
  });
});

describe("listMessages", () => {
  let sessionId: string;
  let seq1: number;
  let seq2: number;
  let seq3: number;

  beforeAll(async () => {
    const session = await createSession(
      "acc-msg",
      { title: "listMessages test session" },
      db,
    );
    sessionId = session.id;

    // Pre-populate messages for list tests
    const msg1 = await addMessage(
      "acc-msg",
      { sessionId, role: "user", content: "Msg 1" },
      db,
      r2(),
    );
    const msg2 = await addMessage(
      "acc-msg",
      { sessionId, role: "assistant", content: "Msg 2" },
      db,
      r2(),
    );
    const msg3 = await addMessage(
      "acc-msg",
      { sessionId, role: "user", content: "Msg 3" },
      db,
      r2(),
    );
    seq1 = msg1.seq;
    seq2 = msg2.seq;
    seq3 = msg3.seq;
  });

  it("returns messages ordered by seq", async () => {
    const msgs = await listMessages("acc-msg", { sessionId }, db, r2());

    expect(msgs.length).toBe(3);
    expect(msgs[0].seq).toBe(seq1);
    expect(msgs[1].seq).toBe(seq2);
    expect(msgs[2].seq).toBe(seq3);
  });

  it("filters by afterSeq", async () => {
    const msgs = await listMessages(
      "acc-msg",
      { sessionId, afterSeq: seq1 },
      db,
      r2(),
    );
    expect(msgs.length).toBe(2);
    expect(msgs[0].seq).toBe(seq2);
  });

  it("respects limit", async () => {
    const msgs = await listMessages(
      "acc-msg",
      { sessionId, limit: 1 },
      db,
      r2(),
    );
    expect(msgs.length).toBe(1);
  });
});

describe("getMessage", () => {
  let sessionId: string;
  let msgId: string;

  beforeAll(async () => {
    const session = await createSession(
      "acc-msg",
      { title: "getMessage test session" },
      db,
    );
    sessionId = session.id;

    const msg = await addMessage(
      "acc-msg",
      { sessionId, role: "user", content: "Find me" },
      db,
      r2(),
    );
    msgId = msg.id;
  });

  it("returns a single message", async () => {
    const msg = await getMessage("acc-msg", sessionId, msgId, db, r2());

    expect(msg).not.toBeNull();
    expect(msg!.id).toBe(msgId);
    expect(msg!.content).toBe("Find me");
  });

  it("returns null for nonexistent message", async () => {
    const msg = await getMessage("acc-msg", sessionId, "nonexistent", db, r2());
    expect(msg).toBeNull();
  });
});
