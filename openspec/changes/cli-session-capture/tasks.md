## 1. Agent Adapter Interface + Registry

- [ ] 1.1 Create `packages/cli/src/adapters/types.ts` — AgentAdapter interface, AgentMessage discriminated union, SpawnOptions type
- [ ] 1.2 Create `packages/cli/src/adapters/registry.ts` — adapter registry mapping tool names to implementations, lookup function, list available
- [ ] 1.3 Write tests for registry — lookup by name, unknown tool returns null, list available

## 2. Claude Code Adapter

- [ ] 2.1 Create `packages/cli/src/adapters/claude.ts` — spawn with `--output-format stream-json`, parse JSON lines
- [ ] 2.2 Implement parseMessage for Claude output types: assistant text, tool_use, tool_result, error
- [ ] 2.3 Implement isAvailable — check `claude --version`
- [ ] 2.4 Register Claude adapter in registry
- [ ] 2.5 Write tests for Claude message parsing (mock JSON lines)

## 3. Codex Adapter

- [ ] 3.1 Create `packages/cli/src/adapters/codex.ts` — spawn with `--full-stdout`, parse output
- [ ] 3.2 Implement parseMessage for Codex output format
- [ ] 3.3 Implement isAvailable — check `codex --version`
- [ ] 3.4 Register Codex adapter in registry
- [ ] 3.5 Write tests for Codex message parsing

## 4. Session Sync Pipeline

- [ ] 4.1 Create `packages/cli/src/sync/session-sync.ts` — SessionSync class with start, addMessage, end methods
- [ ] 4.2 Implement lazy session creation — create on first message via API client
- [ ] 4.3 Implement message mapping — AgentMessage → server message format (role + content)
- [ ] 4.4 Implement session end — update session status to "ended" on process exit
- [ ] 4.5 Implement error tolerance — catch and log API failures, never interrupt the tool
- [ ] 4.6 Write tests for session sync — lazy creation, message mapping, error tolerance

## 5. API Client Extensions

- [ ] 5.1 Add `createSession` method to CLI API client
- [ ] 5.2 Add `addMessage` method to CLI API client
- [ ] 5.3 Add `updateSession` method to CLI API client

## 6. Updated wapi run Command

- [ ] 6.1 Rewrite `packages/cli/src/commands/wrap.ts` — use adapter registry, spawn via adapter, pipe stdout through line reader
- [ ] 6.2 Implement JSON line reader — read child process stdout line by line, parse each via adapter
- [ ] 6.3 Wire up SessionSync — create sync instance, feed AgentMessages, end on process exit
- [ ] 6.4 Pass through extra CLI arguments to the adapter's spawn
- [ ] 6.5 Handle unknown tool name — display error with available adapters list
- [ ] 6.6 Handle tool not installed — display error with install instructions

## 7. Integration Testing

- [ ] 7.1 Write test for full pipeline: mock adapter → SessionSync → mock API client → verify API calls
- [ ] 7.2 Write test for error tolerance: API client throws → tool continues running
