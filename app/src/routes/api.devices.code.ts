import type { ActionFunctionArgs } from "react-router";
import { createDeviceCode } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

export async function action({ request }: ActionFunctionArgs) {
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
