import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SessionList } from "~/components/SessionList";
import { listSessionsFn } from "~/server/functions/session-actions";

export const Route = createFileRoute("/sessions/")({
  component: SessionsPage,
  loader: async () => {
    try {
      const sessions = await listSessionsFn({ data: {} });
      return { sessions };
    } catch {
      return { sessions: [] };
    }
  },
});

function SessionsPage() {
  const { sessions: initialSessions } = Route.useLoaderData();
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const sessions = filter
    ? initialSessions.filter((s) => s.status === filter)
    : initialSessions;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          Dashboard
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[undefined, "active", "ended", "archived"].map((status) => (
          <button
            key={status ?? "all"}
            type="button"
            onClick={() => setFilter(status)}
            className={`text-xs px-3 py-1 rounded-full border ${
              filter === status
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {status ?? "All"}
          </button>
        ))}
      </div>

      <SessionList sessions={sessions} />
    </div>
  );
}
