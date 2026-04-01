import { env, waitUntil } from "cloudflare:workers";

export function notifyUserRoom(
  accountId: string,
  payload: Record<string, unknown>,
) {
  const promise = (async () => {
    const id = env.UserRoom.idFromName(accountId);
    const stub = env.UserRoom.get(id);
    await stub.fetch("https://dummy/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("[notify] UserRoom delivered:", payload.type);
  })().catch((err) =>
    console.error("[notify] UserRoom notification failed:", err),
  );
  try {
    waitUntil(promise);
    console.log("[notify] waitUntil registered for UserRoom:", payload.type);
  } catch (err) {
    console.error("[notify] waitUntil failed for UserRoom:", err);
  }
}

export function notifySessionRoom(
  sessionId: string,
  payload: Record<string, unknown>,
) {
  const promise = (async () => {
    const id = env.SessionRoom.idFromName(sessionId);
    const stub = env.SessionRoom.get(id);
    await stub.fetch("https://dummy/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("[notify] SessionRoom delivered:", payload.type);
  })().catch((err) =>
    console.error("[notify] SessionRoom notification failed:", err),
  );
  try {
    waitUntil(promise);
    console.log("[notify] waitUntil registered for SessionRoom:", payload.type);
  } catch (err) {
    console.error("[notify] waitUntil failed for SessionRoom:", err);
  }
}
