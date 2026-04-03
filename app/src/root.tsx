import { eq } from "drizzle-orm";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { useUserRoom } from "~/client/ws/useUserRoom";
import { NavShell } from "~/components/ui/NavShell";
import { extractCfAccessIdentity } from "~/server/auth/cf-access";
import { extractDeviceIdentity } from "~/server/auth/device-token";
import { upsertAccount } from "~/server/functions/auth";
import { getDb } from "~/server/lib/db";
import appCss from "~/styles/app.css?url";
import { accounts } from "../db/schema";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: appCss }];

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDb();

  // Strategy 1: CF Access JWT (browser)
  const jwt = request.headers.get("CF-Access-JWT-Assertion");
  if (jwt) {
    const cfIdentity = extractCfAccessIdentity(request);
    if (cfIdentity) {
      const account = await upsertAccount(cfIdentity.email, db as any);
      return { session: { accountId: account.id, email: account.email } };
    }
  }

  // Strategy 2: Device Bearer token (CLI)
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const deviceIdentity = await extractDeviceIdentity(request, db as any);
    if (deviceIdentity) {
      const account = await (db as any)
        .select()
        .from(accounts)
        .where(eq(accounts.id, deviceIdentity.accountId))
        .get();
      if (account) {
        return { session: { accountId: account.id, email: account.email } };
      }
    }
  }

  return { session: null };
}

function UserRoomListener({ accountId }: { accountId: string }) {
  const { revalidate } = useRevalidator();

  useUserRoom(accountId, (notification) => {
    if (
      notification.type === "session_created" ||
      notification.type === "session_updated" ||
      notification.type === "message_added"
    ) {
      console.log("[UserRoomListener] Revalidating for", notification.type);
      revalidate();
    }
  });

  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>wappy</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-slate-950 text-gray-100">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const { session } = useLoaderData<typeof loader>();

  return (
    <>
      {session && <UserRoomListener accountId={session.accountId} />}
      <NavShell userEmail={session?.email}>
        <Outlet />
      </NavShell>
    </>
  );
}
