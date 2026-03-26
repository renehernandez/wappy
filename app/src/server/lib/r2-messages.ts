import { getR2 } from "./r2";

export interface MessageObject {
  id: string;
  sessionId: string;
  seq: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: string | null;
  accountSeq: number;
  createdAt: string;
}

type R2 = ReturnType<typeof getR2>;

/** Constructs the R2 key for a message: `sessions/{sessionId}/msgs/{seq:06d}.json` */
export function messageKey(sessionId: string, seq: number): string {
  return `sessions/${sessionId}/msgs/${String(seq).padStart(6, "0")}.json`;
}

/** Stores a full message object to R2. */
export async function putMessage(
  message: MessageObject,
  r2: R2 = getR2(),
): Promise<void> {
  const key = messageKey(message.sessionId, message.seq);
  await r2.put(key, JSON.stringify(message), {
    httpMetadata: { contentType: "application/json" },
  });
}

/** Fetches a single message from R2 by sessionId + seq. Returns null if not found. */
export async function getMessage(
  sessionId: string,
  seq: number,
  r2: R2 = getR2(),
): Promise<MessageObject | null> {
  const key = messageKey(sessionId, seq);
  const obj = await r2.get(key);
  if (!obj) return null;
  return obj.json<MessageObject>();
}

/** Batch-fetches messages from R2 for an array of (sessionId, seq) pairs. */
export async function getMessages(
  items: Array<{ sessionId: string; seq: number }>,
  r2: R2 = getR2(),
): Promise<MessageObject[]> {
  const results = await Promise.all(
    items.map(({ sessionId, seq }) => getMessage(sessionId, seq, r2)),
  );
  return results.filter((m): m is MessageObject => m !== null);
}
