import type { LoaderFunctionArgs } from "react-router";
import { pollDeviceCode } from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  const result = await pollDeviceCode(code, db as any);
  return Response.json(result);
}
