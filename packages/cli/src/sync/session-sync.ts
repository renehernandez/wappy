import consola from "consola";
import type { AgentMessage } from "../adapters/types";
import type { ApiClient } from "../api";

export class SessionSync {
  private sessionId: string | null = null;
  private sessionVersion = 1;
  private started = false;

  constructor(
    private api: ApiClient,
    private agentType: string,
    private machineId?: string,
  ) {}

  async handleMessage(msg: AgentMessage): Promise<void> {
    // Create session lazily on first message
    if (!this.started) {
      this.started = true;
      try {
        const session = await this.api.createSession({
          agentType: this.agentType,
          machineId: this.machineId,
        });
        this.sessionId = session.id;
        this.sessionVersion = session.version;
        consola.debug(`Session created: ${this.sessionId}`);
      } catch (err) {
        consola.warn(
          `Failed to create session: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
    }

    if (!this.sessionId) return;

    const mapped = this.mapMessage(msg);
    if (!mapped) return;

    try {
      await this.api.addMessage(this.sessionId, mapped);
    } catch (err) {
      consola.debug(
        `Failed to sync message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async end(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await this.api.updateSession(this.sessionId, {
        status: "ended",
        expectedVersion: this.sessionVersion,
      });
      consola.debug(`Session ended: ${this.sessionId}`);
    } catch (err) {
      consola.debug(
        `Failed to end session: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private mapMessage(msg: AgentMessage): {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    metadata?: string;
  } | null {
    switch (msg.type) {
      case "text":
        return {
          role: msg.role,
          content: msg.content,
          ...(msg.metadata ? { metadata: JSON.stringify(msg.metadata) } : {}),
        };
      case "tool_call":
        return {
          role: "tool",
          content: JSON.stringify({
            type: "tool_call",
            name: msg.name,
            input: msg.input,
          }),
        };
      case "tool_result":
        return {
          role: "tool",
          content: JSON.stringify({ type: "tool_result", output: msg.output }),
        };
      case "error":
        return { role: "system", content: `Error: ${msg.message}` };
      case "thinking":
        return { role: "assistant", content: msg.content };
      case "turn_complete":
        return null;
    }
  }
}
