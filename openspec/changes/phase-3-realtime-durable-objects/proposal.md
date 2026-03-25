## Why

WAPI has sessions and messages stored in D1, but the browser requires a manual refresh to see new data. When the CLI adds messages to a session, the browser tab shows stale content. Real-time updates are essential for the live session viewing experience — watching an AI coding agent work from any browser.

## What Changes

- Add custom `src/server.ts` Worker entry point with `routePartykitRequest` for WebSocket routing alongside TanStack Start
- Create `UserRoom` Durable Object (per-user) — broadcasts lightweight notifications when sessions or messages change. Browser connects once in root layout.
- Create `SessionRoom` Durable Object (per-session) — streams full message content for live session viewing. Browser connects on the session detail page.
- Both DOs use hibernation (`static options = { hibernate: true }`) for cold start efficiency
- Server functions notify DOs after D1 mutations via `getServerByName()` from partyserver
- Client-side: `partysocket` (reconnecting WebSocket with buffering) connects to UserRoom in root layout and SessionRoom on detail pages
- React state updates on WebSocket messages — dashboard refreshes session list, detail page appends messages in real-time
- Update `wrangler.jsonc` with DO class bindings and `new_sqlite_classes` migration tag
- Add `partyserver` and `partysocket` dependencies

## Capabilities

### New Capabilities
- `user-room-do`: Per-user Durable Object that broadcasts lightweight notifications (session_created, session_updated, message_added) to all connected browser tabs
- `session-room-do`: Per-session Durable Object that streams full message content for live session viewing
- `do-notifications`: Server-side notification pipeline — server functions notify DOs after D1 writes via getServerByName()
- `ws-client`: Client-side WebSocket integration — partysocket connections in React, state updates on messages, reconnection handling
- `worker-entry`: Custom server.ts entry point routing WebSocket upgrades to DOs via partyserver, falling back to TanStack Start for HTTP

### Modified Capabilities

(none — additive change, existing HTTP functionality unchanged)

## Impact

- **Worker entry point**: Changes from `@tanstack/react-start/server-entry` to custom `src/server.ts`. This is the biggest structural change — all HTTP still works but WebSocket upgrades are now routed to DOs.
- **wrangler.jsonc**: New DO bindings (`UserRoom`, `SessionRoom`), `new_sqlite_classes` migration tag
- **Dependencies**: `partyserver` (server), `partysocket` (client)
- **Server functions**: Existing session/message server functions modified to notify DOs after mutations (additive — D1 writes unchanged)
- **Routes**: Root layout and session detail page updated with WebSocket connections
- **Existing tests**: Unaffected — DO tests are separate. HTTP endpoints unchanged.
