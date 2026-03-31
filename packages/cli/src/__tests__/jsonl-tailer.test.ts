import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseClaudeJsonl,
  parseProgressEvent,
  resolveSessionPath,
} from "../sync/jsonl-tailer";

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

  it("skips progress event without data.message", () => {
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

  it("extracts isMeta metadata from user message", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        isMeta: true,
        message: { content: "skill prompt" },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "user",
      content: "skill prompt",
      metadata: { isMeta: true },
    });
  });

  it("extracts origin metadata from user message", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        origin: { kind: "task-notification" },
        message: { content: "task done" },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "user",
      content: "task done",
      metadata: { origin: { kind: "task-notification" } },
    });
  });

  it("skips completed toolUseResult (subagent output)", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        toolUseResult: {
          status: "completed",
          agentType: "glab-review",
          content: [{ type: "text", text: "## MR Review\nLooks good." }],
        },
        message: {
          content: [{ type: "tool_result", tool_use_id: "x", content: [] }],
        },
      }),
    );
    expect(msg).toBeNull();
  });

  it("does not skip toolUseResult with non-completed status", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        toolUseResult: { status: "pending" },
        message: { content: "still waiting" },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "user",
      content: "still waiting",
    });
  });

  it("extracts isCommand metadata from command-message user message", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        message: {
          content:
            "<command-message>glab-review</command-message>\n<command-name>/glab-review</command-name>\n<command-args>current MR</command-args>",
        },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "user",
      content:
        "<command-message>glab-review</command-message>\n<command-name>/glab-review</command-name>\n<command-args>current MR</command-args>",
      metadata: { isCommand: true, commandName: "glab-review" },
    });
  });

  it("does not include metadata when neither isMeta nor origin is present", () => {
    const msg = parseClaudeJsonl(
      JSON.stringify({
        type: "user",
        message: { content: "normal message" },
      }),
    );
    expect(msg).toEqual({
      type: "text",
      role: "user",
      content: "normal message",
    });
    expect(msg).not.toHaveProperty("metadata");
  });
});

describe("parseProgressEvent", () => {
  function makeProgressData(message: unknown) {
    return { type: "progress", data: { message } };
  }

  it("parses assistant tool_use block as subagent tool_call", () => {
    const data = makeProgressData({
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Bash", input: { command: "git status" } },
        ],
      },
    });
    expect(parseProgressEvent(data)).toEqual({
      type: "tool_call",
      name: "Bash",
      input: { command: "git status" },
      metadata: { isSubagent: true },
    });
  });

  it("parses assistant tool_use via parseClaudeJsonl", () => {
    const line = JSON.stringify({
      type: "progress",
      data: {
        message: {
          type: "assistant",
          message: {
            content: [
              {
                type: "tool_use",
                name: "Read",
                input: { file_path: "/path/file.ts" },
              },
            ],
          },
        },
      },
    });
    expect(parseClaudeJsonl(line)).toEqual({
      type: "tool_call",
      name: "Read",
      input: { file_path: "/path/file.ts" },
      metadata: { isSubagent: true },
    });
  });

  it("parses user tool_result as subagent tool_result", () => {
    const data = makeProgressData({
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "abc",
            content: [{ type: "text", text: "file contents" }],
          },
        ],
      },
    });
    expect(parseProgressEvent(data)).toEqual({
      type: "tool_result",
      output: "file contents",
      metadata: { isSubagent: true },
    });
  });

  it("parses assistant text block as subagent text", () => {
    const data = makeProgressData({
      type: "assistant",
      message: {
        content: [{ type: "text", text: "I'll check the file." }],
      },
    });
    expect(parseProgressEvent(data)).toEqual({
      type: "text",
      role: "assistant",
      content: "I'll check the file.",
      metadata: { isSubagent: true },
    });
  });

  it("returns null for progress event without data.message", () => {
    expect(parseProgressEvent({ type: "progress", data: {} })).toBeNull();
    expect(parseProgressEvent({ type: "progress" })).toBeNull();
  });

  it("returns null for progress event with unknown message type", () => {
    const data = makeProgressData({
      type: "system",
      message: { content: [{ type: "text", text: "hello" }] },
    });
    expect(parseProgressEvent(data)).toBeNull();
  });

  it("truncates tool_result content exceeding 500 characters", () => {
    const longText = "x".repeat(600);
    const data = makeProgressData({
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "abc",
            content: [{ type: "text", text: longText }],
          },
        ],
      },
    });
    const result = parseProgressEvent(data);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("tool_result");
    if (result?.type === "tool_result") {
      expect(typeof result.output).toBe("string");
      const output = result.output as string;
      expect(output.length).toBe(503); // 500 chars + "..."
      expect(output.endsWith("...")).toBe(true);
    }
  });

  it("handles tool_result with string content", () => {
    const data = makeProgressData({
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "abc",
            content: "plain string output",
          },
        ],
      },
    });
    expect(parseProgressEvent(data)).toEqual({
      type: "tool_result",
      output: "plain string output",
      metadata: { isSubagent: true },
    });
  });
});
