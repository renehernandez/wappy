import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { listDevices } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

/**
 * GET /api/devices — list registered devices for authenticated account
 * Authentication required via CF Access JWT or device token.
 */
export async function handleGetDevices(request: Request): Promise<Response> {
  const db = getDb();
  const identity = await authenticateRequest(request, db);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await listDevices(identity.accountId, db as any);
  return Response.json(devices);
}

export const Route = createFileRoute("/api/devices/")({
  server: {
    handlers: {
      GET: ({ request }) => handleGetDevices(request),
    },
  },
});
