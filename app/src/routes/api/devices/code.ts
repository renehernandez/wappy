import { createFileRoute } from "@tanstack/react-router";
import { createDeviceCode } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

/**
 * POST /api/devices/code — create a device authorization code
 * No authentication required (CF Access exempt) to support non-WARP CLI users.
 */
export async function handlePostDeviceCode(
  request: Request,
): Promise<Response> {
  const db = getDb();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.name !== "string" || body.name.length === 0) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const host = url.host;

  const result = await createDeviceCode(body.name, host, db as any);
  return Response.json(result, { status: 201 });
}

export const Route = createFileRoute("/api/devices/code")({
  server: {
    handlers: {
      POST: ({ request }) => handlePostDeviceCode(request),
    },
  },
});
