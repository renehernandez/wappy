## Context

The `wappy run claude` command currently captures session data by piping Claude's stdout in `--output-format stream-json` mode. This only works with `--print` (non-interactive) because `--output-format` requires `--print`. Interactive Claude sessions — the primary usage mode — cannot be captured.

Claude Code stores complete structured session transcripts locally at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. Each line is a JSON object with types like `user`, `assistant`, `system`, `file-history-snapshot`, etc. Assistant messages include full content blocks (text, tool_use), token usage, model info, and metadata. This is richer data than `stream-json` provides.

## Goals / Non-Goals

**Goals:**
- Capture interactive Claude sessions for cross-device sync via wappy server
- Preserve the full Claude TUI experience (no visual degradation)
- Keep `--print` mode working as-is (stdout stream-json capture)
- Single entry point: `wappy run claude` handles both modes transparently

**Non-Goals:**
- Importing past sessions not started through wappy (future work)
- Supporting other tools' JSONL formats (Codex doesn't write JSONL)
- Real-time keystroke-level capture (we capture at message granularity)
- Modifying the wappy server/app — the existing session/message API is sufficient

## Decisions

### Decision 1: Detect mode by presence of `--print` / `-p` in args

The Claude adapter inspects the user-provided args for `--print` or `-p`. If present, use current stdout piping with `--output-format stream-json`. If absent, use interactive mode with JSONL tailing.

**Why**: Simple, explicit, no heuristics. The `--print` flag is the canonical way Claude distinguishes interactive vs non-interactive.

**Alternative considered**: Always use JSONL tailing for both modes. Rejected because `--print` mode benefits from real-time stdout parsing (lower latency, no filesystem dependency), and JSONL tailing adds unnecessary complexity for a mode that already works.

### Decision 2: Inject `--session-id` in interactive mode

Generate a UUID and pass `--session-id <uuid>` to Claude. This lets wappy know exactly which JSONL file to tail: `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl`.

**Why**: Without a known session ID, wappy would need to watch the entire projects directory for new files and guess which one belongs to this session. Injecting the ID is deterministic.

**Alternative considered**: Watch for the newest `.jsonl` file in the projects directory. Rejected — race-prone if multiple Claude sessions run concurrently.

### Decision 3: Return `{ child, sessionId? }` from `spawn()`

Change `AgentAdapter.spawn()` to return an object instead of a bare `ChildProcess`. The `sessionId` field is populated only when the adapter uses JSONL tailing (interactive Claude). The codex adapter returns `{ child }` with no sessionId.

**Why**: The caller (`wrap.ts`) needs the session ID to set up the JSONL tailer. Returning it from `spawn()` keeps the adapter as the single source of truth for how the tool is launched.

### Decision 4: `fs.watch` + byte-offset read for JSONL tailing

Use `fs.watch` on the session file to detect changes, then read new bytes from the last-known offset using `fs.createReadStream({ start: offset })`. Split by newlines, parse each as JSON, map to `AgentMessage`.

**Why**: Low overhead, no polling, works with Node built-ins. `fs.watch` is reliable on macOS (uses FSEvents) and Linux (uses inotify).

**Alternative considered**: Polling with `setInterval` + `fs.stat`. Rejected — less responsive, wastes CPU. `fs.watch` is simpler and event-driven.

**Alternative considered**: `fs.watchFile` (stat-based polling wrapper). Rejected — `fs.watch` is more efficient and sufficient here.

### Decision 5: Wait for file to appear before tailing

Claude creates the JSONL file on first user interaction, not at startup. The tailer polls for file existence with a short interval (200ms) and a timeout (30s). Once the file appears, it switches to `fs.watch`.

**Why**: There's a gap between spawning Claude and the first JSONL write. The tailer needs to handle this gracefully without erroring.

### Decision 6: Encode cwd path for JSONL directory lookup

Claude encodes the project path by replacing `/` with `-` (e.g., `/Users/foo/project` becomes `-Users-foo-project`). The tailer replicates this encoding to find the correct directory under `~/.claude/projects/`.

**Why**: Must match Claude's internal path encoding to locate the correct session file.

## Risks / Trade-offs

- **Undocumented JSONL format** → Claude's local storage format is not a public API. It could change between versions. Mitigation: the JSONL parser is isolated in a single module (`jsonl-tailer.ts`), making it easy to update. Add version detection from the JSONL `version` field.
- **File appearance delay** → If Claude takes too long to create the JSONL file (e.g., slow startup, MCP server init), the tailer timeout could fire. Mitigation: 30s timeout is generous; log a warning if exceeded.
- **Incomplete final read** → Claude might write the last message after the process exits but before the tailer does its final drain. Mitigation: after the child process exits, wait a short delay (500ms) then do a final read from the last offset.
- **macOS fs.watch reliability** → `fs.watch` can occasionally emit duplicate events on macOS. Mitigation: the byte-offset approach is idempotent — re-reading from the same offset produces no new lines if nothing was appended.
