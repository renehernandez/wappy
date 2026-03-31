## MODIFIED Requirements

### Requirement: Updated wappy run command with dual-mode capture
The `wappy run` command SHALL detect whether the adapter returned a `sessionId` and branch accordingly:

**Print mode** (no sessionId): Read JSON lines from the child's stdout, parse via `adapter.parseMessage()`, print assistant text to stdout, and sync via SessionSync. This is the existing behavior.

**Interactive mode** (sessionId present): Set up a JSONL tailer on Claude's local session file, parse events into AgentMessage, and sync via SessionSync. The child process runs with inherited stdio (full TUI).

#### Scenario: Run in print mode
- **WHEN** user runs `wappy run claude -- --print "hello"`
- **THEN** the CLI SHALL spawn Claude with stdout piped, read JSON lines, print text responses to stdout, and sync messages to the server

#### Scenario: Run in interactive mode
- **WHEN** user runs `wappy run claude`
- **THEN** the CLI SHALL spawn Claude with `stdio: "inherit"`, set up a JSONL tailer using the returned sessionId, and sync messages to the server as they appear in the JSONL file

#### Scenario: Interactive mode TUI passthrough
- **WHEN** the user is in an interactive Claude session via `wappy run claude`
- **THEN** the Claude TUI SHALL render normally with no visual degradation (stdin, stdout, and stderr are all inherited)

#### Scenario: Interactive mode session end
- **WHEN** the Claude process exits during an interactive session
- **THEN** the CLI SHALL call `stop()` on the JSONL tailer to perform a final drain, then end the session via SessionSync

### Requirement: Signal forwarding
The CLI SHALL forward signals (SIGINT, SIGTERM) to the child process so the wrapped command can handle termination gracefully.

#### Scenario: User presses Ctrl+C
- **WHEN** the user presses Ctrl+C while a wrapped command is running
- **THEN** the CLI SHALL forward SIGINT to the child process and wait for it to exit

### Requirement: Authentication required
The CLI SHALL verify that valid credentials exist before spawning the wrapped command.

#### Scenario: Not authenticated
- **WHEN** the user runs `wappy run claude` and no server URL is configured
- **THEN** the CLI SHALL display "Not authenticated. Run `wappy auth` first." and exit with a non-zero code

### Requirement: Strip leading -- separator
The CLI SHALL strip a leading `--` from the tool args so it is not forwarded to the spawned tool.

#### Scenario: Args with -- separator
- **WHEN** the user runs `wappy run claude -- --print "hello"`
- **THEN** the CLI SHALL pass `["--print", "hello"]` to the adapter, not `["--", "--print", "hello"]`
