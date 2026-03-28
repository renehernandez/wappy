import { spawn } from "node:child_process";
import { execaCommand } from "execa";
import type { AgentAdapter, AgentMessage, SpawnOptions } from "./types";

function parseClaudeMessage(line: string): AgentMessage | null {
  let data: any;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }

  // Claude --output-format stream-json emits various event types
  if (data.type === "assistant" && data.message?.content) {
    // Extract text from content blocks
    const textBlocks = Array.isArray(data.message.content)
      ? data.message.content.filter((b: any) => b.type === "text")
      : [];
    if (textBlocks.length > 0) {
      return {
        type: "text",
        role: "assistant",
        content: textBlocks.map((b: any) => b.text).join(""),
      };
    }
  }

  if (
    data.type === "content_block_delta" &&
    data.delta?.type === "text_delta"
  ) {
    return {
      type: "text",
      role: "assistant",
      content: data.delta.text,
    };
  }

  if (
    data.type === "content_block_start" &&
    data.content_block?.type === "tool_use"
  ) {
    return {
      type: "tool_call",
      name: data.content_block.name,
      input: data.content_block.input ?? {},
    };
  }

  if (data.type === "result") {
    if (data.subtype === "error_result") {
      return { type: "error", message: data.error ?? "Unknown error" };
    }
    return { type: "turn_complete" };
  }

  if (data.type === "error") {
    return {
      type: "error",
      message: data.error?.message ?? data.message ?? "Unknown error",
    };
  }

  // Unknown event type — skip
  return null;
}

export const claudeAdapter: AgentAdapter = {
  name: "claude",

  spawn(args: string[], opts: SpawnOptions) {
    return spawn(
      "claude",
      ["--output-format", "stream-json", "--verbose", ...args],
      {
        cwd: opts.cwd,
        stdio: ["inherit", "pipe", "inherit"],
        env: { ...process.env, ...opts.env },
      },
    );
  },

  parseMessage: parseClaudeMessage,

  async isAvailable() {
    try {
      await execaCommand("claude --version");
      return true;
    } catch {
      return false;
    }
  },
};

// Export for testing
export { parseClaudeMessage };
