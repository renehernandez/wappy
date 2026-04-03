import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { addMessage, listMessages } from "~/server/functions/messages";
import { getDb } from "~/server/lib/db";
import { getR2 } from "~/server/lib/r2";

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();
  const r2 = getR2();
  const identity = await authenticateRequest(request, db);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const afterSeqParam = url.searchParams.get("afterSeq");
  const limitParam = url.searchParams.get("limit");
  const afterSeq = afterSeqParam ? Number(afterSeqParam) : undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  const messages = await listMessages(
    identity.accountId,
    { sessionId, afterSeq, limit },
    db,
    r2,
  );
  return Response.json(messages);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = getDb();
  const r2 = getR2();
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

  if (typeof body.sessionId !== "string") {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }
  if (typeof body.role !== "string") {
    return Response.json({ error: "role is required" }, { status: 400 });
  }
  if (typeof body.content !== "string") {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  const validRoles = ["user", "assistant", "system", "tool"] as const;
  if (!validRoles.includes(body.role as any)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const message = await addMessage(
      identity.accountId,
      {
        sessionId: body.sessionId as string,
        role: body.role as "user" | "assistant" | "system" | "tool",
        content: body.content as string,
        metadata: typeof body.metadata === "string" ? body.metadata : undefined,
      },
      db,
      r2,
      context.cloudflare.ctx,
    );
    return Response.json(message, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Session not found") {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    throw err;
  }
}
