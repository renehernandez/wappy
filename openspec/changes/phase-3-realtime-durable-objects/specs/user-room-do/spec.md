## ADDED Requirements

### Requirement: UserRoom Durable Object
The system SHALL provide a `UserRoom` Durable Object class that extends `Server` from partyserver. One UserRoom instance SHALL exist per user account. It SHALL use hibernation (`static options = { hibernate: true }`).

#### Scenario: Browser connects to UserRoom
- **WHEN** a browser opens a WebSocket connection to the UserRoom for account `acc-123`
- **THEN** the DO SHALL accept the connection and add it to the broadcast set

#### Scenario: Multiple tabs connect
- **WHEN** 3 browser tabs connect to the same UserRoom
- **THEN** all 3 SHALL receive broadcast messages

### Requirement: UserRoom broadcasts notifications
The UserRoom SHALL broadcast JSON messages to all connected clients when notified by server functions. Notification types: `session_created`, `session_updated`, `message_added`.

#### Scenario: Session created notification
- **WHEN** the server function notifies UserRoom of a new session
- **THEN** the UserRoom SHALL broadcast `{ "type": "session_created", "sessionId": "<id>", "title": "<title>" }` to all connected clients

#### Scenario: Message added notification
- **WHEN** the server function notifies UserRoom of a new message
- **THEN** the UserRoom SHALL broadcast `{ "type": "message_added", "sessionId": "<id>", "messageSeq": <seq> }` to all connected clients

#### Scenario: Session status changed
- **WHEN** the server function notifies UserRoom of a session update
- **THEN** the UserRoom SHALL broadcast `{ "type": "session_updated", "sessionId": "<id>", "status": "<status>" }` to all connected clients

### Requirement: UserRoom authentication
The UserRoom SHALL validate connections in `onBeforeConnect` by checking for a valid CF-Access-JWT-Assertion header.

#### Scenario: Authenticated connection
- **WHEN** a WebSocket upgrade request includes a valid CF-Access-JWT-Assertion header
- **THEN** the connection SHALL be accepted

#### Scenario: Unauthenticated connection
- **WHEN** a WebSocket upgrade request has no CF-Access-JWT-Assertion header
- **THEN** the connection SHALL be rejected with a 401 response
