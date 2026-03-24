import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, getTestDb } from "~/test/apply-migrations";
import { upsertAccount } from "../auth";

beforeAll(async () => {
  await applyMigrations();
});

describe("upsertAccount", () => {
  it("creates a new account when email does not exist", async () => {
    const result = await upsertAccount("new@example.com", getTestDb());

    expect(result.email).toBe("new@example.com");
    expect(result.id).toBeDefined();
    expect(result.displayName).toBeNull();
    expect(result.createdAt).toBeDefined();
  });

  it("returns existing account when email already exists", async () => {
    const db = getTestDb();
    const first = await upsertAccount("user@example.com", db);
    const second = await upsertAccount("user@example.com", db);

    expect(second.id).toBe(first.id);
    expect(second.email).toBe(first.email);
  });

  it("creates different accounts for different emails", async () => {
    const db = getTestDb();
    const a = await upsertAccount("a@example.com", db);
    const b = await upsertAccount("b@example.com", db);

    expect(a.id).not.toBe(b.id);
  });
});
