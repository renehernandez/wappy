import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { revokeDevice } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

/**
 * POST /api/devices/revoke — revoke a registered device
 * Authentication required via CF Access JWT or device token.
 */
export async function handlePostDeviceRevoke(
  request: Request,
): Promise<Response> {
  const db = getDb();
  const identity = await authenticateRequest(request, db);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.machineId !== "string" || body.machineId.length === 0) {
    return Response.json({ error: "machineId is required" }, { status: 400 });
  }

  await revokeDevice(body.machineId, identity.accountId, db as any);
  return Response.json({ success: true });
}

export const Route = createFileRoute("/api/devices/revoke")({
  server: {
    handlers: {
      POST: ({ request }) => handlePostDeviceRevoke(request),
    },
  },
});
