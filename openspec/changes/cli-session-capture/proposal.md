## Why

The `wapi run` command currently spawns AI tools with stdio inherited but captures nothing. The CLI needs to actually capture session data from AI coding tools and sync it to the WAPI server. This is the core value proposition — use any AI coding tool from the terminal, see the session in the browser.

## What Changes

- Define an `AgentAdapter` interface for tool-agnostic session capture. Each AI tool gets an adapter that knows how to launch it in SDK/structured mode and parse its output into normalized messages.
- Implement Claude Code adapter — launches `claude` with `--output-format stream-json`, reads JSON lines from stdout, parses into normalized messages
- Implement Codex adapter — launches `codex` with `--full-stdout`, parses its JSON output
- Build session sync pipeline — creates a session on the server when the tool starts, POSTs messages incrementally as they arrive, updates session status on exit
- Replace the stub `wapi run` with the real adapter-based implementation
- Add adapter registry mapping tool names to adapters

## Capabilities

### New Capabilities
- `agent-adapter`: AgentAdapter interface and registry pattern for tool-agnostic session capture. Maps tool names to adapters, provides launch/parse/availability contract.
- `claude-adapter`: Claude Code adapter using `--output-format stream-json` for structured JSON output. Parses assistant text, tool calls, tool results, and errors.
- `codex-adapter`: Codex adapter for structured output capture. Parses codex-specific JSON format.
- `session-sync`: Session sync pipeline — creates session on server, streams messages via HTTP POST, handles buffering, retries, and session lifecycle (start → running → ended).

### Modified Capabilities
- `cli-wrap`: Updated from stub to real adapter-based implementation

## Impact

- **CLI package**: New `adapters/` directory with adapter interface, registry, and two implementations
- **CLI sync**: New `sync/` directory with session creation, message posting, and lifecycle management
- **wrap.ts**: Rewritten to use adapter registry instead of raw execa
- **API client**: Extended with session and message endpoints (createSession, addMessage)
- **Server**: No changes — CLI uses existing HTTP endpoints from Phase 2
- **Dependencies**: No new deps — uses existing `execa` for process spawning
