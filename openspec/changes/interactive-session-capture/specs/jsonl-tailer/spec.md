## ADDED Requirements

### Requirement: JSONL session file path resolution
The system SHALL resolve the path to Claude's local JSONL session file by encoding the current working directory (replacing `/` with `-`) and combining it with the session ID: `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`.

#### Scenario: Resolve session file path
- **WHEN** the tailer is given cwd `/Users/rene/project` and session ID `abc-123`
- **THEN** it SHALL resolve the path to `~/.claude/projects/-Users-rene-project/abc-123.jsonl`

#### Scenario: Cwd with trailing slash
- **WHEN** the cwd is `/Users/rene/project/`
- **THEN** the trailing slash SHALL be stripped before encoding

### Requirement: Wait for file to appear
The tailer SHALL poll for the JSONL file's existence at 200ms intervals until it appears or a 30-second timeout is reached. Once the file appears, tailing begins.

#### Scenario: File appears within timeout
- **WHEN** the JSONL file is created within 30 seconds of tailer start
- **THEN** the tailer SHALL begin watching the file for new lines

#### Scenario: File does not appear within timeout
- **WHEN** the JSONL file does not exist after 30 seconds
- **THEN** the tailer SHALL emit a warning and stop without error (the session proceeds without capture)

### Requirement: Tail new lines via fs.watch
The tailer SHALL use `fs.watch` to detect file changes and read new bytes from the last-known byte offset. New bytes SHALL be split by newlines and each complete line parsed as JSON.

#### Scenario: New lines appended
- **WHEN** Claude appends new JSONL lines to the session file
- **THEN** the tailer SHALL read only the new bytes, parse each line, and emit parsed events

#### Scenario: Partial line at end of read
- **WHEN** a read ends mid-line (no trailing newline)
- **THEN** the tailer SHALL buffer the partial line and prepend it to the next read

#### Scenario: Duplicate fs.watch events
- **WHEN** `fs.watch` emits multiple change events for a single write
- **THEN** the tailer SHALL read from the current offset idempotently (no duplicate messages)

### Requirement: Parse Claude JSONL event types
The tailer SHALL parse Claude's JSONL event types and map recognized types to AgentMessage. Unrecognized types SHALL be skipped.

#### Scenario: Parse user message
- **WHEN** a JSONL line has `type: "user"` with `message.content` containing text
- **THEN** the tailer SHALL emit `{ type: "text", role: "user", content: "<text>" }`

#### Scenario: Parse assistant text message
- **WHEN** a JSONL line has `type: "assistant"` with `message.content` containing text blocks
- **THEN** the tailer SHALL emit `{ type: "text", role: "assistant", content: "<joined text>" }`

#### Scenario: Parse assistant tool use
- **WHEN** a JSONL line has `type: "assistant"` with `message.content` containing a `tool_use` block
- **THEN** the tailer SHALL emit `{ type: "tool_call", name: "<tool>", input: <json> }`

#### Scenario: Parse system event
- **WHEN** a JSONL line has `type: "system"`
- **THEN** the tailer SHALL emit `{ type: "text", role: "system", content: "<summary>" }` or skip if not meaningful

#### Scenario: Skip internal types
- **WHEN** a JSONL line has type `file-history-snapshot`, `queue-operation`, `progress`, or `last-prompt`
- **THEN** the tailer SHALL skip it (return null)

#### Scenario: Malformed JSON line
- **WHEN** a JSONL line is not valid JSON
- **THEN** the tailer SHALL skip it and continue processing subsequent lines

### Requirement: Final drain on stop
The tailer SHALL support a `stop()` method that performs a final read from the last offset to capture any lines written between the last `fs.watch` event and process exit, then closes the watcher.

#### Scenario: Final drain captures remaining lines
- **WHEN** `stop()` is called after the Claude process exits
- **THEN** the tailer SHALL read any remaining bytes from the last offset, parse them, and emit events before closing

#### Scenario: Stop when file never appeared
- **WHEN** `stop()` is called but the file never appeared
- **THEN** the tailer SHALL return immediately without error
