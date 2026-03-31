## MODIFIED Requirements

### Requirement: Parse Claude JSONL event types
The tailer SHALL parse Claude's JSONL event types and map recognized types to AgentMessage. The `progress` type SHALL be parsed for subagent messages. Types `file-history-snapshot`, `queue-operation`, and `last-prompt` SHALL be skipped.

#### Scenario: Progress event with assistant tool_use
- **WHEN** a JSONL line has `type: "progress"` with `data.message.type: "assistant"` containing a tool_use block
- **THEN** the tailer SHALL emit a `tool_call` AgentMessage with `metadata: { isSubagent: true }`

#### Scenario: Progress event with tool_result
- **WHEN** a JSONL line has `type: "progress"` with `data.message.type: "user"` containing a tool_result block
- **THEN** the tailer SHALL emit a `tool_result` AgentMessage with `metadata: { isSubagent: true }`

#### Scenario: Progress event with assistant text
- **WHEN** a JSONL line has `type: "progress"` with `data.message.type: "assistant"` containing text content
- **THEN** the tailer SHALL emit a `text` AgentMessage with `role: "assistant"` and `metadata: { isSubagent: true }`

#### Scenario: Progress event without data.message
- **WHEN** a JSONL line has `type: "progress"` without a `data.message` field
- **THEN** the tailer SHALL skip it (return null)

#### Scenario: Skip internal types
- **WHEN** a JSONL line has type `file-history-snapshot`, `queue-operation`, or `last-prompt`
- **THEN** the tailer SHALL skip it (return null)
