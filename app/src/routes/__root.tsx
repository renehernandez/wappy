import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import { useUserRoom } from "~/client/ws/useUserRoom";
import { getSessionFn } from "~/server/functions/session";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WAPI" },
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
    // Re-fetch route data on any session mutation
    if (
      notification.type === "session_created" ||
      notification.type === "session_updated" ||
      notification.type === "message_added"
    ) {
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
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {session && <UserRoomListener accountId={session.accountId} />}
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
