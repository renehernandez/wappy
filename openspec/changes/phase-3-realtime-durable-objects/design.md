## Context

WAPI Phase 2 delivered sessions/messages CRUD with seq-based sync. The CLI can create sessions and add messages via HTTP. Browsers display sessions and messages but require manual refresh. Phase 3 adds the real-time layer so browsers update instantly when the CLI (or any client) mutates data.

The PLAN.md specifies partyserver for DOs and partysocket for the client. TanStack Start handles SSR + server functions; partyserver handles WebSocket upgrades. Both run in the same Worker.

## Goals / Non-Goals

**Goals:**
- UserRoom DO: per-user, lightweight notifications for dashboard/list updates
- SessionRoom DO: per-session, full message streaming for live viewing
- Server functions notify DOs after every D1 mutation
- Browser connects via partysocket, React state updates on WS messages
- Custom server.ts entry point with routePartykitRequest
- Hibernation on both DOs for cost efficiency

**Non-Goals:**
- CLI WebSocket connection (CLI uses HTTP polling or the sync endpoint)
- Two-way communication (browser → DO → CLI). Browser is read-only for now.
- DO-backed storage (DOs are pure broadcast channels, D1 is source of truth)
- Authentication on WebSocket connections (defer — CF Access protects the Worker URL)

## Decisions

### 1. DOs as broadcast channels, not storage

**Choice**: DOs hold no persistent state. They receive notifications from server functions and broadcast to connected WebSocket clients. D1 remains the source of truth.

**Alternatives considered**:
- *DO SQLite storage*: Store messages in DO's SQLite for fast reads. Adds complexity — two sources of truth.
- *DO as write-through cache*: Writes go to DO first, DO writes to D1. Better latency but complex failure handling.

**Rationale**: Simplest correct approach. D1 writes are already fast enough. DOs just amplify D1 mutations to WebSocket clients.

### 2. Two DO classes instead of one

**Choice**: UserRoom for lightweight notifications (session list needs to know something changed). SessionRoom for full message content (session detail page needs actual messages).

**Alternatives considered**:
- *UserRoom only*: Send everything through one DO. Simpler but sends message content to all tabs, even those not viewing that session.
- *SessionRoom only*: No dashboard-level notifications. Dashboard polls or uses the sync endpoint.

**Rationale**: Separation of concerns. UserRoom is cheap (small payloads, one per user). SessionRoom is heavier (full message content) but only active when someone is viewing that session.

### 3. onBeforeConnect for WebSocket auth

**Choice**: DOs validate the connection in `onBeforeConnect` by checking the CF-Access-JWT-Assertion header (browser) or device token (future CLI WS). Reject unauthorized connections.

**Alternatives considered**:
- *No auth on WS*: Rely on CF Access protecting the Worker URL. Simpler but if the URL leaks, anyone can connect.
- *Token in URL query param*: Pass auth token as `?token=xxx`. Works but tokens in URLs can leak in logs.

**Rationale**: `onBeforeConnect` is the partyserver-recommended auth hook. Headers are secure. CF Access JWT is already present on browser requests.

### 4. partysocket with reconnection in React

**Choice**: Use `partysocket` (reconnecting WebSocket) wrapped in a React context. Root layout connects to UserRoom. Session detail page connects to SessionRoom on mount, disconnects on unmount.

**Alternatives considered**:
- *Raw WebSocket*: Manual reconnection logic. More code, more bugs.
- *EventSource/SSE*: Server-sent events. Simpler but no native DO support in Workers.

**Rationale**: partysocket handles reconnection, buffering, and backoff automatically. It's the official client for partyserver DOs.

### 5. Notification format

**Choice**: JSON messages with a `type` discriminator.

UserRoom messages:
```json
{ "type": "session_created", "sessionId": "s_123", "title": "Debug auth" }
{ "type": "session_updated", "sessionId": "s_123", "status": "ended" }
{ "type": "message_added", "sessionId": "s_123", "messageSeq": 5 }
```

SessionRoom messages:
```json
{ "type": "message", "id": "m_456", "seq": 5, "role": "assistant", "content": "..." }
```

**Rationale**: Discriminated union pattern. Client switches on `type`. UserRoom payloads are small (no content). SessionRoom payloads include full message content for immediate display.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Custom server.ts breaks TanStack Start | routePartykitRequest returns null for non-WS requests, falling back to TanStack Start handler. Tested in Phase 1 spike. |
| DO cold start latency | Hibernation reduces cost. First connection has ~50ms overhead. Subsequent messages are instant. |
| partyserver API changes | Pin version. partyserver is stable (Cloudflare-maintained). |
| Message ordering over WebSocket | Messages include seq number. Client can detect gaps and re-fetch from D1 if needed. |
| Large number of concurrent WS connections | Single-tenant, typically 1-3 browser tabs. Not a concern at this scale. |
