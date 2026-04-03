import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLoaderData, useParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useSessionRoom } from "~/client/ws/useSessionRoom";
import { MessageThread } from "~/components/MessageThread";
import { Badge } from "~/components/ui/Badge";
import { StatusDot } from "~/components/ui/StatusDot";
import { requireAuth } from "~/server/auth/require-auth";
import { listMessages } from "~/server/functions/messages";
import { getSession } from "~/server/functions/sessions";
import { getR2 } from "~/server/lib/r2";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { accountId, db } = await requireAuth(request);
    const sessionId = params.sessionId!;
    const session = await getSession(sessionId, accountId, db as any);
    if (!session) return { found: false as const };

    const r2 = getR2();
    const messages = await listMessages(
      accountId,
      { sessionId },
      db as any,
      r2,
    );
    return { found: true as const, session, messages };
  } catch {
    return { found: false as const };
  }
}

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

async function fetchGapMessages(
  sessionId: string,
  afterSeq: number,
): Promise<any[]> {
  try {
    const res = await fetch(
      `/api/messages?sessionId=${encodeURIComponent(sessionId)}&afterSeq=${afterSeq}`,
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default function SessionDetailPage() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();
  const sessionId = params.sessionId!;
  const [liveMessages, setLiveMessages] = useState<
    Array<{
      id: string;
      seq: number;
      role: string;
      content: string;
      metadata?: string | null;
      createdAt: string;
    }>
  >([]);

  const handleWsMessage = useCallback(
    (msg: {
      id: string;
      seq: number;
      role: string;
      content: string;
      metadata?: string | null;
      createdAt: string;
    }) => {
      setLiveMessages((prev) => {
        if (prev.some((m) => m.seq === msg.seq)) return prev;
        return [...prev, msg].sort((a, b) => a.seq - b.seq);
      });
    },
    [],
  );

  const loaderMaxSeqRef = useRef(0);
  if (data.found) {
    const msgs = data.messages;
    loaderMaxSeqRef.current =
      msgs.length > 0 ? Math.max(...msgs.map((m: any) => m.seq)) : 0;
  }

  const handleWsConnect = useCallback(() => {
    if (!data.found) return;
    const afterSeq = loaderMaxSeqRef.current;
    fetchGapMessages(sessionId, afterSeq).then((gapMessages) => {
      for (const msg of gapMessages) {
        handleWsMessage({
          id: msg.id,
          seq: msg.seq,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        });
      }
    });
  }, [data.found, sessionId, handleWsMessage]);

  useSessionRoom(
    data.found ? sessionId : null,
    handleWsMessage,
    handleWsConnect,
  );

  // Poll for new messages as fallback when session is active
  const maxSeqRef = useRef(0);
  const sessionStatus = data.found ? data.session.status : null;
  useEffect(() => {
    if (!data.found || sessionStatus !== "active") return;

    const interval = setInterval(() => {
      fetchGapMessages(sessionId, maxSeqRef.current).then((msgs) => {
        for (const msg of msgs) {
          handleWsMessage({
            id: msg.id,
            seq: msg.seq,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata,
            createdAt: msg.createdAt,
          });
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [data.found, sessionStatus, sessionId, handleWsMessage]);

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
      ? Math.max(...loaderMessages.map((m: any) => m.seq))
      : 0;
  const newLiveMessages = liveMessages.filter((m) => m.seq > loaderMaxSeq);
  const allMessages = [...loaderMessages, ...newLiveMessages];

  const currentMaxSeq =
    allMessages.length > 0
      ? Math.max(...allMessages.map((m: any) => m.seq))
      : 0;
  maxSeqRef.current = currentMaxSeq;

  const status = isValidStatus(session.status) ? session.status : "ended";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
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
