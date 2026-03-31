## Why

When Claude Code spawns subagents (glab-review, Explore, implementer, etc.), all their tool calls and reasoning are recorded as `progress` events in the parent session's JSONL file. Wappy currently skips these events, so users viewing a session on another device only see "Agent: glab-review" as a collapsed tool call and the final relayed result — with no visibility into the 29+ intermediate tool uses the subagent performed. This makes it impossible to understand what the subagent actually did.

## What Changes

- Remove `"progress"` from the JSONL parser's `INTERNAL_TYPES` skip list
- Parse each `progress` event's `data.message` to extract subagent tool calls (`tool_use` blocks), tool results (`tool_result` blocks), and assistant reasoning (text blocks)
- Emit these as individual `AgentMessage` objects with `metadata: { isSubagent: true }` so the pipeline can distinguish them from parent session messages
- Add optional `metadata` field to `tool_call` and `tool_result` AgentMessage variants (currently only `text` has it)
- Forward metadata through `SessionSync.mapMessage()` for tool_call and tool_result types
- UI groups consecutive subagent messages under the preceding Agent tool card, collapsed by default
- Subagent tool calls render as compact single-line items (e.g., `Bash: glab mr list...`)
- Agent tool card header shows summary: "Agent: glab-review (29 tool uses)" with expand/collapse

## Capabilities

### New Capabilities

- `progress-parser`: Parse Claude's JSONL `progress` events to extract subagent tool calls, tool results, and reasoning into AgentMessage objects with isSubagent metadata
- `subagent-ui`: UI component for grouping and displaying subagent messages as collapsible sections under Agent tool cards, with compact tool use summaries

### Modified Capabilities

- `agent-adapter`: Add optional `metadata` field to `tool_call` and `tool_result` AgentMessage variants
- `session-sync`: Forward metadata from `tool_call` and `tool_result` messages to the server
- `jsonl-tailer`: Remove `progress` from INTERNAL_TYPES, add progress event parsing logic

## Impact

- **CLI package**: `packages/cli/src/adapters/types.ts` (AgentMessage type), `packages/cli/src/sync/jsonl-tailer.ts` (progress parsing), `packages/cli/src/sync/session-sync.ts` (metadata forwarding)
- **App package**: `app/src/components/ui/MessageBubble.tsx` (subagent grouping UI), `app/src/components/MessageThread.tsx` (grouping logic)
- **Wire/Server**: No changes — existing metadata field handles the data
- **Dependencies**: None
