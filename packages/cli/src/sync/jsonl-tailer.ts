import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import consola from "consola";
import type { AgentMessage } from "../adapters/types";

const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 30_000;
const INTERNAL_TYPES = new Set([
  "file-history-snapshot",
  "queue-operation",
  "progress",
  "last-prompt",
]);

export function resolveSessionPath(cwd: string, sessionId: string): string {
  const normalizedCwd = cwd.replace(/\/$/, "");
  const encoded = normalizedCwd.replace(/[/.]/g, "-");
  return path.join(
    os.homedir(),
    ".claude",
    "projects",
    encoded,
    `${sessionId}.jsonl`,
  );
}

export function parseClaudeJsonl(line: string): AgentMessage | null {
  let data: any;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }

  if (!data || typeof data.type !== "string") {
    return null;
  }

  if (INTERNAL_TYPES.has(data.type)) {
    return null;
  }

  if (data.type === "user") {
    const content = data.message?.content;
    let text: string | null = null;
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const joined = content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text as string)
        .join("");
      if (joined) text = joined;
    }
    if (!text) return null;

    const metadata: Record<string, unknown> = {};
    if (data.isMeta) metadata.isMeta = true;
    if (data.origin) metadata.origin = data.origin;
    if (text.startsWith("<command-message>")) {
      const match = text.match(/<command-name>\/?([^<]+)<\/command-name>/);
      metadata.isCommand = true;
      if (match) metadata.commandName = match[1];
    }

    return {
      type: "text",
      role: "user",
      content: text,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    };
  }

  if (data.type === "assistant") {
    const content = data.message?.content;
    if (!Array.isArray(content)) {
      return null;
    }

    const textBlocks = content.filter((b: any) => b.type === "text");
    if (textBlocks.length > 0) {
      return {
        type: "text",
        role: "assistant",
        content: textBlocks.map((b: any) => b.text as string).join(""),
      };
    }

    const toolBlock = content.find((b: any) => b.type === "tool_use");
    if (toolBlock) {
      return {
        type: "tool_call",
        name: toolBlock.name as string,
        input: toolBlock.input ?? {},
      };
    }

    return null;
  }

  if (data.type === "system") {
    const summary = data.summary ?? data.content ?? data.message;
    if (typeof summary === "string" && summary.trim()) {
      return { type: "text", role: "system", content: summary };
    }
    return null;
  }

  return null;
}

export class JsonlTailer {
  private readonly filePath: string;
  private offset = 0;
  private partialLine = "";
  private watcher: fs.FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private onMessage: (msg: AgentMessage) => void;

  constructor(filePath: string, onMessage: (msg: AgentMessage) => void) {
    this.filePath = filePath;
    this.onMessage = onMessage;
    this.startPolling();
  }

  private startPolling(): void {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    this.pollTimer = setInterval(() => {
      if (this.stopped) {
        this.clearPollTimer();
        return;
      }

      if (fs.existsSync(this.filePath)) {
        this.clearPollTimer();
        this.startWatching();
        return;
      }

      if (Date.now() >= deadline) {
        this.clearPollTimer();
        consola.warn(
          `[jsonl-tailer] Session file did not appear within ${POLL_TIMEOUT_MS / 1000}s: ${this.filePath}`,
        );
      }
    }, POLL_INTERVAL_MS);
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startWatching(): void {
    // Do an initial read in case lines were already written before we started watching
    this.readNewBytes();

    try {
      this.watcher = fs.watch(this.filePath, () => {
        if (!this.stopped) {
          this.readNewBytes();
        }
      });
    } catch (err) {
      consola.warn(`[jsonl-tailer] fs.watch failed: ${err}`);
    }
  }

  private readNewBytes(): void {
    let content: string;
    try {
      const stat = fs.statSync(this.filePath);
      if (stat.size <= this.offset) {
        return;
      }
      const fd = fs.openSync(this.filePath, "r");
      const length = stat.size - this.offset;
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, this.offset);
      fs.closeSync(fd);
      this.offset = stat.size;
      content = buf.toString("utf8");
    } catch {
      return;
    }

    const combined = this.partialLine + content;
    const lines = combined.split("\n");

    // The last element is either empty (trailing newline) or a partial line
    this.partialLine = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const msg = parseClaudeJsonl(trimmed);
      if (msg) {
        this.onMessage(msg);
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.clearPollTimer();

    if (this.watcher) {
      // Final drain: read any bytes written after the last watch event
      this.readNewBytes();

      // Flush any remaining partial line
      if (this.partialLine.trim()) {
        const msg = parseClaudeJsonl(this.partialLine.trim());
        if (msg) {
          this.onMessage(msg);
        }
        this.partialLine = "";
      }

      this.watcher.close();
      this.watcher = null;
    }
  }
}
