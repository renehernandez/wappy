## ADDED Requirements

### Requirement: Notify UserRoom after mutations
Server functions that mutate session data (createSession, updateSession, deleteSession, addMessage) SHALL notify the user's UserRoom DO after writing to D1. The notification SHALL use `getServerByName()` from partyserver to get the DO stub.

#### Scenario: Session created notification
- **WHEN** `createSession` writes a new session to D1
- **THEN** it SHALL call UserRoom with `{ type: "session_created", sessionId, title }`

#### Scenario: Message added notification
- **WHEN** `addMessage` writes a new message to D1
- **THEN** it SHALL call UserRoom with `{ type: "message_added", sessionId, messageSeq }`

#### Scenario: Session updated notification
- **WHEN** `updateSession` or `deleteSession` modifies a session in D1
- **THEN** it SHALL call UserRoom with `{ type: "session_updated", sessionId, status }`

### Requirement: Notify SessionRoom after message mutations
Server functions that add messages SHALL notify the session's SessionRoom DO with full message content.

#### Scenario: Message added to SessionRoom
- **WHEN** `addMessage` writes a new message to D1
- **THEN** it SHALL call SessionRoom with the full message data `{ type: "message", id, seq, role, content, createdAt }`

### Requirement: Notification failure tolerance
DO notification failures SHALL NOT cause the server function to fail. The D1 write is the source of truth; DO notifications are best-effort.

#### Scenario: DO unavailable
- **WHEN** a server function writes to D1 successfully but the DO notification fails
- **THEN** the server function SHALL log the error and return success. The client will eventually see the data via polling or page refresh.
