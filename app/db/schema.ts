import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey().notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("accounts_email_unique").on(table.email)],
);

export const machines = sqliteTable(
  "machines",
  {
    id: text("id").primaryKey().notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    deviceToken: text("device_token").notNull(),
    lastSeenAt: text("last_seen_at"),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("machines_device_token_unique").on(table.deviceToken),
  ],
);

export const deviceCodes = sqliteTable("device_codes", {
  code: text("code").primaryKey().notNull(),
  machineName: text("machine_name").notNull(),
  accountId: text("account_id").references(() => accounts.id),
  status: text("status", { enum: ["pending", "approved", "denied"] }).notNull(),
  deviceToken: text("device_token"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
