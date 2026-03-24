import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { accounts } from "../../../db/schema";
import { getDb } from "../lib/db";

type Db = ReturnType<typeof getDb>;

export async function upsertAccount(email: string, db: Db = getDb()) {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .get();

  if (existing) return existing;

  const id = nanoid();
  const newAccount = {
    id,
    email,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(accounts).values(newAccount);
  return { ...newAccount, displayName: null };
}
