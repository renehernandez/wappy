## 1. Dependencies + Worker Entry Point

- [x] 1.1 Install `partyserver` and `partysocket` in app/
- [x] 1.2 Create `src/server.ts` — custom Worker entry with routePartykitRequest + TanStack Start fallback
- [x] 1.3 Update `wrangler.jsonc` — change main to `src/server.ts`, add DO bindings for UserRoom and SessionRoom with new_sqlite_classes migration
- [x] 1.4 Verify dev server starts and HTTP routes still work with custom entry point

## 2. UserRoom Durable Object

- [x] 2.1 Create `src/parties/user.ts` — UserRoom extends Server with hibernation, onConnect, onMessage, onClose
- [x] 2.2 Implement onBeforeConnect — validate CF-Access-JWT-Assertion header
- [x] 2.3 Implement broadcast — send JSON notification to all connected WebSocket clients
- [x] 2.4 Implement onMessage handler — receive notification from server function, broadcast to clients
- [x] 2.5 Export UserRoom from server.ts

## 3. SessionRoom Durable Object

- [x] 3.1 Create `src/parties/session.ts` — SessionRoom extends Server with hibernation
- [x] 3.2 Implement onBeforeConnect — validate auth header
- [x] 3.3 Implement broadcast — send full message JSON to all connected clients
- [x] 3.4 Implement onMessage handler — receive message notification, broadcast to clients
- [x] 3.5 Export SessionRoom from server.ts

## 4. Server-side DO Notifications

- [x] 4.1 Create `src/server/lib/notify.ts` — helper to get DO stub via getServerByName() and send notification
- [x] 4.2 Update `createSession` — notify UserRoom with session_created after D1 write
- [x] 4.3 Update `updateSession` and `deleteSession` — notify UserRoom with session_updated
- [x] 4.4 Update `addMessage` — notify UserRoom with message_added AND SessionRoom with full message
- [x] 4.5 Wrap notifications in try/catch — log errors, never fail the server function

## 5. Client WebSocket Integration

- [x] 5.1 Create `src/client/ws/useUserRoom.ts` — React hook using partysocket to connect to UserRoom
- [x] 5.2 Create `src/client/ws/useSessionRoom.ts` — React hook using partysocket to connect to SessionRoom
- [x] 5.3 Update `routes/__root.tsx` — connect to UserRoom when authenticated
- [x] 5.4 Update `routes/index.tsx` — re-fetch sessions on UserRoom notifications (session_created, session_updated)
- [x] 5.5 Update `routes/sessions/index.tsx` — re-fetch sessions on UserRoom notifications
- [x] 5.6 Update `routes/sessions/$sessionId.tsx` — connect to SessionRoom, append messages in real-time
- [x] 5.7 Add "new messages" indicator when scrolled up on session detail page

## 6. Wire Schemas

- [x] 6.1 Add WebSocket message types to `@wapi/wire` — UserRoomNotification, SessionRoomMessage discriminated unions

## 7. Testing

- [x] 7.1 Write tests for UserRoom — connect, broadcast, disconnect
- [x] 7.2 Write tests for SessionRoom — connect, message streaming, disconnect
- [x] 7.3 Write tests for notification helper — successful send, failure tolerance
- [x] 7.4 Verify existing HTTP tests still pass with custom server.ts entry point
