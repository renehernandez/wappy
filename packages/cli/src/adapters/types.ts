import type { ChildProcess } from "node:child_process";

export type AgentMessage =
  | { type: "text"; role: "user" | "assistant" | "system"; content: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; output: unknown }
  | { type: "thinking"; content: string }
  | { type: "turn_complete" }
  | { type: "error"; message: string };

export interface SpawnOptions {
  cwd: string;
  env?: Record<string, string>;
}

export interface SpawnResult {
  child: ChildProcess;
  sessionId?: string;
}

export interface AgentAdapter {
  name: string;
  spawn(args: string[], opts: SpawnOptions): SpawnResult;
  parseMessage(line: string): AgentMessage | null;
  isAvailable(): Promise<boolean>;
}
