import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { extractCfAccessIdentity } from "~/server/auth/cf-access";
import { extractDeviceIdentity } from "~/server/auth/device-token";
import { upsertAccount } from "~/server/functions/auth";
import { getDb } from "~/server/lib/db";
import { accounts } from "../../../db/schema";

interface ConnectUser {
  email: string;
  accountId: string;
}

interface ConnectResponse {
  status: "ok";
  user?: ConnectUser;
}

/**
 * GET /api/connect — server discovery and WARP detection endpoint
 *
 * Returns `{ status: "ok", user: { email, accountId } }` when the request
 * carries a valid CF Access JWT or device token. Returns `{ status: "ok" }`
 * when neither is present, confirming the server is reachable.
 */
export async function handleGetConnect(request: Request): Promise<Response> {
  const db = getDb();

  // Try CF Access JWT first
  const cfIdentity = extractCfAccessIdentity(request);
  if (cfIdentity) {
    const account = await upsertAccount(cfIdentity.email, db as any);
    const response: ConnectResponse = {
      status: "ok",
      user: { email: cfIdentity.email, accountId: account.id },
    };
    return Response.json(response);
  }

  // Try device token
  const deviceIdentity = await extractDeviceIdentity(request, db as any);
  if (deviceIdentity) {
    const accountRecord = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, deviceIdentity.accountId))
      .get();

    const response: ConnectResponse = {
      status: "ok",
      user: {
        email: accountRecord?.email ?? "",
        accountId: deviceIdentity.accountId,
      },
    };
    return Response.json(response);
  }

  return Response.json({ status: "ok" } satisfies ConnectResponse);
}

export const Route = createFileRoute("/api/connect")({
  server: {
    handlers: {
      GET: ({ request }) => handleGetConnect(request),
    },
  },
});
