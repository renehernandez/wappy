## ADDED Requirements

### Requirement: Group consecutive subagent messages
The MessageThread component SHALL group consecutive messages with `metadata.isSubagent === true` into a collapsible section. The section SHALL be associated with the preceding Agent tool call message.

#### Scenario: Subagent messages grouped
- **WHEN** messages #3 (Agent tool_call), #4-#30 (isSubagent messages), #31 (assistant text) are rendered
- **THEN** messages #4-#30 SHALL be grouped into a single collapsible section under message #3

#### Scenario: Non-consecutive subagent messages
- **WHEN** a non-subagent message appears between two subagent messages
- **THEN** they SHALL be treated as separate groups

### Requirement: Collapsed by default
Subagent message groups SHALL be collapsed by default, showing only the Agent tool card header with a summary.

#### Scenario: Initial render
- **WHEN** a session with subagent messages loads
- **THEN** the subagent groups SHALL be collapsed

#### Scenario: User expands group
- **WHEN** the user clicks the expand toggle on a subagent group
- **THEN** the individual subagent steps SHALL be revealed

### Requirement: Agent card summary header
The Agent tool card header SHALL display: the agent type/description and the count of subagent steps (e.g., "Agent: glab-review (29 steps)").

#### Scenario: Agent card with subagent steps
- **WHEN** an Agent tool_call has 29 subsequent subagent messages
- **THEN** the header SHALL display "Agent: glab-review (29 steps)"

### Requirement: Compact subagent step rendering
Each subagent step SHALL render as a compact single-line item:
- Tool calls: tool name and brief input summary (e.g., `Read: /path/to/file.ts`)
- Tool results: truncated content (e.g., `Result: File does not exist...`)
- Assistant text: first line truncated (e.g., `I'll check the test file...`)

#### Scenario: Tool call step
- **WHEN** a subagent tool_call for "Bash" with input `{ command: "git status" }` renders
- **THEN** it SHALL display as `Bash: git status`

#### Scenario: Tool result step
- **WHEN** a subagent tool_result with long content renders
- **THEN** it SHALL display the first ~100 characters of content

#### Scenario: Assistant reasoning step
- **WHEN** a subagent assistant text message renders
- **THEN** it SHALL display the first line of text truncated to ~100 characters
