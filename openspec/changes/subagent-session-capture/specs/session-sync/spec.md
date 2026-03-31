## MODIFIED Requirements

### Requirement: Message mapping from AgentMessage to server format
SessionSync SHALL map `AgentMessage` types to the server's message format: `text` -> role + content + metadata, `tool_call` -> role "tool" + JSON content + metadata, `tool_result` -> role "tool" + JSON content + metadata, `error` -> role "system" + error content. When `metadata` is present on any variant, it SHALL be serialized as a JSON string and included in the server request.

#### Scenario: Map tool call with metadata
- **WHEN** an AgentMessage `{ type: "tool_call", name: "Bash", input: {...}, metadata: { isSubagent: true } }` arrives
- **THEN** SessionSync SHALL POST `{ role: "tool", content: JSON.stringify({...}), metadata: "{\"isSubagent\":true}" }`

#### Scenario: Map tool result with metadata
- **WHEN** an AgentMessage `{ type: "tool_result", output: "...", metadata: { isSubagent: true } }` arrives
- **THEN** SessionSync SHALL POST `{ role: "tool", content: JSON.stringify({...}), metadata: "{\"isSubagent\":true}" }`

#### Scenario: Map tool call without metadata
- **WHEN** an AgentMessage `{ type: "tool_call", name: "read_file", input: {...} }` arrives with no metadata
- **THEN** SessionSync SHALL POST `{ role: "tool", content: JSON.stringify({...}) }` without metadata field
