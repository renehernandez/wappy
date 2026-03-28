import type { DeviceCodeResponse, DeviceInfo } from "@wappy/wire";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient(serverUrl: string, deviceToken?: string) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (deviceToken) {
      headers.Authorization = `Bearer device:${deviceToken}`;
    }

    let res: Response;
    try {
      res = await fetch(`${serverUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new ApiError(0, `Request timed out: ${path}`);
      }
      throw new ApiError(
        0,
        `Cannot reach server at ${serverUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    async createDeviceCode(
      name: string,
    ): Promise<DeviceCodeResponse & { code: string }> {
      return request("POST", "/api/devices/code", { name });
    },

    async pollDeviceCode(
      code: string,
    ): Promise<
      | { status: "pending" }
      | { status: "approved"; deviceToken: string }
      | { status: "denied" }
      | { status: "expired" }
    > {
      return request(
        "GET",
        `/api/devices/poll?code=${encodeURIComponent(code)}`,
      );
    },

    async listDevices(): Promise<DeviceInfo[]> {
      return request("GET", "/api/devices");
    },

    async revokeDevice(machineId: string): Promise<void> {
      await request("POST", "/api/devices/revoke", { machineId });
    },

    async connect(): Promise<{
      status: string;
      user?: { email: string; accountId: string };
    }> {
      return request("GET", "/api/connect");
    },

    async createSession(data: {
      title?: string;
      agentType?: string;
      machineId?: string;
    }): Promise<{ id: string }> {
      return request("POST", "/api/sessions", data);
    },

    async addMessage(
      sessionId: string,
      data: { role: string; content: string },
    ): Promise<void> {
      await request("POST", "/api/messages", { sessionId, ...data });
    },

    async updateSession(
      sessionId: string,
      data: { status?: string },
    ): Promise<void> {
      await request(
        "POST",
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        data,
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
