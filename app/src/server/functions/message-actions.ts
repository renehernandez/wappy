import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { extractDeviceIdentity } from "../auth/device-token";
import { getDb } from "../lib/db";
import { upsertAccount } from "./auth";
import { addMessage, getMessage, listMessages } from "./messages";

async function requireAuth() {
  const db = getDb();

  const jwt = getRequestHeader("CF-Access-JWT-Assertion");
  if (jwt) {
    const req = new Request("https://p", {
      headers: { "CF-Access-JWT-Assertion": jwt },
    });
    const cfIdentity = extractCfAccessIdentity(req);
    if (cfIdentity) {
      const account = await upsertAccount(cfIdentity.email, db as any);
      return { accountId: account.id, db };
    }
  }

  const authHeader = getRequestHeader("Authorization");
  if (authHeader) {
    const req = new Request("https://p", {
      headers: { Authorization: authHeader },
    });
    const deviceIdentity = await extractDeviceIdentity(req, db as any);
    if (deviceIdentity) return { accountId: deviceIdentity.accountId, db };
  }

  throw new Error("Unauthorized");
}

export const addMessageFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      role: "user" | "assistant" | "system" | "tool";
      content: string;
      metadata?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return addMessage(accountId, data, db as any);
  });

export const listMessagesFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { sessionId: string; afterSeq?: number; limit?: number }) => data,
  )
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return listMessages(accountId, data, db as any);
  });

export const getMessageFn = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; messageId: string }) => data)
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return getMessage(accountId, data.sessionId, data.messageId, db as any);
  });
