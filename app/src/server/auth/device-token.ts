import { and, eq, isNull } from "drizzle-orm";
import { machines } from "../../../db/schema";
import { getDb } from "../lib/db";

export interface DeviceIdentity {
  accountId: string;
  machineId: string;
}

const DEVICE_PREFIX = "device:";

type Db = ReturnType<typeof getDb>;

export async function extractDeviceIdentity(
  request: Request,
  db: Db = getDb(),
): Promise<DeviceIdentity | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith(`Bearer ${DEVICE_PREFIX}`)) return null;

  const token = authHeader.slice(`Bearer ${DEVICE_PREFIX}`.length);
  if (!token) return null;

  const machine = await db
    .select()
    .from(machines)
    .where(and(eq(machines.deviceToken, token), isNull(machines.revokedAt)))
    .get();

  if (!machine) return null;

  await db
    .update(machines)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(machines.id, machine.id));

  return { accountId: machine.accountId, machineId: machine.id };
}
