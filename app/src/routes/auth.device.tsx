import { useLoaderData, useRouteLoaderData, useFetcher, useSearchParams } from "react-router";
import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { DeviceApproval } from "~/components/DeviceApproval";
import { requireAuth } from "~/server/auth/require-auth";
import {
  approveDevice,
  denyDevice,
  getDeviceCodeDetails,
} from "~/server/functions/devices";
import { getDb } from "~/server/lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  if (!code) return { found: false as const };

  const db = getDb();
  const details = await getDeviceCodeDetails(code, db as any);
  if (!details) return { found: false as const };

  return { found: true as const, details, code };
}

export async function action({ request }: ActionFunctionArgs) {
  const { accountId, db } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const code = formData.get("code") as string;

  if (intent === "approve") {
    await approveDevice(code, accountId, db as any);
    return { result: "approved" as const };
  }
  if (intent === "deny") {
    await denyDevice(code, db as any);
    return { result: "denied" as const };
  }
  return { result: null };
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-sm w-full">
        {children}
      </div>
    </div>
  );
}

export default function DeviceAuthPage() {
  const data = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData("root") as {
    session: { accountId: string; email: string } | null;
  } | undefined;
  const session = rootData?.session;
  const fetcher = useFetcher<typeof action>();

  const result = fetcher.data?.result ?? null;

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <p className="text-gray-500 text-sm font-mono">
          &gt; Sign in via Cloudflare Access first.
        </p>
      </div>
    );
  }

  if (!data.found) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <p className="text-gray-500 text-sm font-mono">
          &gt; Invalid or expired device code.
        </p>
      </div>
    );
  }

  if (result === "approved") {
    return (
      <CenteredCard>
        <div className="text-center">
          <p className="text-emerald-400 font-medium text-lg font-mono">
            Device approved!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You can close this window. The CLI will continue automatically.
          </p>
        </div>
      </CenteredCard>
    );
  }

  if (result === "denied") {
    return (
      <CenteredCard>
        <div className="text-center">
          <p className="text-gray-400 font-medium font-mono">Device denied.</p>
        </div>
      </CenteredCard>
    );
  }

  const { details, code } = data;
  const expired = details.expired || details.status !== "pending";

  function handleApprove() {
    fetcher.submit({ intent: "approve", code }, { method: "post" });
  }

  function handleDeny() {
    fetcher.submit({ intent: "deny", code }, { method: "post" });
  }

  return (
    <CenteredCard>
      <DeviceApproval
        code={code}
        machineName={details.machineName}
        expired={expired}
        onApprove={handleApprove}
        onDeny={handleDeny}
        loading={fetcher.state === "submitting"}
      />
    </CenteredCard>
  );
}
