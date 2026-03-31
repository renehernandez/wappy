import { describe, expect, it } from "vitest";
import { isPrintMode, parseClaudeMessage } from "../adapters/claude";
import { parseCodexMessage } from "../adapters/codex";
import { getAdapter, listAdapters } from "../adapters/registry";

describe("adapter registry", () => {
  it("returns claude adapter by name", () => {
    expect(getAdapter("claude")).not.toBeNull();
    expect(getAdapter("claude")?.name).toBe("claude");
  });

  it("returns codex adapter by name", () => {
    expect(getAdapter("codex")).not.toBeNull();
    expect(getAdapter("codex")?.name).toBe("codex");
  });

  it("returns null for unknown tool", () => {
    expect(getAdapter("unknown-tool")).toBeNull();
  });

  it("lists available adapters", () => {
    const available = listAdapters();
    expect(available).toContain("claude");
    expect(available).toContain("codex");
  });
});

describe("Claude message parsing", () => {
  it("parses assistant text from content blocks", () => {
    const msg = parseClaudeMessage(
      JSON.stringify({
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Hello world" }],
        },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "assistant",
      content: "Hello world",
    });
  });

  it("parses text delta", () => {
    const msg = parseClaudeMessage(
      JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: "chunk" },
      }),
    );
    expect(msg).toEqual({ type: "text", role: "assistant", content: "chunk" });
  });

  it("parses tool use", () => {
    const msg = parseClaudeMessage(
      JSON.stringify({
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "read_file",
          input: { path: "/foo" },
        },
      }),
    );
    expect(msg).toEqual({
      type: "tool_call",
      name: "read_file",
      input: { path: "/foo" },
    });
  });

  it("parses error result", () => {
    const msg = parseClaudeMessage(
      JSON.stringify({ type: "result", subtype: "error_result", error: "Bad" }),
    );
    expect(msg).toEqual({ type: "error", message: "Bad" });
  });

  it("parses turn complete", () => {
    const msg = parseClaudeMessage(JSON.stringify({ type: "result" }));
    expect(msg).toEqual({ type: "turn_complete" });
  });

  it("returns null for unknown type", () => {
    expect(parseClaudeMessage(JSON.stringify({ type: "ping" }))).toBeNull();
  });

  it("returns null for non-JSON", () => {
    expect(parseClaudeMessage("not json")).toBeNull();
  });
});

describe("Claude print mode detection", () => {
  it("detects --print flag", () => {
    expect(isPrintMode(["--print", "hello"])).toBe(true);
  });

  it("detects -p short flag", () => {
    expect(isPrintMode(["-p", "hello"])).toBe(true);
  });

  it("returns false when no print flag", () => {
    expect(isPrintMode(["--model", "opus"])).toBe(false);
  });

  it("returns false for empty args", () => {
    expect(isPrintMode([])).toBe(false);
  });
});

describe("Codex message parsing", () => {
  it("parses assistant message", () => {
    const msg = parseCodexMessage(
      JSON.stringify({ type: "message", role: "assistant", content: "Hi" }),
    );
    expect(msg).toEqual({ type: "text", role: "assistant", content: "Hi" });
  });

  it("parses tool call", () => {
    const msg = parseCodexMessage(
      JSON.stringify({
        type: "function_call",
        name: "exec",
        arguments: { cmd: "ls" },
      }),
    );
    expect(msg).toEqual({
      type: "tool_call",
      name: "exec",
      input: { cmd: "ls" },
    });
  });

  it("parses tool result", () => {
    const msg = parseCodexMessage(
      JSON.stringify({ type: "function_call_output", output: "file.txt" }),
    );
    expect(msg).toEqual({ type: "tool_result", output: "file.txt" });
  });

  it("parses error", () => {
    const msg = parseCodexMessage(
      JSON.stringify({ type: "error", message: "fail" }),
    );
    expect(msg).toEqual({ type: "error", message: "fail" });
  });

  it("parses completion", () => {
    const msg = parseCodexMessage(JSON.stringify({ type: "completed" }));
    expect(msg).toEqual({ type: "turn_complete" });
  });

  it("returns null for unknown type", () => {
    expect(parseCodexMessage(JSON.stringify({ type: "unknown" }))).toBeNull();
  });
});
