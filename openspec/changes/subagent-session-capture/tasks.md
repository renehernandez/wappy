## 1. AgentMessage Type Changes

- [x] 1.1 Add optional `metadata?: Record<string, unknown>` to `tool_call` variant in `packages/cli/src/adapters/types.ts`
- [x] 1.2 Add optional `metadata?: Record<string, unknown>` to `tool_result` variant in `packages/cli/src/adapters/types.ts`

## 2. JSONL Parser: Progress Event Parsing

- [x] 2.1 Remove `"progress"` from `INTERNAL_TYPES` set in `packages/cli/src/sync/jsonl-tailer.ts`
- [x] 2.2 Add `parseProgressEvent(data)` function that extracts subagent messages from `data.message`
- [x] 2.3 Handle assistant messages with `tool_use` blocks: emit as `tool_call` with `metadata: { isSubagent: true }`
- [x] 2.4 Handle user messages with `tool_result` blocks: emit as `tool_result` with truncated content (500 chars) and `metadata: { isSubagent: true }`
- [x] 2.5 Handle assistant messages with text blocks: emit as `text` with `metadata: { isSubagent: true }`
- [x] 2.6 Return null for progress events without `data.message` or with unrecognized structure
- [x] 2.7 Wire `parseProgressEvent` into the main `parseClaudeJsonl` function for `type === "progress"`
- [x] 2.8 Add tests: progress with tool_use, progress with tool_result, progress with text, progress without data.message, progress with unknown type, tool_result truncation

## 3. SessionSync: Forward Metadata on Tool Messages

- [x] 3.1 Update `mapMessage` in `packages/cli/src/sync/session-sync.ts` to forward `metadata` from `tool_call` messages
- [x] 3.2 Update `mapMessage` to forward `metadata` from `tool_result` messages
- [x] 3.3 Add test: tool_call with metadata produces metadata in mapped output
- [x] 3.4 Add test: tool_result with metadata produces metadata in mapped output

## 4. UI: Subagent Message Grouping

- [x] 4.1 Update `MessageThread.tsx` to group consecutive messages with `metadata.isSubagent === true` into arrays
- [x] 4.2 Create `SubagentGroup` component: collapsed by default, header shows agent name + step count, chevron toggle
- [x] 4.3 Extract agent name from the preceding Agent tool_call message content (parse JSON for tool name)
- [x] 4.4 Create `SubagentStep` component: compact single-line rendering for tool calls (`name: input_summary`), tool results (truncated content), and text (first line)
- [x] 4.5 Update Agent tool card (existing `ToolBubble`) to show step count when followed by subagent messages

## 5. Validation

- [x] 5.1 Run `pnpm test` and fix any failures
- [x] 5.2 Run `pnpm typecheck` and verify no errors
- [x] 5.3 Run `pnpm build` and verify build succeeds
- [ ] 5.4 Manual test: capture a session with subagent calls via `wappy run claude`, verify subagent steps appear in the deployed dashboard (requires manual verification)
