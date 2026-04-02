import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import { useUserRoom } from "~/client/ws/useUserRoom";
import { NavShell } from "~/components/ui/NavShell";
import { getSessionFn } from "~/server/functions/session";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "wappy" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async () => {
    const session = await getSessionFn();
    return { session };
  },
  component: RootComponent,
});

function UserRoomListener({ accountId }: { accountId: string }) {
  const router = useRouter();

  useUserRoom(accountId, (notification) => {
    // Invalidate for session-level changes only.
    // message_added is handled by SessionRoom WebSocket on the detail page,
    // so we skip it here to avoid redundant loader re-runs.
    if (
      notification.type === "session_created" ||
      notification.type === "session_updated"
    ) {
      console.log(
        "[UserRoomListener] Invalidating router for",
        notification.type,
      );
      router.invalidate();
    }
  });

  return null;
}

function RootComponent() {
  const { session } = Route.useRouteContext();

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-950 text-gray-100">
        {session && <UserRoomListener accountId={session.accountId} />}
        <NavShell userEmail={session?.email}>
          <Outlet />
        </NavShell>
        <Scripts />
      </body>
    </html>
  );
}
