import { createFileRoute } from "@tanstack/react-router";
import { pollDeviceCode } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

/**
 * GET /api/devices/poll?code=XXXX — check device code status
 * No authentication required (CF Access exempt) to support non-WARP CLI users.
 */
export async function handleGetDevicePoll(request: Request): Promise<Response> {
  const db = getDb();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  const result = await pollDeviceCode(code, db as any);
  return Response.json(result);
}

export const Route = createFileRoute("/api/devices/poll")({
  server: {
    handlers: {
      GET: ({ request }) => handleGetDevicePoll(request),
    },
  },
});
