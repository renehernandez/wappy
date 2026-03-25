import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { DeviceList } from "~/components/DeviceList";
import { SessionList } from "~/components/SessionList";
import {
  listDevicesFn,
  revokeDeviceFn,
} from "~/server/functions/device-actions";
import { listSessionsFn } from "~/server/functions/session-actions";

export const Route = createFileRoute("/")({
  component: Dashboard,
  loader: async () => {
    try {
      const [devices, sessions] = await Promise.all([
        listDevicesFn(),
        listSessionsFn({ data: { limit: 5 } }),
      ]);
      return { devices, sessions };
    } catch {
      return { devices: [], sessions: [] };
    }
  },
});

function Dashboard() {
  const { session } = Route.useRouteContext();
  const { devices, sessions } = Route.useLoaderData();
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">WAPI</h1>
          <p className="text-gray-500">
            Sign in via Cloudflare Access to continue.
          </p>
        </div>
      </div>
    );
  }

  async function handleRevoke(machineId: string) {
    setRevoking(machineId);
    try {
      await revokeDeviceFn({ data: { machineId } });
      router.invalidate();
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">WAPI</h1>
        <p className="text-sm text-gray-500 mt-1">{session.email}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
          <Link
            to="/sessions"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <SessionList sessions={sessions} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Registered Devices</h2>
        <DeviceList
          devices={devices}
          onRevoke={handleRevoke}
          revoking={revoking}
        />
      </div>
    </div>
  );
}
