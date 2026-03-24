## ADDED Requirements

### Requirement: Wrap arbitrary commands
The `wapi <command> [args...]` command SHALL spawn the specified command as a child process with stdio inherited, forwarding all arguments and environment variables.

#### Scenario: Wrap claude command
- **WHEN** the user runs `wapi claude`
- **THEN** the CLI SHALL spawn `claude` as a child process with inherited stdin/stdout/stderr

#### Scenario: Wrap command with arguments
- **WHEN** the user runs `wapi claude --model opus`
- **THEN** the CLI SHALL spawn `claude --model opus` with all arguments passed through

#### Scenario: Exit code forwarding
- **WHEN** the wrapped command exits with code 1
- **THEN** the CLI SHALL exit with code 1

### Requirement: Signal forwarding
The CLI SHALL forward signals (SIGINT, SIGTERM) to the child process so the wrapped command can handle termination gracefully.

#### Scenario: User presses Ctrl+C
- **WHEN** the user presses Ctrl+C while a wrapped command is running
- **THEN** the CLI SHALL forward SIGINT to the child process and wait for it to exit

### Requirement: Authentication required
The CLI SHALL verify that valid credentials exist before spawning the wrapped command.

#### Scenario: Not authenticated
- **WHEN** the user runs `wapi claude` and no device token exists in credentials
- **THEN** the CLI SHALL display "Not authenticated. Run `wapi auth` first." and exit with a non-zero code

### Requirement: Session capture stub
The CLI SHALL log that session capture is not yet available but the command runs normally. No session data is sent to the server.

#### Scenario: Command runs without session sync
- **WHEN** the user runs `wapi claude` with valid credentials
- **THEN** the CLI SHALL print a one-line notice that session sync is coming soon, then spawn the command normally
