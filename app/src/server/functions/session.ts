import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { extractDeviceIdentity } from "../auth/device-token";
import { getDb } from "../lib/db";
import { upsertAccount } from "./auth";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    // Build a minimal request from the available header
    const jwt = getRequestHeader("CF-Access-JWT-Assertion");
    const authHeader = getRequestHeader("Authorization");

    const db = getDb();

    // Strategy 1: CF Access JWT (browser)
    if (jwt) {
      const fakeReq = new Request("https://placeholder", {
        headers: { "CF-Access-JWT-Assertion": jwt },
      });
      const cfIdentity = extractCfAccessIdentity(fakeReq);
      if (cfIdentity) {
        const account = await upsertAccount(cfIdentity.email, db as any);
        return { accountId: account.id, email: account.email };
      }
    }

    // Strategy 2: Device Bearer token (CLI)
    if (authHeader) {
      const fakeReq = new Request("https://placeholder", {
        headers: { Authorization: authHeader },
      });
      const deviceIdentity = await extractDeviceIdentity(fakeReq, db as any);
      if (deviceIdentity) {
        const { accounts } = await import("../../../db/schema");
        const { eq } = await import("drizzle-orm");
        const account = await (db as any)
          .select()
          .from(accounts)
          .where(eq(accounts.id, deviceIdentity.accountId))
          .get();
        if (account) {
          return { accountId: account.id, email: account.email };
        }
      }
    }

    return null;
  },
);
