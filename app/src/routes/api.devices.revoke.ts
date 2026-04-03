import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { revokeDevice } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

export async function action({ request }: ActionFunctionArgs) {
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
