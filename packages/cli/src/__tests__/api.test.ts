import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "../api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createApiClient", () => {
  const api = createApiClient("https://wappy.test.workers.dev", "my-token");

  it("sends device token in Authorization header", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    await api.listDevices();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://wappy.test.workers.dev/api/devices",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer device:my-token",
        }),
      }),
    );
  });

  it("createDeviceCode sends POST with name", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        code: "ABCD-1234",
        verifyUrl: "https://test/auth/device?code=ABCD-1234",
        expiresIn: 600,
      }),
    );

    const result = await api.createDeviceCode("my-laptop");
    expect(result.code).toBe("ABCD-1234");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://wappy.test.workers.dev/api/devices/code",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("pollDeviceCode returns status", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: "pending" }));
    const result = await api.pollDeviceCode("ABCD-1234");
    expect(result.status).toBe("pending");
  });

  it("throws ApiError on HTTP error", async () => {
    mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(api.listDevices()).rejects.toThrow(ApiError);
    await expect(api.listDevices()).rejects.toMatchObject({ status: 401 });
  });

  it("throws ApiError on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));
    await expect(api.listDevices()).rejects.toThrow(ApiError);
    await expect(api.listDevices()).rejects.toMatchObject({ status: 0 });
  });
});

describe("createApiClient without token", () => {
  it("does not send Authorization header", async () => {
    const api = createApiClient("https://wappy.test.workers.dev");
    mockFetch.mockResolvedValue(
      jsonResponse({
        code: "TEST-CODE",
        verifyUrl: "https://test",
        expiresIn: 600,
      }),
    );

    await api.createDeviceCode("laptop");
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(lastCall[1].headers.Authorization).toBeUndefined();
  });
});

describe("connect", () => {
  const api = createApiClient("https://wappy.test.workers.dev");

  it("returns status ok without user when no auth", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: "ok" }));
    const result = await api.connect();
    expect(result.status).toBe("ok");
    expect(result.user).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://wappy.test.workers.dev/api/connect",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns status ok with user when WARP JWT present", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        status: "ok",
        user: { email: "user@example.com", accountId: "acc-123" },
      }),
    );
    const result = await api.connect();
    expect(result.status).toBe("ok");
    expect(result.user?.email).toBe("user@example.com");
    expect(result.user?.accountId).toBe("acc-123");
  });
});
