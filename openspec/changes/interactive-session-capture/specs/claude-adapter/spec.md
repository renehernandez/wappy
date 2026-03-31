## MODIFIED Requirements

### Requirement: Claude Code adapter
The system SHALL provide a Claude Code adapter that supports two modes based on the presence of `--print` / `-p` in the user-provided args:

**Print mode** (`--print` present): Launch `claude` with `--output-format stream-json --verbose`, pipe stdout for JSON event parsing. Return `{ child }` with no sessionId.

**Interactive mode** (no `--print`): Launch `claude` with `--verbose --session-id <uuid>` and `stdio: "inherit"` for full TUI passthrough. Return `{ child, sessionId: "<uuid>" }` so the caller can set up JSONL tailing.

#### Scenario: Launch Claude in print mode
- **WHEN** the Claude adapter spawns with args `["--print", "hello"]`
- **THEN** it SHALL run `claude --output-format stream-json --verbose --print hello` with stdout piped
- **AND** it SHALL return `{ child }` with no sessionId

#### Scenario: Launch Claude in interactive mode
- **WHEN** the Claude adapter spawns with args `["--model", "opus"]` (no `--print`)
- **THEN** it SHALL generate a UUID and run `claude --verbose --session-id <uuid> --model opus` with `stdio: "inherit"`
- **AND** it SHALL return `{ child, sessionId: "<uuid>" }`

#### Scenario: Detect -p short flag
- **WHEN** the Claude adapter spawns with args `["-p", "hello"]`
- **THEN** it SHALL detect print mode and behave as print mode

#### Scenario: Parse assistant text
- **WHEN** Claude outputs a JSON line with type `assistant` and text content
- **THEN** the adapter SHALL emit `{ type: "text", role: "assistant", content: "<text>" }`

#### Scenario: Parse tool use
- **WHEN** Claude outputs a JSON line indicating a tool call
- **THEN** the adapter SHALL emit `{ type: "tool_call", name: "<tool>", input: <json> }`

#### Scenario: Parse error
- **WHEN** Claude outputs a JSON line indicating an error
- **THEN** the adapter SHALL emit `{ type: "error", message: "<error>" }`

#### Scenario: Unknown message type
- **WHEN** Claude outputs a JSON line with an unrecognized type
- **THEN** the adapter SHALL return null (skip it)
