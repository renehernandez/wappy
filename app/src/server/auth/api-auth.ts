import { upsertAccount } from "../functions/auth";
import { getDb } from "../lib/db";
import { extractCfAccessIdentity } from "./cf-access";
import { extractDeviceIdentity } from "./device-token";

type Db = ReturnType<typeof getDb>;

export interface AuthenticatedIdentity {
  accountId: string;
}

/**
 * Authenticates an incoming raw Request using either:
 *  - CF-Access-JWT-Assertion header (browser via Cloudflare Access)
 *  - Authorization: Bearer device:<token> header (CLI device token)
 *
 * Returns the accountId on success, or null if unauthenticated.
 */
export async function authenticateRequest(
  request: Request,
  db: Db = getDb(),
): Promise<AuthenticatedIdentity | null> {
  // Try CF Access JWT first
  const cfIdentity = extractCfAccessIdentity(request);
  if (cfIdentity) {
    const account = await upsertAccount(cfIdentity.email, db as any);
    return { accountId: account.id };
  }

  // Try device token
  const deviceIdentity = await extractDeviceIdentity(request, db as any);
  if (deviceIdentity) {
    return { accountId: deviceIdentity.accountId };
  }

  return null;
}
