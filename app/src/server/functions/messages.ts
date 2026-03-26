import { and, asc, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sessionMessages, sessions } from "../../../db/schema";
import type { getDb } from "../lib/db";
import { notifySessionRoom, notifyUserRoom } from "../lib/notify";
import { getR2 } from "../lib/r2";
import type { MessageObject } from "../lib/r2-messages";
import {
  getMessages,
  putMessage,
  getMessage as r2GetMessage,
} from "../lib/r2-messages";
import { incrementSeq, nextMessageSeq } from "../lib/seq";

type Db = ReturnType<typeof getDb>;
type R2 = ReturnType<typeof getR2>;

export async function addMessage(
  accountId: string,
  data: {
    sessionId: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    metadata?: string;
  },
  db: Db,
  r2: R2 = getR2(),
) {
  // Verify session belongs to account
  const session = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.id, data.sessionId), eq(sessions.accountId, accountId)),
    )
    .get();

  if (!session) throw new Error("Session not found");

  const id = nanoid();
  const now = new Date().toISOString();
  const seq = await nextMessageSeq(data.sessionId, db);
  const accountSeq = await incrementSeq(accountId, db);

  const message: MessageObject = {
    id,
    sessionId: data.sessionId,
    seq,
    role: data.role,
    content: data.content,
    metadata: data.metadata ?? null,
    accountSeq,
    createdAt: now,
  };

  // R2-first write order: R2.put → D1 INSERT index row
  // Orphaned R2 objects on D1 failure are harmless
  await putMessage(message, r2);

  await db.insert(sessionMessages).values({
    id,
    sessionId: data.sessionId,
    seq,
    accountSeq,
  });

  // Update session's updatedAt
  await db
    .update(sessions)
    .set({ updatedAt: now })
    .where(eq(sessions.id, data.sessionId));

  // Notify DOs (best-effort, never fails the function)
  notifyUserRoom(accountId, {
    type: "message_added",
    sessionId: data.sessionId,
    messageSeq: seq,
  });
  notifySessionRoom(data.sessionId, {
    type: "message",
    id: message.id,
    seq: message.seq,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  });

  return message;
}

export async function listMessages(
  accountId: string,
  options: { sessionId: string; afterSeq?: number; limit?: number },
  db: Db,
  r2: R2 = getR2(),
) {
  // Verify session belongs to account
  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, options.sessionId),
        eq(sessions.accountId, accountId),
      ),
    )
    .get();

  if (!session) return [];

  const conditions = [eq(sessionMessages.sessionId, options.sessionId)];
  if (options.afterSeq !== undefined) {
    conditions.push(gt(sessionMessages.seq, options.afterSeq));
  }

  let query = db
    .select()
    .from(sessionMessages)
    .where(and(...conditions))
    .orderBy(asc(sessionMessages.seq));

  if (options.limit) {
    query = query.limit(options.limit) as any;
  }

  const indexRows = await query.all();

  // Batch-fetch content from R2
  return getMessages(
    indexRows.map((row) => ({ sessionId: row.sessionId, seq: row.seq })),
    r2,
  );
}

export async function getMessage(
  accountId: string,
  sessionId: string,
  messageId: string,
  db: Db,
  r2: R2 = getR2(),
) {
  // Verify session belongs to account
  const session = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.accountId, accountId)))
    .get();

  if (!session) return null;

  const indexRow = await db
    .select()
    .from(sessionMessages)
    .where(
      and(
        eq(sessionMessages.id, messageId),
        eq(sessionMessages.sessionId, sessionId),
      ),
    )
    .get();

  if (!indexRow) return null;

  return r2GetMessage(sessionId, indexRow.seq, r2);
}
