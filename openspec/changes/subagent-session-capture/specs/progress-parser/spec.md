## ADDED Requirements

### Requirement: Parse assistant tool_use from progress events
The system SHALL parse `progress` events where `data.message.type === "assistant"` and `data.message.message.content` contains `tool_use` blocks. Each tool_use block SHALL be emitted as a `tool_call` AgentMessage with `metadata: { isSubagent: true }`.

#### Scenario: Subagent makes a Bash tool call
- **WHEN** a progress event contains an assistant message with a `tool_use` block for tool "Bash"
- **THEN** the parser SHALL emit `{ type: "tool_call", name: "Bash", input: {...}, metadata: { isSubagent: true } }`

#### Scenario: Subagent makes a Read tool call
- **WHEN** a progress event contains an assistant message with a `tool_use` block for tool "Read"
- **THEN** the parser SHALL emit `{ type: "tool_call", name: "Read", input: {...}, metadata: { isSubagent: true } }`

### Requirement: Parse tool_result from progress events
The system SHALL parse `progress` events where `data.message.type === "user"` and `data.message.message.content` contains `tool_result` blocks. Each tool_result SHALL be emitted as a `tool_result` AgentMessage with `metadata: { isSubagent: true }`. The content SHALL be truncated to 500 characters to avoid storing large tool outputs.

#### Scenario: Subagent receives a tool result
- **WHEN** a progress event contains a user message with a `tool_result` block
- **THEN** the parser SHALL emit `{ type: "tool_result", output: <content>, metadata: { isSubagent: true } }`

#### Scenario: Large tool result is truncated
- **WHEN** a progress event contains a tool_result with content exceeding 500 characters
- **THEN** the parser SHALL truncate the content to 500 characters and append "..."

### Requirement: Parse assistant text from progress events
The system SHALL parse `progress` events where `data.message.type === "assistant"` and `data.message.message.content` contains text blocks (subagent reasoning). These SHALL be emitted as `text` AgentMessages with `role: "assistant"` and `metadata: { isSubagent: true }`.

#### Scenario: Subagent produces reasoning text
- **WHEN** a progress event contains an assistant message with text content
- **THEN** the parser SHALL emit `{ type: "text", role: "assistant", content: <text>, metadata: { isSubagent: true } }`

### Requirement: Skip unrecognized progress events
The system SHALL skip progress events that do not contain `data.message` or whose `data.message` does not match recognized patterns (assistant with tool_use/text, user with tool_result).

#### Scenario: Progress event without data.message
- **WHEN** a progress event has no `data.message` field
- **THEN** the parser SHALL return null (skip it)

#### Scenario: Progress event with unknown message type
- **WHEN** a progress event has `data.message.type` that is not "assistant" or "user"
- **THEN** the parser SHALL return null (skip it)
