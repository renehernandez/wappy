import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey().notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    seq: integer("seq").notNull().default(0),
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
  status: text("status", {
    enum: ["pending", "approved", "denied"],
  }).notNull(),
  deviceToken: text("device_token"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey().notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    title: text("title"),
    agentType: text("agent_type"),
    machineId: text("machine_id").references(() => machines.id),
    status: text("status", {
      enum: ["active", "ended", "archived"],
    }).notNull(),
    metadata: text("metadata"),
    version: integer("version").notNull().default(1),
    seq: integer("seq").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("sessions_account_id_idx").on(table.accountId)],
);

export const sessionMessages = sqliteTable(
  "session_messages",
  {
    id: text("id").primaryKey().notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    seq: integer("seq").notNull(),
    accountSeq: integer("account_seq").notNull(),
  },
  (table) => [
    uniqueIndex("session_messages_session_seq_unique").on(
      table.sessionId,
      table.seq,
    ),
  ],
);
