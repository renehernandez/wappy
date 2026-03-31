## Context

Claude Code records subagent activity as `progress` events in the parent session's JSONL file. Each progress event wraps a subagent message in `data.message` with standard Claude message structure (assistant with tool_use blocks, user with tool_result blocks). These events appear between the Agent tool_use and its toolUseResult. Currently, `parseClaudeJsonl` skips all `progress` events via the `INTERNAL_TYPES` set.

The existing metadata pipeline (added for skill/command/task-notification collapsing) carries optional `metadata` on `text` AgentMessages through to the server and UI. The `tool_call` and `tool_result` variants don't have metadata yet.

## Goals / Non-Goals

**Goals:**
- Capture subagent tool calls and results from progress events
- Display them in the session view grouped under the Agent tool card
- Collapsed by default to keep the view clean
- Show enough detail to understand what the subagent did (tool name, brief content)

**Non-Goals:**
- Capturing subagent reasoning/thinking in full (just tool calls and results)
- Linking to separate subagent sessions (they don't exist as separate entities)
- Real-time streaming of subagent progress (captured after-the-fact from JSONL)

## Decisions

### Decision 1: Parse progress events selectively

Remove `"progress"` from `INTERNAL_TYPES` but don't treat all progress events as messages. Only parse progress events that contain `data.message` with recognizable types (assistant with tool_use, user with tool_result). Skip progress events without `data.message` or with unknown structure.

**Why**: Progress events may contain other internal data (spinners, status updates). Only extracting tool-related events keeps the message stream clean.

### Decision 2: Add metadata to tool_call and tool_result AgentMessage variants

Extend the `AgentMessage` discriminated union so `tool_call` and `tool_result` also accept optional `metadata`. This allows tagging them with `{ isSubagent: true }`.

**Why**: The metadata field is the established pattern for carrying classification data through the pipeline. Extending it to other variants is consistent.

### Decision 3: UI grouping via consecutive isSubagent messages

The `MessageThread` component groups consecutive messages with `metadata.isSubagent === true` into a collapsible section. The section header shows the Agent tool name and count of subagent steps. Each step renders as a compact single-line item.

**Why**: Grouping in the UI layer (not the data layer) keeps the server/storage simple — messages are stored individually. The UI uses metadata to decide how to render.

**Alternative considered**: Bundling subagent messages into a single JSON blob on the server. Rejected — loses granularity and requires a custom message format.

### Decision 4: Compact subagent step rendering

Subagent tool calls show as: `tool_name: brief_content` (e.g., `Read: /path/to/file.ts`, `Bash: git status`). Tool results show content truncated to ~100 chars. No full markdown rendering for subagent steps.

**Why**: Subagent steps are diagnostic/informational. Full rendering would overwhelm the view. Users who need detail can click to expand the raw content.

## Risks / Trade-offs

- **Message volume** → A single subagent call can generate 50+ progress events, each becoming a message. This increases API calls and storage. Mitigation: messages are small (tool names + brief content), and the metadata pipeline is already proven.
- **Progress event format changes** → Claude's progress event structure is undocumented. Mitigation: parser gracefully skips unrecognized progress events.
- **UI complexity** → Grouping consecutive subagent messages requires state in MessageThread. Mitigation: simple reduce/group-by logic, no complex state management.
