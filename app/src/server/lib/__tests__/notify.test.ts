import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock cloudflare:workers env
const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
const mockIdFromName = vi.fn().mockReturnValue("mock-id");

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
}));

const { notifyUserRoom, notifySessionRoom } = await import("../notify");

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(new Response("ok"));
});

describe("notifyUserRoom", () => {
  it("sends POST to UserRoom DO with JSON payload", async () => {
    await notifyUserRoom("acc-123", {
      type: "session_created",
      sessionId: "s-1",
      title: "Test",
    });

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

  it("rejects on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("DO unavailable"));

    await expect(
      notifyUserRoom("acc-123", { type: "session_created" }),
    ).rejects.toThrow("DO unavailable");
  });

  it("rejects on idFromName failure", async () => {
    mockIdFromName.mockImplementationOnce(() => {
      throw new Error("bad id");
    });

    await expect(notifyUserRoom("acc-123", { type: "test" })).rejects.toThrow(
      "bad id",
    );
  });
});

describe("notifySessionRoom", () => {
  it("sends POST to SessionRoom DO with full message", async () => {
    await notifySessionRoom("s-456", {
      type: "message",
      id: "m-1",
      seq: 5,
      role: "assistant",
      content: "Hello",
      createdAt: "2026-01-01T00:00:00Z",
    });

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

  it("rejects on failure", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    await expect(
      notifySessionRoom("s-456", { type: "message" }),
    ).rejects.toThrow("network error");
  });
});
