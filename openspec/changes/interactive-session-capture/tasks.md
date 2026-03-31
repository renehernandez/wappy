## 1. Adapter Interface Change

- [x] 1.1 Update `SpawnResult` type in `packages/cli/src/adapters/types.ts`: change `spawn()` return from `ChildProcess` to `{ child: ChildProcess, sessionId?: string }`
- [x] 1.2 Update `codex.ts` adapter to return `{ child }` from `spawn()`
- [x] 1.3 Update existing tests in `adapters.test.ts` for the new return type

## 2. Claude Adapter Dual-Mode

- [x] 2.1 Add `isPrintMode(args)` helper that checks for `--print` or `-p` in args
- [x] 2.2 Update `claudeAdapter.spawn()`: print mode uses `--output-format stream-json` + stdout pipe; interactive mode uses `--session-id <uuid>` + `stdio: "inherit"`
- [x] 2.3 Add tests for print mode detection and both spawn paths

## 3. JSONL Tailer Module

- [x] 3.1 Create `packages/cli/src/sync/jsonl-tailer.ts` with `resolveSessionPath(cwd, sessionId)` function
- [x] 3.2 Implement `JsonlTailer` class: constructor takes path, starts polling for file existence (200ms interval, 30s timeout)
- [x] 3.3 Implement `fs.watch` + byte-offset reading with partial-line buffering
- [x] 3.4 Implement `parseClaudeJsonl(line)` to map Claude JSONL types (`user`, `assistant`, `system`) to `AgentMessage`, skipping internal types
- [x] 3.5 Implement `stop()` method with final drain read
- [x] 3.6 Add callback/event interface for emitting parsed `AgentMessage` events to the caller
- [x] 3.7 Add tests: path resolution, JSONL parsing for each message type, skip internal types, malformed JSON handling

## 4. Wrap Command Dual-Mode

- [x] 4.1 Update `wrap.ts` to destructure `{ child, sessionId }` from `adapter.spawn()`
- [x] 4.2 Branch on `sessionId` presence: if set, create `JsonlTailer` and wire events to `sync.handleMessage()`; if not, use existing stdout readline path
- [x] 4.3 On child exit: call `tailer.stop()` for final drain before `sync.end()`
- [x] 4.4 Keep existing print-mode stdout text printing (`process.stdout.write`) in the non-sessionId branch
- [ ] 4.5 Add integration-style test for interactive mode flow (mock fs.watch + JSONL file writes)

## 5. Validation

- [x] 5.1 Run full test suite (`pnpm test`) and fix any failures
- [x] 5.2 Build CLI (`pnpm build`) and verify no build errors
- [x] 5.3 Manual test: `wappy run claude -- --print "hello"` works as before
- [ ] 5.4 Manual test: `wappy run claude` launches interactive TUI and syncs messages to server (requires manual verification)
