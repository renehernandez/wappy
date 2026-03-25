## ADDED Requirements

### Requirement: Claude Code adapter
The system SHALL provide a Claude Code adapter that launches `claude` with `--output-format stream-json` and parses the JSON line output into AgentMessage events.

#### Scenario: Launch Claude in structured mode
- **WHEN** the Claude adapter spawns the tool with user args `["--model", "opus"]`
- **THEN** it SHALL run `claude --output-format stream-json --model opus` and return the child process

#### Scenario: Parse assistant text
- **WHEN** Claude outputs a JSON line with type `assistant` and text content
- **THEN** the adapter SHALL emit `{ type: "text", role: "assistant", content: "<text>" }`

#### Scenario: Parse tool use
- **WHEN** Claude outputs a JSON line indicating a tool call
- **THEN** the adapter SHALL emit `{ type: "tool_call", name: "<tool>", input: <json> }`

#### Scenario: Parse tool result
- **WHEN** Claude outputs a JSON line with a tool result
- **THEN** the adapter SHALL emit `{ type: "tool_result", output: <json> }`

#### Scenario: Parse error
- **WHEN** Claude outputs a JSON line indicating an error
- **THEN** the adapter SHALL emit `{ type: "error", message: "<error>" }`

#### Scenario: Unknown message type
- **WHEN** Claude outputs a JSON line with an unrecognized type
- **THEN** the adapter SHALL return null (skip it)

### Requirement: Claude availability check
The adapter SHALL check if `claude` is in PATH by attempting `claude --version`.

#### Scenario: Claude installed
- **WHEN** `claude --version` succeeds
- **THEN** `isAvailable()` SHALL return true

#### Scenario: Claude not installed
- **WHEN** `claude --version` fails or command not found
- **THEN** `isAvailable()` SHALL return false
