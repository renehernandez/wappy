import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticateRequest } from "~/server/auth/api-auth";
import { getChanges } from "~/server/functions/sync";
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
  const sinceSeqParam = url.searchParams.get("sinceSeq");
  if (!sinceSeqParam) {
    return Response.json({ error: "sinceSeq is required" }, { status: 400 });
  }

  const sinceSeq = Number(sinceSeqParam);
  if (Number.isNaN(sinceSeq)) {
    return Response.json(
      { error: "sinceSeq must be a number" },
      { status: 400 },
    );
  }

  const changes = await getChanges(identity.accountId, sinceSeq, db, r2);
  return Response.json(changes);
}
