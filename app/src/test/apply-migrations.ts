import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";

export function getTestDb() {
  return drizzle(env.DB, { schema });
}

export async function applyMigrations() {
  const db = getTestDb();

  await db.run(sql`CREATE TABLE IF NOT EXISTS accounts (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL,
    display_name text,
    created_at text NOT NULL,
    updated_at text NOT NULL
  )`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts (email)`,
  );

  await db.run(sql`CREATE TABLE IF NOT EXISTS machines (
    id text PRIMARY KEY NOT NULL,
    account_id text NOT NULL,
    name text NOT NULL,
    device_token text NOT NULL,
    last_seen_at text,
    created_at text NOT NULL,
    revoked_at text,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  )`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS machines_device_token_unique ON machines (device_token)`,
  );

  await db.run(sql`CREATE TABLE IF NOT EXISTS device_codes (
    code text PRIMARY KEY NOT NULL,
    machine_name text NOT NULL,
    account_id text,
    status text NOT NULL,
    device_token text,
    expires_at text NOT NULL,
    created_at text NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  )`);
}
