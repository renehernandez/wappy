## ADDED Requirements

### Requirement: Session sync pipeline
The system SHALL provide a SessionSync class that manages the lifecycle of syncing a local tool session to the WAPI server. It SHALL create a session on first message, POST messages incrementally, and end the session when the tool exits.

#### Scenario: First message creates session
- **WHEN** the first AgentMessage arrives from the adapter
- **THEN** SessionSync SHALL call `createSession` on the server with the tool name as agentType and return the session ID

#### Scenario: Subsequent messages are posted
- **WHEN** additional AgentMessage events arrive
- **THEN** SessionSync SHALL call `addMessage` on the server for each message with the appropriate role and content

#### Scenario: Tool exits normally
- **WHEN** the child process exits with code 0
- **THEN** SessionSync SHALL call `updateSession` to set status to `ended`

#### Scenario: Tool exits with error
- **WHEN** the child process exits with a non-zero code
- **THEN** SessionSync SHALL call `updateSession` to set status to `ended` (same as normal — the error is captured as a message)

#### Scenario: Server unreachable
- **WHEN** a POST to the server fails (network error, timeout)
- **THEN** SessionSync SHALL log a warning and continue. The tool SHALL NOT be interrupted.

### Requirement: Message mapping from AgentMessage to server format
SessionSync SHALL map `AgentMessage` types to the server's message format: `text` → role + content, `tool_call` → role "tool" + JSON content, `tool_result` → role "tool" + JSON content, `error` → role "system" + error content.

#### Scenario: Map text message
- **WHEN** an AgentMessage `{ type: "text", role: "assistant", content: "Hello" }` arrives
- **THEN** SessionSync SHALL POST `{ role: "assistant", content: "Hello" }`

#### Scenario: Map tool call
- **WHEN** an AgentMessage `{ type: "tool_call", name: "read_file", input: {...} }` arrives
- **THEN** SessionSync SHALL POST `{ role: "tool", content: JSON.stringify({ type: "tool_call", name, input }) }`

### Requirement: Updated wapi run command
The `wapi run` command SHALL use the adapter registry to find the appropriate adapter, launch the tool, and pipe output through SessionSync. It SHALL pass all extra CLI arguments through to the tool.

#### Scenario: Run with adapter
- **WHEN** user runs `wapi run claude --model opus`
- **THEN** the CLI SHALL find the Claude adapter, spawn `claude --output-format stream-json --model opus`, create a session, and stream messages to the server

#### Scenario: Run unknown tool
- **WHEN** user runs `wapi run unknown-tool`
- **THEN** the CLI SHALL display "Unknown tool 'unknown-tool'. Available: claude, codex" and exit with non-zero code
