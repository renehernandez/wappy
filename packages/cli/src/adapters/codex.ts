import { spawn } from "node:child_process";
import { execaCommand } from "execa";
import type {
  AgentAdapter,
  AgentMessage,
  SpawnOptions,
  SpawnResult,
} from "./types";

function parseCodexMessage(line: string): AgentMessage | null {
  let data: any;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }

  // Codex outputs JSON events with a type field
  if (data.type === "message" && data.role === "assistant") {
    return {
      type: "text",
      role: "assistant",
      content: data.content ?? "",
    };
  }

  if (data.type === "message" && data.role === "user") {
    return {
      type: "text",
      role: "user",
      content: data.content ?? "",
    };
  }

  if (data.type === "function_call" || data.type === "tool_call") {
    return {
      type: "tool_call",
      name: data.name ?? data.function?.name ?? "unknown",
      input: data.arguments ?? data.input ?? {},
    };
  }

  if (data.type === "function_call_output" || data.type === "tool_result") {
    return {
      type: "tool_result",
      output: data.output ?? data.result ?? "",
    };
  }

  if (data.type === "error") {
    return {
      type: "error",
      message: data.message ?? "Unknown error",
    };
  }

  if (data.type === "completed" || data.type === "done") {
    return { type: "turn_complete" };
  }

  return null;
}

export const codexAdapter: AgentAdapter = {
  name: "codex",

  spawn(args: string[], opts: SpawnOptions): SpawnResult {
    const child = spawn("codex", ["--full-stdout", ...args], {
      cwd: opts.cwd,
      stdio: ["inherit", "pipe", "inherit"],
      env: { ...process.env, ...opts.env },
    });
    return { child };
  },

  parseMessage: parseCodexMessage,

  async isAvailable() {
    try {
      await execaCommand("codex --version");
      return true;
    } catch {
      return false;
    }
  },
};

export { parseCodexMessage };
