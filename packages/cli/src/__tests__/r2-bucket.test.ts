import { describe, expect, it, vi } from "vitest";

// Mock execa at the module level (required for vitest hoisting)
vi.mock("execa", () => ({
  execaCommand: vi.fn(),
}));

import { execaCommand } from "execa";
import { findR2Bucket } from "../commands/init";

const mockExeca = vi.mocked(execaCommand);
const testEnv = { CLOUDFLARE_ACCOUNT_ID: "test-account" } as Record<
  string,
  string
>;

describe("findR2Bucket", () => {
  it("returns true when bucket name appears in list output", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "wapi-storage\nother-bucket",
      stderr: "",
    } as any);

    const result = await findR2Bucket("wapi-storage", testEnv);
    expect(result).toBe(true);
  });

  it("returns false when bucket name is not in list output", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "other-bucket\nanother-bucket",
      stderr: "",
    } as any);

    const result = await findR2Bucket("wapi-storage", testEnv);
    expect(result).toBe(false);
  });

  it("returns false when wrangler command fails", async () => {
    mockExeca.mockRejectedValueOnce(new Error("wrangler error"));

    const result = await findR2Bucket("wapi-storage", testEnv);
    expect(result).toBe(false);
  });
});
