import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { parseClaudeJsonl, resolveSessionPath } from "../sync/jsonl-tailer";

describe("resolveSessionPath", () => {
  it("encodes cwd slashes as dashes", () => {
    const result = resolveSessionPath("/Users/rene/project", "abc-123");
    expect(result).toBe(
      path.join(
        os.homedir(),
        ".claude",
        "projects",
        "-Users-rene-project",
        "abc-123.jsonl",
      ),
    );
  });

  it("strips trailing slash from cwd", () => {
    const result = resolveSessionPath("/Users/rene/project/", "abc-123");
    expect(result).toBe(
      path.join(
        os.homedir(),
        ".claude",
        "projects",
        "-Users-rene-project",
        "abc-123.jsonl",
      ),
    );
  });

  it("encodes dots as dashes", () => {
    const result = resolveSessionPath(
      "/Users/rene.hernandez/project",
      "abc-123",
    );
    expect(result).toBe(
      path.join(
        os.homedir(),
        ".claude",
        "projects",
        "-Users-rene-hernandez-project",
        "abc-123.jsonl",
      ),
    );
  });

  it("handles root path", () => {
    const result = resolveSessionPath("/project", "sess-1");
    expect(result).toBe(
      path.join(
        os.homedir(),
        ".claude",
        "projects",
        "-project",
        "sess-1.jsonl",
      ),
    );
  });
});

describe("parseClaudeJsonl", () => {
  it("parses user message with string content", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({ type: "user", message: { content: "hello" } }),
    );
    expect(msg).toEqual({ type: "text", role: "user", content: "hello" });
  });

  it("parses user message with text content blocks", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        message: { content: [{ type: "text", text: "hello" }] },
      }),
    );
    expect(msg).toEqual({ type: "text", role: "user", content: "hello" });
  });

  it("parses assistant text message", () => {
    const msg = parseClaudeJsonl(
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

  it("joins multiple text blocks in assistant message", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
          ],
        },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "assistant",
      content: "Hello world",
    });
  });

  it("parses assistant tool_use block", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", name: "read_file", input: { path: "/foo" } },
          ],
        },
      }),
    );
    expect(msg).toEqual({
      type: "tool_call",
      name: "read_file",
      input: { path: "/foo" },
    });
  });

  it("parses system message with summary", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({ type: "system", summary: "Session started" }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "system",
      content: "Session started",
    });
  });

  it("skips file-history-snapshot", () => {
    expect(
      parseClaudeJsonl(JSON.stringify({ type: "file-history-snapshot" })),
    ).toBeNull();
  });

  it("skips queue-operation", () => {
    expect(
      parseClaudeJsonl(JSON.stringify({ type: "queue-operation" })),
    ).toBeNull();
  });

  it("skips progress", () => {
    expect(parseClaudeJsonl(JSON.stringify({ type: "progress" }))).toBeNull();
  });

  it("skips last-prompt", () => {
    expect(
      parseClaudeJsonl(JSON.stringify({ type: "last-prompt" })),
    ).toBeNull();
  });

  it("returns null for unknown type", () => {
    expect(
      parseClaudeJsonl(JSON.stringify({ type: "unknown-event" })),
    ).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseClaudeJsonl("not-json")).toBeNull();
  });

  it("returns null for empty JSON object", () => {
    expect(parseClaudeJsonl("{}")).toBeNull();
  });

  it("returns null for assistant message without content", () => {
    expect(
      parseClaudeJsonl(
        JSON.stringify({ type: "assistant", message: { content: [] } }),
      ),
    ).toBeNull();
  });
});
