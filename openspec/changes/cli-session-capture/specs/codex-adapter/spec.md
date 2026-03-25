## ADDED Requirements

### Requirement: Codex adapter
The system SHALL provide a Codex adapter that launches `codex` with `--full-stdout` (or equivalent structured output flag) and parses its output into AgentMessage events.

#### Scenario: Launch Codex in structured mode
- **WHEN** the Codex adapter spawns the tool with user args
- **THEN** it SHALL run `codex --full-stdout <args>` and return the child process

#### Scenario: Parse Codex text output
- **WHEN** Codex outputs structured text content
- **THEN** the adapter SHALL emit `{ type: "text", role: "assistant", content: "<text>" }`

#### Scenario: Parse Codex tool execution
- **WHEN** Codex outputs a tool execution event
- **THEN** the adapter SHALL emit the appropriate `tool_call` or `tool_result` AgentMessage

### Requirement: Codex availability check
The adapter SHALL check if `codex` is in PATH.

#### Scenario: Codex installed
- **WHEN** `codex --version` succeeds
- **THEN** `isAvailable()` SHALL return true

#### Scenario: Codex not installed
- **WHEN** `codex` is not found
- **THEN** `isAvailable()` SHALL return false
