import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock cloudflare:workers env + waitUntil
const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
const mockIdFromName = vi.fn().mockReturnValue("mock-id");
const mockWaitUntil = vi.fn();

vi.mock("cloudflare:workers", () => ({
  env: {
    UserRoom: {
      idFromName: mockIdFromName,
      get: mockGet,
    },
    SessionRoom: {
      idFromName: mockIdFromName,
      get: mockGet,
    },
  },
  waitUntil: mockWaitUntil,
}));

const { notifyUserRoom, notifySessionRoom } = await import("../notify");

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(new Response("ok"));
});

describe("notifyUserRoom", () => {
  it("sends POST to UserRoom DO with JSON payload", async () => {
    notifyUserRoom("acc-123", {
      type: "session_created",
      sessionId: "s-1",
      title: "Test",
    });

    // waitUntil is called with the background promise
    expect(mockWaitUntil).toHaveBeenCalledTimes(1);

    // Wait for the background promise to complete
    await mockWaitUntil.mock.calls[0][0];

    expect(mockIdFromName).toHaveBeenCalledWith("acc-123");
    expect(mockGet).toHaveBeenCalledWith("mock-id");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://dummy/notify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "session_created",
          sessionId: "s-1",
          title: "Test",
        }),
      }),
    );
  });

  it("does not throw on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("DO unavailable"));

    notifyUserRoom("acc-123", { type: "session_created" });

    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
    // The promise should resolve (error is caught internally)
    await expect(mockWaitUntil.mock.calls[0][0]).resolves.not.toThrow();
  });

  it("does not throw on idFromName failure", () => {
    mockIdFromName.mockImplementationOnce(() => {
      throw new Error("bad id");
    });

    // Should not throw synchronously — error caught in try/catch
    expect(() => notifyUserRoom("acc-123", { type: "test" })).not.toThrow();
  });
});

describe("notifySessionRoom", () => {
  it("sends POST to SessionRoom DO with full message", async () => {
    notifySessionRoom("s-456", {
      type: "message",
      id: "m-1",
      seq: 5,
      role: "assistant",
      content: "Hello",
      createdAt: "2026-01-01T00:00:00Z",
    });

    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
    await mockWaitUntil.mock.calls[0][0];

    expect(mockIdFromName).toHaveBeenCalledWith("s-456");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://dummy/notify",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("message");
    expect(body.content).toBe("Hello");
    expect(body.seq).toBe(5);
  });

  it("does not throw on failure", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    notifySessionRoom("s-456", { type: "message" });

    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
    await expect(mockWaitUntil.mock.calls[0][0]).resolves.not.toThrow();
  });
});
