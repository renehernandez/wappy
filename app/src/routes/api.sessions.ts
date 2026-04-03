import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { createSession, listSessions } from "~/server/functions/sessions";
import { getDb } from "~/server/lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();
  const identity = await authenticateRequest(request, db);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const limit = limitParam ? Number(limitParam) : undefined;
  const offset = offsetParam ? Number(offsetParam) : undefined;

  const sessions = await listSessions(
    identity.accountId,
    { status, limit, offset },
    db,
  );
  return Response.json(sessions);
}

export async function action({ request, context }: ActionFunctionArgs) {
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

  const session = await createSession(
    identity.accountId,
    {
      title: typeof body.title === "string" ? body.title : undefined,
      agentType:
        typeof body.agentType === "string" ? body.agentType : undefined,
      machineId:
        typeof body.machineId === "string" ? body.machineId : undefined,
      metadata: typeof body.metadata === "string" ? body.metadata : undefined,
    },
    db,
    context.cloudflare.ctx,
  );
  return Response.json(session, { status: 201 });
}
