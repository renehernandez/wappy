import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { extractCfAccessIdentity } from "../auth/cf-access";
import { getDb } from "../lib/db";
import { upsertAccount } from "./auth";
import {
  approveDevice,
  createDeviceCode,
  denyDevice,
  getDeviceCodeDetails,
  listDevices,
  pollDeviceCode,
  revokeDevice,
} from "./devices";

async function requireAuth() {
  const jwt = getRequestHeader("CF-Access-JWT-Assertion");
  if (!jwt) throw new Error("Unauthorized");
  const fakeReq = new Request("https://placeholder", {
    headers: { "CF-Access-JWT-Assertion": jwt },
  });
  const db = getDb();
  const cfIdentity = extractCfAccessIdentity(fakeReq);
  if (!cfIdentity) throw new Error("Unauthorized");
  const account = await upsertAccount(cfIdentity.email, db as any);
  return { account, db };
}

export const createDeviceCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const host = getRequestHeader("host") || "localhost";
    const db = getDb();
    return createDeviceCode(data.name, host, db as any);
  });

export const getDeviceCodeDetailsFn = createServerFn({ method: "GET" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }) => {
    const db = getDb();
    return getDeviceCodeDetails(code, db as any);
  });

export const pollDeviceCodeFn = createServerFn({ method: "GET" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }) => {
    const db = getDb();
    return pollDeviceCode(code, db as any);
  });

export const approveDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const { account, db } = await requireAuth();
    return approveDevice(data.code, account.id, db as any);
  });

export const denyDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    await denyDevice(data.code, db as any);
    return { success: true };
  });

export const listDevicesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { account, db } = await requireAuth();
    return listDevices(account.id, db as any);
  },
);

export const revokeDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((data: { machineId: string }) => data)
  .handler(async ({ data }) => {
    const { account, db } = await requireAuth();
    await revokeDevice(data.machineId, account.id, db as any);
    return { success: true };
  });
