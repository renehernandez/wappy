## MODIFIED Requirements

### Requirement: AgentAdapter interface
The system SHALL define an AgentAdapter interface with methods: `spawn(args, opts)` to launch the tool, `parseMessage(line)` to parse a line of output into a normalized AgentMessage, and `isAvailable()` to check if the tool is installed. The `spawn` method SHALL return `{ child: ChildProcess, sessionId?: string }` instead of a bare `ChildProcess`. The `sessionId` field SHALL be present when the adapter uses JSONL file tailing for capture (e.g., interactive Claude sessions) and absent otherwise.

#### Scenario: Adapter spawns tool
- **WHEN** the CLI calls `adapter.spawn(["--model", "opus"], { cwd: "/project" })`
- **THEN** the adapter SHALL return `{ child: ChildProcess, sessionId?: string }` with the tool running

#### Scenario: Adapter spawns interactive Claude
- **WHEN** the CLI calls `adapter.spawn([], { cwd: "/project" })` with no `--print` flag
- **THEN** the adapter SHALL return `{ child, sessionId: "<uuid>" }` where sessionId identifies the JSONL file to tail

#### Scenario: Adapter spawns print-mode Claude
- **WHEN** the CLI calls `adapter.spawn(["--print", "hello"], { cwd: "/project" })`
- **THEN** the adapter SHALL return `{ child }` with no sessionId (stdout capture is used instead)

#### Scenario: Adapter parses output
- **WHEN** a line of JSON output is passed to `adapter.parseMessage(line)`
- **THEN** the adapter SHALL return a normalized `AgentMessage` or null if the line is not a recognized message

#### Scenario: Adapter checks availability
- **WHEN** `adapter.isAvailable()` is called
- **THEN** the adapter SHALL return true if the tool binary exists in PATH, false otherwise
