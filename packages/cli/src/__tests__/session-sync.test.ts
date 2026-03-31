import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionSync } from "../sync/session-sync";

function createMockApi() {
  return {
    createDeviceCode: vi.fn(),
    pollDeviceCode: vi.fn(),
    listDevices: vi.fn(),
    revokeDevice: vi.fn(),
    createSession: vi.fn().mockResolvedValue({ id: "s-mock-123" }),
    addMessage: vi.fn().mockResolvedValue(undefined),
    updateSession: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SessionSync", () => {
  let api: ReturnType<typeof createMockApi>;
  let sync: SessionSync;

  beforeEach(() => {
    api = createMockApi();
    sync = new SessionSync(api as any, "claude");
  });

  it("creates session lazily on first message", async () => {
    await sync.handleMessage({
      type: "text",
      role: "assistant",
      content: "Hello",
    });

    expect(api.createSession).toHaveBeenCalledOnce();
    expect(api.createSession).toHaveBeenCalledWith({
      agentType: "claude",
      machineId: undefined,
    });
    expect(api.addMessage).toHaveBeenCalledWith("s-mock-123", {
      role: "assistant",
      content: "Hello",
    });
  });

  it("does not create session twice", async () => {
    await sync.handleMessage({ type: "text", role: "assistant", content: "A" });
    await sync.handleMessage({ type: "text", role: "assistant", content: "B" });

    expect(api.createSession).toHaveBeenCalledOnce();
    expect(api.addMessage).toHaveBeenCalledTimes(2);
  });

  it("maps tool_call to role=tool with JSON content", async () => {
    await sync.handleMessage({
      type: "tool_call",
      name: "read_file",
      input: { path: "/foo" },
    });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1].role).toBe("tool");
    const parsed = JSON.parse(addCall[1].content);
    expect(parsed.type).toBe("tool_call");
    expect(parsed.name).toBe("read_file");
  });

  it("maps error to role=system", async () => {
    await sync.handleMessage({ type: "error", message: "Bad request" });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1].role).toBe("system");
    expect(addCall[1].content).toContain("Bad request");
  });

  it("skips turn_complete (no server call)", async () => {
    await sync.handleMessage({ type: "text", role: "assistant", content: "A" });
    await sync.handleMessage({ type: "turn_complete" });

    // createSession + 1 addMessage (turn_complete is skipped)
    expect(api.addMessage).toHaveBeenCalledOnce();
  });

  it("ends session on exit", async () => {
    await sync.handleMessage({ type: "text", role: "assistant", content: "A" });
    await sync.end();

    expect(api.updateSession).toHaveBeenCalledWith("s-mock-123", {
      status: "ended",
    });
  });

  it("handles createSession failure gracefully", async () => {
    api.createSession.mockRejectedValue(new Error("network error"));

    await expect(
      sync.handleMessage({ type: "text", role: "assistant", content: "A" }),
    ).resolves.not.toThrow();

    // addMessage should not be called since session was not created
    expect(api.addMessage).not.toHaveBeenCalled();
  });

  it("handles addMessage failure gracefully", async () => {
    api.addMessage.mockRejectedValue(new Error("server error"));

    await expect(
      sync.handleMessage({ type: "text", role: "assistant", content: "A" }),
    ).resolves.not.toThrow();
  });

  it("handles end failure gracefully", async () => {
    await sync.handleMessage({ type: "text", role: "assistant", content: "A" });
    api.updateSession.mockRejectedValue(new Error("fail"));

    await expect(sync.end()).resolves.not.toThrow();
  });

  it("forwards metadata from tool_call message", async () => {
    await sync.handleMessage({
      type: "tool_call",
      name: "Bash",
      input: { command: "git status" },
      metadata: { isSubagent: true },
    });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1].role).toBe("tool");
    expect(addCall[1].metadata).toBe(JSON.stringify({ isSubagent: true }));
  });

  it("forwards metadata from tool_result message", async () => {
    await sync.handleMessage({
      type: "tool_result",
      output: "some output",
      metadata: { isSubagent: true },
    });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1].role).toBe("tool");
    expect(addCall[1].metadata).toBe(JSON.stringify({ isSubagent: true }));
  });

  it("omits metadata field when tool_call has no metadata", async () => {
    await sync.handleMessage({
      type: "tool_call",
      name: "read_file",
      input: { path: "/foo" },
    });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1]).not.toHaveProperty("metadata");
  });

  it("omits metadata field when tool_result has no metadata", async () => {
    await sync.handleMessage({
      type: "tool_result",
      output: "output",
    });

    const addCall = api.addMessage.mock.calls[0];
    expect(addCall[1]).not.toHaveProperty("metadata");
  });
});
