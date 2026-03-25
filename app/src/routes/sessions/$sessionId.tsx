import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useSessionRoom } from "~/client/ws/useSessionRoom";
import { MessageThread } from "~/components/MessageThread";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleWsMessage = useCallback(
    (msg: {
      id: string;
      seq: number;
      role: string;
      content: string;
      createdAt: string;
    }) => {
      setLiveMessages((prev) => {
        // Deduplicate by seq
        if (prev.some((m) => m.seq === msg.seq)) return prev;
        return [...prev, msg];
      });
      // Auto-scroll to bottom
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    },
    [],
  );

  useSessionRoom(data.found ? params.sessionId : null, handleWsMessage);

  if (!data.found) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-500">Session not found.</p>
        <Link
          to="/sessions"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to sessions
        </Link>
      </div>
    );
  }

  const { session, messages: loaderMessages } = data;

  // Merge loader messages with live messages, dedup by seq
  const loaderMaxSeq =
    loaderMessages.length > 0
      ? Math.max(...loaderMessages.map((m) => m.seq))
      : 0;
  const newLiveMessages = liveMessages.filter((m) => m.seq > loaderMaxSeq);
  const allMessages = [...loaderMessages, ...newLiveMessages];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to="/sessions" className="text-sm text-blue-600 hover:underline">
          Back to sessions
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {session.title || "Untitled session"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {session.agentType && (
            <span className="mr-2">{session.agentType}</span>
          )}
          <span className="mr-2">{session.status}</span>
          <span>{allMessages.length} messages</span>
          {session.status === "active" && (
            <span className="ml-2 text-green-600">Live</span>
          )}
        </p>
      </div>

      <MessageThread messages={allMessages} />
      <div ref={bottomRef} />
    </div>
  );
}
