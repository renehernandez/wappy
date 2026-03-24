import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { extractDeviceIdentity } from "../auth/device-token";
import { upsertAccount } from "../functions/auth";
import { getDb } from "../lib/db";

export interface AuthContext {
  accountId: string;
  email: string;
}

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const db = getDb();

    // Strategy 1: CF Access JWT (browser)
    const jwt = getRequestHeader("CF-Access-JWT-Assertion");
    if (jwt) {
      const req = new Request("https://placeholder", {
        headers: { "CF-Access-JWT-Assertion": jwt },
      });
      const cfIdentity = extractCfAccessIdentity(req);
      if (cfIdentity) {
        const account = await upsertAccount(cfIdentity.email, db as any);
        return next({
          context: {
            accountId: account.id,
            email: account.email,
          } satisfies AuthContext,
        });
      }
    }

    // Strategy 2: Device Bearer token (CLI)
    const authHeader = getRequestHeader("Authorization");
    if (authHeader) {
      const req = new Request("https://placeholder", {
        headers: { Authorization: authHeader },
      });
      const deviceIdentity = await extractDeviceIdentity(req, db as any);
      if (deviceIdentity) {
        const { accounts } = await import("../../../db/schema");
        const { eq } = await import("drizzle-orm");
        const account = await (db as any)
          .select()
          .from(accounts)
          .where(eq(accounts.id, deviceIdentity.accountId))
          .get();

        if (account) {
          return next({
            context: {
              accountId: account.id,
              email: account.email,
            } satisfies AuthContext,
          });
        }
      }
    }

    // No valid auth
    throw new Response("Unauthorized", { status: 401 });
  },
);
