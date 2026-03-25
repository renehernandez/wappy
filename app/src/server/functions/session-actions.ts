import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { extractDeviceIdentity } from "../auth/device-token";
import { getDb } from "../lib/db";
import { upsertAccount } from "./auth";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from "./sessions";

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

export const createSessionFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      title?: string;
      agentType?: string;
      machineId?: string;
      metadata?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return createSession(accountId, data, db as any);
  });

export const getSessionFn = createServerFn({ method: "GET" })
  .inputValidator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const { accountId, db } = await requireAuth();
    return getSession(sessionId, accountId, db as any);
  });

export const listSessionsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { status?: string; limit?: number; offset?: number }) => data,
  )
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return listSessions(accountId, data, db as any);
  });

export const updateSessionFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      title?: string;
      status?: string;
      metadata?: string;
      expectedVersion: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return updateSession(data.id, accountId, data, db as any);
  });

export const deleteSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    await deleteSession(data.id, accountId, db as any);
    return { success: true };
  });
