import { Link } from "react-router";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { StatusDot } from "~/components/ui/StatusDot";
import { relativeTime } from "~/lib/relativeTime";

interface Session {
  id: string;
  title: string | null;
  agentType: string | null;
  status: string;
  messageCount?: number;
  updatedAt: string;
}

interface SessionListProps {
  sessions: Session[];
}

type ValidStatus = "active" | "ended" | "archived";

function isValidStatus(status: string): status is ValidStatus {
  return status === "active" || status === "ended" || status === "archived";
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="font-mono text-gray-500 text-sm py-8">
        &gt; No sessions found. Run &quot;wappy run claude&quot; to start one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            to={`/sessions/${session.id}`}
            className="block focus:outline-none focus:ring-2 focus:ring-cyan-500/40 rounded-lg"
          >
            <Card hover className="p-4 min-h-12">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 pt-0.5 shrink-0">
                    <StatusDot
                      status={
                        isValidStatus(session.status) ? session.status : "ended"
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-medium text-sm text-gray-100 truncate">
                      {session.title || "Untitled session"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {session.agentType && (
                        <Badge variant="agent">{session.agentType}</Badge>
                      )}
                      {session.messageCount !== undefined && (
                        <span className="text-xs text-gray-500">
                          {session.messageCount} msg
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {relativeTime(session.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={
                    isValidStatus(session.status) ? session.status : "default"
                  }
                >
                  {session.status}
                </Badge>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
