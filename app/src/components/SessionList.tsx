import { Link } from "@tanstack/react-router";

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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-800",
  archived: "bg-red-100 text-red-600",
};

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No sessions yet. Use the CLI to start one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            to="/sessions/$sessionId"
            params={{ sessionId: session.id }}
            className="block py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {session.title || "Untitled session"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {session.agentType && (
                    <span className="mr-2">{session.agentType}</span>
                  )}
                  {session.messageCount !== undefined && (
                    <span className="mr-2">
                      {session.messageCount} messages
                    </span>
                  )}
                  {new Date(session.updatedAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusColors[session.status] || ""}`}
              >
                {session.status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
