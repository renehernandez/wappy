## ADDED Requirements

### Requirement: UserRoom WebSocket in root layout
The root layout SHALL establish a partysocket connection to the authenticated user's UserRoom when a session exists. The connection SHALL automatically reconnect on disconnection.

#### Scenario: Authenticated user loads app
- **WHEN** an authenticated user loads any page
- **THEN** the root layout SHALL open a WebSocket connection to their UserRoom

#### Scenario: Unauthenticated user loads app
- **WHEN** an unauthenticated user loads a page (no CF Access JWT)
- **THEN** no WebSocket connection SHALL be opened

### Requirement: Dashboard reacts to UserRoom messages
The dashboard and session list pages SHALL listen for UserRoom notifications and re-fetch data when relevant changes occur.

#### Scenario: New session notification on dashboard
- **WHEN** a `session_created` message arrives from UserRoom while on the dashboard
- **THEN** the page SHALL refresh its session list to show the new session

#### Scenario: Message added notification on session list
- **WHEN** a `message_added` message arrives while on the session list page
- **THEN** the page SHALL update the message count and "last updated" for the affected session

### Requirement: SessionRoom WebSocket on detail page
The session detail page SHALL establish a partysocket connection to the session's SessionRoom on mount and disconnect on unmount.

#### Scenario: View session detail
- **WHEN** a user navigates to `/sessions/$sessionId`
- **THEN** a WebSocket connection SHALL open to that session's SessionRoom

#### Scenario: Navigate away from session
- **WHEN** a user navigates away from the session detail page
- **THEN** the SessionRoom WebSocket SHALL close

### Requirement: Live message rendering
The session detail page SHALL append new messages to the message thread in real-time as they arrive via the SessionRoom WebSocket, without a full page refresh.

#### Scenario: New message arrives via WebSocket
- **WHEN** a `message` event arrives from SessionRoom with `{ seq: 6, role: "assistant", content: "..." }`
- **THEN** the message SHALL appear at the bottom of the message thread immediately

#### Scenario: Message arrives while scrolled up
- **WHEN** the user is scrolled up in the message thread and a new message arrives
- **THEN** the message SHALL be appended but the scroll position SHALL NOT jump (show a "new messages" indicator instead)
