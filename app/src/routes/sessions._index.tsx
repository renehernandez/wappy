import { useLoaderData } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/sessions._index";
import { SessionList } from "~/components/SessionList";
import { SearchInput } from "~/components/ui/SearchInput";
import { requireAuth } from "~/server/auth/require-auth";
import { listSessions } from "~/server/functions/sessions";

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "archived", label: "Archived" },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { accountId, db } = await requireAuth(request);
    const sessions = await listSessions(accountId, {}, db as any);
    return { sessions };
  } catch {
    return { sessions: [] };
  }
}

export default function SessionsPage() {
  const { sessions: initialSessions } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const filtered = initialSessions
    .filter((s: any) => (filter ? s.status === filter : true))
    .filter((s: any) =>
      search
        ? (s.title ?? "untitled session")
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-gray-100">Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">
          {initialSessions.length} session
          {initialSessions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} />
      </div>

      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value ?? "all"}
            type="button"
            onClick={() => setFilter(value)}
            className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === value
                ? "bg-slate-700 text-gray-100"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SessionList sessions={filtered} />
    </div>
  );
}
