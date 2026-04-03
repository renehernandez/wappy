import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { extractCfAccessIdentity } from "~/server/auth/cf-access";
import { extractDeviceIdentity } from "~/server/auth/device-token";
import { upsertAccount } from "~/server/functions/auth";
import { getDb } from "~/server/lib/db";
import { accounts } from "../../db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();

  const cfIdentity = extractCfAccessIdentity(request);
  if (cfIdentity) {
    const account = await upsertAccount(cfIdentity.email, db as any);
    return Response.json({
      status: "ok",
      user: { email: cfIdentity.email, accountId: account.id },
    });
  }

  const deviceIdentity = await extractDeviceIdentity(request, db as any);
  if (deviceIdentity) {
    const accountRecord = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, deviceIdentity.accountId))
      .get();
    return Response.json({
      status: "ok",
      user: {
        email: accountRecord?.email ?? "",
        accountId: deviceIdentity.accountId,
      },
    });
  }

  return Response.json({ status: "ok" });
}
