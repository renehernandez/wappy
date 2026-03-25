import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { extractDeviceIdentity } from "../auth/device-token";
import { getDb } from "../lib/db";
import { upsertAccount } from "./auth";
import { getChanges } from "./sync";

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

export const getChangesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { sinceSeq: number }) => data)
  .handler(async ({ data }) => {
    const { accountId, db } = await requireAuth();
    return getChanges(accountId, data.sinceSeq, db as any);
  });
