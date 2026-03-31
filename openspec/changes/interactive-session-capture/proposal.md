## Why

The `wappy run claude` command only works in `--print` (non-interactive) mode because it relies on `--output-format stream-json` to capture structured output via stdout piping. Interactive Claude sessions — the primary way developers use Claude Code — cannot be captured or synced across devices. This defeats wappy's core purpose of cross-device session sync.

## What Changes

- Add interactive session capture by tailing Claude's local JSONL session files (`~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`) instead of piping stdout
- Detect `--print` vs interactive mode in the Claude adapter and branch behavior accordingly
- In interactive mode: pass `--session-id` to Claude, use `stdio: "inherit"` for full TUI passthrough, and tail the JSONL file for structured data capture
- In print mode: keep current `--output-format stream-json` stdout capture behavior
- Update `AgentAdapter.spawn()` return type to `{ child, sessionId? }` so the caller can set up JSONL tailing when needed
- Add a JSONL tailing module (`fs.watch` + readline) that parses Claude's session file format and maps entries to `AgentMessage`
- Update `wrap.ts` to orchestrate both capture modes

## Capabilities

### New Capabilities

- `jsonl-tailer`: File watcher and parser for Claude's local JSONL session files. Watches for new lines, parses Claude's event types (user, assistant, tool_use, system), and maps them to AgentMessage for sync.

### Modified Capabilities

- `agent-adapter`: `spawn()` return type changes from `ChildProcess` to `{ child: ChildProcess, sessionId?: string }` to support JSONL tailing in interactive mode.
- `claude-adapter`: Detects `--print` vs interactive mode. Interactive mode injects `--session-id`, uses `stdio: "inherit"`, skips `--output-format stream-json`.
- `cli-wrap`: Branches on print vs interactive mode. Interactive mode sets up JSONL tailer instead of stdout readline. Print mode retains current behavior with stdout text printing.

## Impact

- **CLI package**: `packages/cli/src/adapters/types.ts`, `claude.ts`, `codex.ts` (return type change), `commands/wrap.ts`, new `sync/jsonl-tailer.ts`
- **Wire package**: No changes (AgentMessage types are sufficient)
- **App**: No changes (server receives the same session/message payloads)
- **Dependencies**: No new dependencies (`fs.watch`, `readline` are Node built-ins)
- **Breaking**: Codex adapter must also return `{ child }` to match the new interface (no sessionId needed)
