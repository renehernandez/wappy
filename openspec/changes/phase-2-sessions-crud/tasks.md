## 1. D1 Schema + Migration

- [x] 1.1 Add `seq` column to `accounts` table in `db/schema.ts` (INTEGER DEFAULT 0)
- [x] 1.2 Add `sessions` table to `db/schema.ts` with all columns, FK to accounts and machines, index on accountId
- [x] 1.3 Add `session_messages` table to `db/schema.ts` with all columns, FK to sessions, unique index on (sessionId, seq)
- [x] 1.4 Generate D1 migration with `drizzle-kit generate`
- [x] 1.5 Verify migration applies to local D1 via `wrangler d1 migrations apply --local`
- [x] 1.6 Update `src/test/apply-migrations.ts` to include new tables

## 2. Shared Zod Schemas

- [x] 2.1 Add session schemas to `@wapi/wire`: `CreateSessionRequest`, `UpdateSessionRequest`, `SessionResponse`, `ListSessionsRequest`
- [x] 2.2 Add message schemas to `@wapi/wire`: `AddMessageRequest`, `ListMessagesRequest`, `MessageResponse`
- [x] 2.3 Add sync schema to `@wapi/wire`: `GetChangesRequest`, `GetChangesResponse`

## 3. Seq Allocator

- [x] 3.1 Create `server/lib/seq.ts` — `incrementSeq(accountId, db)` using `UPDATE ... RETURNING`
- [x] 3.2 Create `server/lib/seq.ts` — `nextMessageSeq(sessionId, db)` using `SELECT MAX(seq) + 1`
- [x] 3.3 Write tests for seq allocator: increment, first message seq, concurrent safety via unique constraint

## 4. Session Server Functions

- [x] 4.1 Create `server/functions/sessions.ts` — `createSession`: generate id, assign seq, set status active, version 1
- [x] 4.2 Create `server/functions/sessions.ts` — `getSession`: fetch by id + accountId, include message count
- [x] 4.3 Create `server/functions/sessions.ts` — `listSessions`: filter by status, order by updatedAt desc, pagination
- [x] 4.4 Create `server/functions/sessions.ts` — `updateSession`: optimistic concurrency via expectedVersion, bump seq
- [x] 4.5 Create `server/functions/sessions.ts` — `deleteSession`: set status to archived, bump seq
- [x] 4.6 Write tests for session CRUD: create, get, list with filters, update with version conflict, soft delete

## 5. Message Server Functions

- [x] 5.1 Create `server/functions/messages.ts` — `addMessage`: assign per-session seq, bump account seq, validate session ownership
- [x] 5.2 Create `server/functions/messages.ts` — `listMessages`: order by seq asc, afterSeq filter, limit
- [x] 5.3 Create `server/functions/messages.ts` — `getMessage`: fetch by id within session
- [x] 5.4 Write tests for message CRUD: add first message, add subsequent, list with afterSeq, list with limit

## 6. Sync Endpoint

- [x] 6.1 Create `server/functions/sync.ts` — `getChanges`: query sessions and messages where seq/accountSeq > sinceSeq
- [x] 6.2 Write tests for getChanges: all data, incremental, no changes

## 7. Server Function Wrappers (TanStack Start)

- [x] 7.1 Create `server/functions/session-actions.ts` — wrap session functions as `createServerFn` with `inputValidator` and auth
- [x] 7.2 Create `server/functions/message-actions.ts` — wrap message functions as `createServerFn` with `inputValidator` and auth
- [x] 7.3 Create `server/functions/sync-actions.ts` — wrap getChanges as `createServerFn` with auth

## 8. Routes + UI

- [x] 8.1 Create `components/SessionList.tsx` — displays sessions with title, agent type, status badge, message count, time
- [x] 8.2 Create `components/MessageThread.tsx` — displays messages with role indicator, content, seq number
- [x] 8.3 Create `routes/sessions/index.tsx` — session list page with status filter tabs, loads via listSessions
- [x] 8.4 Create `routes/sessions/$sessionId.tsx` — session detail page with message thread, loads via getSession + listMessages
- [x] 8.5 Update `routes/index.tsx` — add recent sessions section (5 most recent) above device list
- [x] 8.6 Add navigation links: dashboard ↔ sessions list

## 9. Integration Tests

- [x] 9.1 Integration test: create session → add messages → list messages by seq → verify ordering
- [x] 9.2 Integration test: create sessions and messages → getChanges with sinceSeq → verify incremental sync
- [x] 9.3 Integration test: update session with correct version → succeeds; update with stale version → conflict error
