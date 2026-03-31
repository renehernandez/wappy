import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useSessionRoom } from "~/client/ws/useSessionRoom";
import { MessageThread } from "~/components/MessageThread";
import { Badge } from "~/components/ui/Badge";
import { StatusDot } from "~/components/ui/StatusDot";
import { listMessagesFn } from "~/server/functions/message-actions";
import { getSessionFn } from "~/server/functions/session-actions";

export const Route = createFileRoute("/sessions/$sessionId")({
  component: SessionDetailPage,
  loader: async ({ params }) => {
    try {
      const session = await getSessionFn({ data: params.sessionId });
      if (!session) return { found: false as const };

      const messages = await listMessagesFn({
        data: { sessionId: params.sessionId },
      });
      return { found: true as const, session, messages };
    } catch {
      return { found: false as const };
    }
  },
});

type ValidStatus = "active" | "ended" | "archived";

function isValidStatus(s: string): s is ValidStatus {
  return s === "active" || s === "ended" || s === "archived";
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function SessionDetailPage() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const [liveMessages, setLiveMessages] = useState<
    Array<{
      id: string;
      seq: number;
      role: string;
      content: string;
      createdAt: string;
    }>
  >([]);

  const handleWsMessage = useCallback(
    (msg: {
      id: string;
      seq: number;
      role: string;
      content: string;
      createdAt: string;
    }) => {
      setLiveMessages((prev) => {
        if (prev.some((m) => m.seq === msg.seq)) return prev;
        return [...prev, msg];
      });
    },
    [],
  );

  useSessionRoom(data.found ? params.sessionId : null, handleWsMessage);

  if (!data.found) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="font-mono text-gray-500 text-sm">
          &gt; Session not found.
        </p>
        <Link
          to="/sessions"
          className="text-sm text-cyan-400 hover:text-cyan-300 mt-4 inline-flex items-center gap-1.5"
        >
          <BackIcon />
          Back to sessions
        </Link>
      </div>
    );
  }

  const { session, messages: loaderMessages } = data;

  const loaderMaxSeq =
    loaderMessages.length > 0
      ? Math.max(...loaderMessages.map((m) => m.seq))
      : 0;
  const newLiveMessages = liveMessages.filter((m) => m.seq > loaderMaxSeq);
  const allMessages = [...loaderMessages, ...newLiveMessages];

  const status = isValidStatus(session.status) ? session.status : "ended";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Sticky header */}
      <div className="sticky top-0 sm:top-14 z-40 -mx-4 px-4 py-3 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:mb-6 sm:py-0">
        <div className="flex items-center gap-3">
          <Link
            to="/sessions"
            className="text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            aria-label="Back to sessions"
          >
            <BackIcon />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <StatusDot status={status} />
            <h1 className="font-mono font-bold text-base text-gray-100 truncate">
              {session.title || (
                <span className="text-gray-500">Untitled session</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session.agentType && (
              <Badge variant="agent">{session.agentType}</Badge>
            )}
            <Badge variant={status}>{session.status}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 ml-7 text-xs text-gray-500">
          <span>{allMessages.length} messages</span>
          {session.status === "active" && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <StatusDot status="active" />
              Live
            </span>
          )}
        </div>
      </div>

      <MessageThread messages={allMessages} />
    </div>
  );
}
