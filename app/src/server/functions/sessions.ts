import { and, count, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sessionMessages, sessions } from "../../../db/schema";
import type { getDb } from "../lib/db";
import { notifyUserRoom } from "../lib/notify";
import { incrementSeq } from "../lib/seq";

type Db = ReturnType<typeof getDb>;

export class VersionConflictError extends Error {
  constructor() {
    super("Version conflict");
    this.name = "VersionConflictError";
  }
}

export async function createSession(
  accountId: string,
  data: {
    title?: string;
    agentType?: string;
    machineId?: string;
    metadata?: string;
  },
  db: Db,
  ctx?: ExecutionContext,
) {
  const id = nanoid();
  const now = new Date().toISOString();
  const seq = await incrementSeq(accountId, db);

  const session = {
    id,
    accountId,
    title: data.title ?? null,
    agentType: data.agentType ?? null,
    machineId: data.machineId ?? null,
    status: "active" as const,
    metadata: data.metadata ?? null,
    version: 1,
    seq,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(sessions).values(session);

  const notifyPromise = notifyUserRoom(accountId, {
    type: "session_created",
    sessionId: id,
    title: data.title ?? null,
  }).catch((err) => console.error("[notify] createSession failed:", err));

  if (ctx) {
    ctx.waitUntil(notifyPromise);
  } else {
    await notifyPromise;
  }
  return session;
}

export async function getSession(sessionId: string, accountId: string, db: Db) {
  const session = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.accountId, accountId)))
    .get();

  if (!session) return null;

  const msgCount = await db
    .select({ count: count() })
    .from(sessionMessages)
    .where(eq(sessionMessages.sessionId, sessionId))
    .get();

  return { ...session, messageCount: msgCount?.count ?? 0 };
}

export async function listSessions(
  accountId: string,
  options: { status?: string; limit?: number; offset?: number },
  db: Db,
) {
  const conditions = [eq(sessions.accountId, accountId)];
  if (options.status) {
    conditions.push(eq(sessions.status, options.status as any));
  }
  // Exclude archived by default unless explicitly requested
  if (!options.status) {
    conditions.push(sql`${sessions.status} != 'archived'`);
  }

  let query = db
    .select()
    .from(sessions)
    .where(and(...conditions))
    .orderBy(desc(sessions.updatedAt));

  if (options.limit) {
    query = query.limit(options.limit) as any;
  }
  if (options.offset) {
    query = query.offset(options.offset) as any;
  }

  return query.all();
}

export async function updateSession(
  sessionId: string,
  accountId: string,
  data: {
    title?: string;
    status?: string;
    metadata?: string;
    expectedVersion: number;
  },
  db: Db,
  ctx?: ExecutionContext,
) {
  const now = new Date().toISOString();
  const seq = await incrementSeq(accountId, db);

  const updates: Record<string, any> = {
    updatedAt: now,
    seq,
  };
  if (data.title !== undefined) updates.title = data.title;
  if (data.status !== undefined) updates.status = data.status;
  if (data.metadata !== undefined) updates.metadata = data.metadata;

  const result = await db.run(
    sql`UPDATE sessions SET
      ${sql.raw(
        Object.entries(updates)
          .map(([k, v]) => {
            const col = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
            return `${col} = '${v}'`;
          })
          .join(", "),
      )},
      version = version + 1
    WHERE id = ${sessionId}
      AND account_id = ${accountId}
      AND version = ${data.expectedVersion}`,
  );

  if (!result.meta.changes || result.meta.changes === 0) {
    throw new VersionConflictError();
  }

  const notifyPromise = notifyUserRoom(accountId, {
    type: "session_updated",
    sessionId,
    status: data.status,
  }).catch((err) => console.error("[notify] updateSession failed:", err));

  if (ctx) {
    ctx.waitUntil(notifyPromise);
  } else {
    await notifyPromise;
  }
  return getSession(sessionId, accountId, db);
}

export async function deleteSession(
  sessionId: string,
  accountId: string,
  db: Db,
  ctx?: ExecutionContext,
) {
  const seq = await incrementSeq(accountId, db);
  const now = new Date().toISOString();

  await db
    .update(sessions)
    .set({ status: "archived", seq, updatedAt: now })
    .where(and(eq(sessions.id, sessionId), eq(sessions.accountId, accountId)));

  const notifyPromise = notifyUserRoom(accountId, {
    type: "session_updated",
    sessionId,
    status: "archived",
  }).catch((err) => console.error("[notify] deleteSession failed:", err));

  if (ctx) {
    ctx.waitUntil(notifyPromise);
  } else {
    await notifyPromise;
  }
}
