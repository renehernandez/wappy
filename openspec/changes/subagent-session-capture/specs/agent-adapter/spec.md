## MODIFIED Requirements

### Requirement: AgentMessage normalized type
The system SHALL define a normalized AgentMessage discriminated union: `text` (role + content + metadata?), `tool_call` (name + input + metadata?), `tool_result` (output + metadata?), `thinking` (content), `turn_complete`, `error` (message). The `metadata` field SHALL be optional on `text`, `tool_call`, and `tool_result` variants.

#### Scenario: Text message with metadata
- **WHEN** the AI tool outputs an assistant text response with metadata
- **THEN** the adapter SHALL emit `{ type: "text", role: "assistant", content: "...", metadata: { ... } }`

#### Scenario: Tool call with metadata
- **WHEN** a subagent tool call is parsed from a progress event
- **THEN** the adapter SHALL emit `{ type: "tool_call", name: "Bash", input: {...}, metadata: { isSubagent: true } }`

#### Scenario: Tool result with metadata
- **WHEN** a subagent tool result is parsed from a progress event
- **THEN** the adapter SHALL emit `{ type: "tool_result", output: "...", metadata: { isSubagent: true } }`

#### Scenario: Tool call without metadata
- **WHEN** a regular (non-subagent) tool call is parsed
- **THEN** the adapter SHALL emit `{ type: "tool_call", name: "...", input: {...} }` without metadata
