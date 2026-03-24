import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { deviceCodes, machines } from "../../../db/schema";
import { getDb } from "../lib/db";

type Db = ReturnType<typeof getDb>;

function generateDeviceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function createDeviceCode(
  name: string,
  host: string,
  db: Db = getDb(),
) {
  const code = generateDeviceCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await db.insert(deviceCodes).values({
    code,
    machineName: name,
    status: "pending",
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  return {
    code,
    verifyUrl: `https://${host}/auth/device?code=${code}`,
    expiresIn: 600,
  };
}

export async function getDeviceCodeDetails(code: string, db: Db = getDb()) {
  const record = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code))
    .get();

  if (!record) return null;

  return {
    code: record.code,
    machineName: record.machineName,
    status: record.status,
    expired: new Date(record.expiresAt) < new Date(),
  };
}

export async function pollDeviceCode(code: string, db: Db = getDb()) {
  const record = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code))
    .get();

  if (!record) return { status: "expired" as const };

  if (new Date(record.expiresAt) < new Date()) {
    return { status: "expired" as const };
  }

  if (record.status === "approved" && record.deviceToken) {
    return { status: "approved" as const, deviceToken: record.deviceToken };
  }

  if (record.status === "denied") {
    return { status: "denied" as const };
  }

  return { status: "pending" as const };
}

export async function approveDevice(
  code: string,
  accountId: string,
  db: Db = getDb(),
) {
  const record = await db
    .select()
    .from(deviceCodes)
    .where(and(eq(deviceCodes.code, code), eq(deviceCodes.status, "pending")))
    .get();

  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) return null;

  const machineId = nanoid();
  const deviceToken = nanoid(64);
  const now = new Date().toISOString();

  await db.insert(machines).values({
    id: machineId,
    accountId,
    name: record.machineName,
    deviceToken,
    createdAt: now,
  });

  await db
    .update(deviceCodes)
    .set({ status: "approved", accountId, deviceToken })
    .where(eq(deviceCodes.code, code));

  return { machineId, deviceToken };
}

export async function denyDevice(code: string, db: Db = getDb()) {
  await db
    .update(deviceCodes)
    .set({ status: "denied" })
    .where(and(eq(deviceCodes.code, code), eq(deviceCodes.status, "pending")));
}

export async function listDevices(accountId: string, db: Db = getDb()) {
  return db
    .select({
      id: machines.id,
      name: machines.name,
      lastSeenAt: machines.lastSeenAt,
      createdAt: machines.createdAt,
      revokedAt: machines.revokedAt,
    })
    .from(machines)
    .where(eq(machines.accountId, accountId))
    .all();
}

export async function revokeDevice(
  machineId: string,
  accountId: string,
  db: Db = getDb(),
) {
  await db
    .update(machines)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(machines.id, machineId), eq(machines.accountId, accountId)));
}
