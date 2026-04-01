import { env } from "cloudflare:workers";

export async function notifyUserRoom(
  accountId: string,
  payload: Record<string, unknown>,
) {
  try {
    const id = env.UserRoom.idFromName(accountId);
    const stub = env.UserRoom.get(id);
    await stub.fetch("https://dummy/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[notify] UserRoom notification failed:", err);
  }
}

export async function notifySessionRoom(
  sessionId: string,
  payload: Record<string, unknown>,
) {
  try {
    const id = env.SessionRoom.idFromName(sessionId);
    const stub = env.SessionRoom.get(id);
    await stub.fetch("https://dummy/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[notify] SessionRoom notification failed:", err);
  }
}
