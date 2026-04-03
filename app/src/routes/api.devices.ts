import type { LoaderFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { listDevices } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();
  const identity = await authenticateRequest(request, db);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await listDevices(identity.accountId, db as any);
  return Response.json(devices);
}
