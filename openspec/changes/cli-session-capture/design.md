## Context

The WAPI CLI has `wapi run <command>` which spawns AI tools but captures nothing. Phase 2 delivered session/message server endpoints. This change wires them together — the CLI launches tools in structured output mode, captures messages, and POSTs them to the server in real-time.

Inspired by happy (SDK mode per tool) and hapi (AgentRegistry with AgentBackend interface). We adopt hapi's adapter pattern with a simpler interface.

## Goals / Non-Goals

**Goals:**
- AgentAdapter interface: launch tool, parse output, detect availability
- Claude Code adapter using `--output-format stream-json`
- Codex adapter for structured output
- Adapter registry mapping tool names to implementations
- Session sync: create session → stream messages → end session
- `wapi run claude` creates a real session with real messages on the server

**Non-Goals:**
- Remote control (sending input to the tool from the browser — happy's signature feature)
- OpenCode adapter (defer until the adapter pattern is proven)
- PTY capture (tools provide structured output, no need for terminal emulation)
- Offline buffering (if server is unreachable, messages are lost — add in a future change)

## Decisions

### 1. AgentAdapter interface over class hierarchy

**Choice**: Simple interface with 4 methods. Adapters are plain objects, not classes.

```ts
interface AgentAdapter {
  name: string;
  spawn(args: string[], opts: SpawnOptions): ChildProcess;
  parseMessage(line: string): AgentMessage | null;
  isAvailable(): Promise<boolean>;
}
```

**Alternatives considered**:
- *Class hierarchy (like hapi)*: `AgentBackend` abstract class with `initialize`, `newSession`, `prompt`, etc. More features but more complex.
- *Plugin system*: Dynamic loading from npm packages. Over-engineered for 2-3 adapters.

**Rationale**: Minimal interface. Each adapter knows how to spawn its tool and parse its output. The sync pipeline handles the rest.

### 2. Claude adapter uses --output-format stream-json

**Choice**: Launch `claude --output-format stream-json` which outputs newline-delimited JSON to stdout. Each line is a message event (text, tool_use, tool_result, etc.).

**Alternatives considered**:
- *--sdk-mode (like happy)*: More control but requires bidirectional communication. We're read-only for now.
- *File watching (~/.claude/)*: Post-hoc, not real-time.

**Rationale**: `--output-format stream-json` is the simplest structured output mode. Read-only, one JSON line per event. Perfect for capture.

### 3. Sync pipeline as a separate module

**Choice**: `sync/session-sync.ts` manages the session lifecycle independently from the adapter. It receives `AgentMessage` events and translates them to server API calls.

**Alternatives considered**:
- *Adapter handles sync*: Each adapter POSTs messages directly. Duplicated logic across adapters.
- *Message queue with batching*: Buffer messages and POST in batches. Better throughput but adds latency.

**Rationale**: Separation of concerns. Adapter outputs normalized messages. Sync pipeline handles server communication. Easy to add batching later without changing adapters.

### 4. Session lifecycle: create on first message, end on process exit

**Choice**: Don't create the session on the server until the first `AgentMessage` arrives. End the session when the child process exits.

**Alternatives considered**:
- *Create session immediately on spawn*: Session exists even if tool fails to start. Leaves empty sessions on the server.
- *Create session before spawn, clean up on failure*: Requires cleanup logic for abandoned sessions.

**Rationale**: Lazy creation avoids empty sessions from failed launches. The tool must produce at least one message before a session is created.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Claude Code --output-format stream-json changes format | Pin to known format, parse defensively, log unknown message types |
| Codex structured output format undocumented | Research current codex CLI flags. Start with best-effort parser. |
| Server unreachable during session | Log warning, continue running the tool. Messages are lost but tool still works. |
| Message POST latency slows tool | POST is fire-and-forget (no await on the tool's I/O loop). Tool output is never blocked by network. |
