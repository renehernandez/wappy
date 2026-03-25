## ADDED Requirements

### Requirement: SessionRoom Durable Object
The system SHALL provide a `SessionRoom` Durable Object class that extends `Server` from partyserver. One SessionRoom instance SHALL exist per session. It SHALL use hibernation.

#### Scenario: Browser connects to SessionRoom
- **WHEN** a browser opens a WebSocket connection to the SessionRoom for session `s_123`
- **THEN** the DO SHALL accept the connection

#### Scenario: Browser disconnects
- **WHEN** a browser closes its WebSocket connection
- **THEN** the DO SHALL remove it from the broadcast set and hibernate if no connections remain

### Requirement: SessionRoom streams full messages
The SessionRoom SHALL broadcast full message content to all connected clients when notified of a new message.

#### Scenario: New message notification
- **WHEN** the server function notifies SessionRoom of a new message
- **THEN** the SessionRoom SHALL broadcast `{ "type": "message", "id": "<id>", "seq": <seq>, "role": "<role>", "content": "<content>", "createdAt": "<ts>" }` to all connected clients

### Requirement: SessionRoom authentication
The SessionRoom SHALL validate connections in `onBeforeConnect` by checking for a valid CF-Access-JWT-Assertion header.

#### Scenario: Authenticated connection
- **WHEN** a WebSocket upgrade request includes a valid CF-Access-JWT-Assertion header
- **THEN** the connection SHALL be accepted

#### Scenario: Unauthenticated connection
- **WHEN** a WebSocket upgrade request has no valid auth header
- **THEN** the connection SHALL be rejected
