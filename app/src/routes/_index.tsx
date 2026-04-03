import { Link, useLoaderData, useRouteLoaderData, useFetcher } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { DeviceList } from "~/components/DeviceList";
import { SessionList } from "~/components/SessionList";
import { requireAuth } from "~/server/auth/require-auth";
import { listDevices, revokeDevice } from "~/server/functions/devices";
import { listSessions } from "~/server/functions/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { accountId, db } = await requireAuth(request);
    const [devices, sessions] = await Promise.all([
      listDevices(accountId, db as any),
      listSessions(accountId, { limit: 5 }, db as any),
    ]);
    return { devices, sessions };
  } catch {
    return { devices: [], sessions: [] };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { accountId, db } = await requireAuth(request);
  const formData = await request.formData();
  const machineId = formData.get("machineId") as string;
  if (machineId) {
    await revokeDevice(machineId, accountId, db as any);
  }
  return { success: true };
}

export default function Dashboard() {
  const rootData = useRouteLoaderData("root") as {
    session: { accountId: string; email: string } | null;
  } | undefined;
  const session = rootData?.session;
  const { devices, sessions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-mono mb-2 text-gray-100">
            wappy
            <span className="animate-blink text-cyan-400 ml-0.5">_</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in via Cloudflare Access to continue.
          </p>
        </div>
      </div>
    );
  }

  function handleRevoke(machineId: string) {
    fetcher.submit({ machineId }, { method: "post" });
  }

  const activeSessions = sessions.filter((s: any) => s.status === "active").length;
  const activeDevices = devices.filter((d: any) => !d.revokedAt).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono text-gray-100">
          wappy
          <span className="animate-blink text-cyan-400 ml-0.5">_</span>
        </h1>
        <p className="text-sm text-gray-500 font-mono mt-1">{session.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="font-mono text-2xl font-bold text-gray-100">
            {sessions.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">sessions</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="font-mono text-2xl font-bold text-emerald-400">
            {activeSessions}
          </p>
          <p className="text-xs text-gray-500 mt-1">active</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="font-mono text-2xl font-bold text-cyan-400">
            {activeDevices}
          </p>
          <p className="text-xs text-gray-500 mt-1">devices</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold font-mono text-gray-200">
            Recent Sessions
          </h2>
          <Link
            to="/sessions"
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all →
          </Link>
        </div>
        <SessionList sessions={sessions} />
      </div>

      <div>
        <h2 className="text-base font-semibold font-mono text-gray-200 mb-3">
          Registered Devices
        </h2>
        <DeviceList
          devices={devices}
          onRevoke={handleRevoke}
          revoking={fetcher.state === "submitting" ? (fetcher.formData?.get("machineId") as string) : null}
        />
      </div>
    </div>
  );
}
