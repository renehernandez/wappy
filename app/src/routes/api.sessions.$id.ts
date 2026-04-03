import type { ActionFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { updateSession } from "~/server/functions/sessions";
import { getDb } from "~/server/lib/db";

export async function action({ request, params, context }: ActionFunctionArgs) {
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

  if (typeof body.expectedVersion !== "number") {
    return Response.json(
      { error: "expectedVersion is required" },
      { status: 400 },
    );
  }

  try {
    const session = await updateSession(
      params.id!,
      identity.accountId,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        status: typeof body.status === "string" ? body.status : undefined,
        metadata: typeof body.metadata === "string" ? body.metadata : undefined,
        expectedVersion: body.expectedVersion as number,
      },
      db,
      context.cloudflare.ctx,
    );
    return Response.json(session);
  } catch (err) {
    if (err instanceof Error && err.name === "VersionConflictError") {
      return Response.json({ error: "Version conflict" }, { status: 409 });
    }
    throw err;
  }
}
