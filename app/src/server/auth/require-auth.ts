import { upsertAccount } from "../functions/auth";
import { getDb } from "../lib/db";
import { extractCfAccessIdentity } from "./cf-access";
import { extractDeviceIdentity } from "./device-token";

export async function requireAuth(request: Request) {
  const db = getDb();

  const jwt = request.headers.get("CF-Access-JWT-Assertion");
  if (jwt) {
    const cfIdentity = extractCfAccessIdentity(request);
    if (cfIdentity) {
      const account = await upsertAccount(cfIdentity.email, db as any);
      return { accountId: account.id, email: account.email, db };
    }
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const deviceIdentity = await extractDeviceIdentity(request, db as any);
    if (deviceIdentity) return { accountId: deviceIdentity.accountId, db };
  }

  throw new Response("Unauthorized", { status: 401 });
}
