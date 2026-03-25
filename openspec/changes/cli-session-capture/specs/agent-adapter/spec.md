## ADDED Requirements

### Requirement: AgentAdapter interface
The system SHALL define an AgentAdapter interface with methods: `spawn(args, opts)` to launch the tool in structured output mode, `parseMessage(line)` to parse a line of output into a normalized AgentMessage, and `isAvailable()` to check if the tool is installed.

#### Scenario: Adapter spawns tool
- **WHEN** the CLI calls `adapter.spawn(["--model", "opus"], { cwd: "/project" })`
- **THEN** the adapter SHALL return a ChildProcess with the tool running in structured output mode

#### Scenario: Adapter parses output
- **WHEN** a line of JSON output is passed to `adapter.parseMessage(line)`
- **THEN** the adapter SHALL return a normalized `AgentMessage` or null if the line is not a recognized message

#### Scenario: Adapter checks availability
- **WHEN** `adapter.isAvailable()` is called
- **THEN** the adapter SHALL return true if the tool binary exists in PATH, false otherwise

### Requirement: AgentMessage normalized type
The system SHALL define a normalized AgentMessage discriminated union: `text` (role + content), `tool_call` (name + input), `tool_result` (output), `thinking` (content), `turn_complete`, `error` (message).

#### Scenario: Text message
- **WHEN** the AI tool outputs an assistant text response
- **THEN** the adapter SHALL emit `{ type: "text", role: "assistant", content: "..." }`

#### Scenario: Tool call
- **WHEN** the AI tool invokes a tool
- **THEN** the adapter SHALL emit `{ type: "tool_call", name: "read_file", input: {...} }`

### Requirement: Adapter registry
The system SHALL provide a registry that maps tool names (e.g. "claude", "codex") to their AgentAdapter implementations. The registry SHALL resolve adapter by the first positional argument to `wapi run`.

#### Scenario: Lookup adapter by name
- **WHEN** the user runs `wapi run claude`
- **THEN** the registry SHALL return the Claude adapter

#### Scenario: Unknown tool name
- **WHEN** the user runs `wapi run unknown-tool`
- **THEN** the registry SHALL return null and the CLI SHALL display an error listing available adapters
