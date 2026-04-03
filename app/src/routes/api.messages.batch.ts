import type { ActionFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { addMessages } from "~/server/functions/messages";
import { getDb } from "~/server/lib/db";
import { getR2 } from "~/server/lib/r2";

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
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "messages array is required and must not be empty" },
      { status: 400 },
    );
  }

  const validRoles = new Set(["user", "assistant", "system", "tool"]);
  const messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    metadata?: string;
  }> = [];

  for (const msg of body.messages) {
    if (typeof msg !== "object" || msg === null) {
      return Response.json(
        { error: "Invalid message in array" },
        { status: 400 },
      );
    }
    if (typeof msg.role !== "string" || !validRoles.has(msg.role)) {
      return Response.json(
        { error: "Invalid role in message" },
        { status: 400 },
      );
    }
    if (typeof msg.content !== "string") {
      return Response.json(
        { error: "content is required in each message" },
        { status: 400 },
      );
    }
    messages.push({
      role: msg.role as "user" | "assistant" | "system" | "tool",
      content: msg.content,
      metadata: typeof msg.metadata === "string" ? msg.metadata : undefined,
    });
  }

  try {
    const stored = await addMessages(
      identity.accountId,
      { sessionId: body.sessionId as string, messages },
      db,
      r2,
      context.cloudflare.ctx,
    );
    return Response.json(stored, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Session not found") {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    throw err;
  }
}
