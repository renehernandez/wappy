import { and, eq, gt } from "drizzle-orm";
import { accounts, sessionMessages, sessions } from "../../../db/schema";
import type { getDb } from "../lib/db";
import { getR2 } from "../lib/r2";
import { getMessages } from "../lib/r2-messages";

type Db = ReturnType<typeof getDb>;
type R2 = ReturnType<typeof getR2>;

export async function getChanges(
  accountId: string,
  sinceSeq: number,
  db: Db,
  r2: R2 = getR2(),
) {
  const changedSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.accountId, accountId), gt(sessions.seq, sinceSeq)))
    .all();

  // Get all user sessions for filtering
  const allUserSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.accountId, accountId))
    .all();
  const allUserSessionIds = new Set(allUserSessions.map((s) => s.id));

  // Query D1 index for changed message rows
  const changedIndexRows = await db
    .select()
    .from(sessionMessages)
    .where(gt(sessionMessages.accountSeq, sinceSeq))
    .all();

  // Filter to messages belonging to this account's sessions
  const filteredIndexRows = changedIndexRows.filter((m) =>
    allUserSessionIds.has(m.sessionId),
  );

  // Batch-fetch message content from R2
  const messages = await getMessages(
    filteredIndexRows.map((row) => ({
      sessionId: row.sessionId,
      seq: row.seq,
    })),
    r2,
  );

  const account = await db
    .select({ seq: accounts.seq })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  return {
    sessions: changedSessions,
    messages,
    seq: account?.seq ?? 0,
  };
}
