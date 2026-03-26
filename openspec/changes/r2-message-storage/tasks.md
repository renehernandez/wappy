## 1. R2 Infrastructure

- [x] 1.1 Add `r2_buckets` binding to `app/wrangler.jsonc` (`binding: "R2"`, `bucket_name: "wapi-storage"`)
- [x] 1.2 Add R2 binding to the CLI's embedded wrangler template in `packages/cli/src/bundle.ts` with `R2_BUCKET_PLACEHOLDER`
- [x] 1.3 Add `r2BucketName` to `DeploymentState` in `packages/cli/src/config.ts`
- [x] 1.4 Add R2 bucket creation step to `wapi init` (idempotent: check `wrangler r2 bucket list` before creating)
- [x] 1.5 Update scaffold template substitution to replace `R2_BUCKET_PLACEHOLDER`
- [x] 1.6 Add R2 binding type to `app/src/server/lib/bindings` or `env` usage

## 2. D1 Schema Migration

- [x] 2.1 Update Drizzle schema in `app/db/schema.ts`: remove `content`, `metadata`, `role`, `createdAt` from `sessionMessages`
- [x] 2.2 Generate Drizzle migration (`pnpm drizzle-kit generate`)
- [x] 2.3 Verify migration SQL drops the correct columns
- [x] 2.4 Update any TypeScript types that reference the removed columns

## 3. R2 Message Store Module

- [x] 3.1 Create `app/src/server/lib/r2-messages.ts` with `putMessage()` — stores full message JSON to R2
- [x] 3.2 Add `getMessage()` — fetches single message from R2 by sessionId + seq
- [x] 3.3 Add `getMessages()` — batch-fetches messages from R2 using `list()` prefix + `Promise.all()` GET
- [x] 3.4 Add helper `messageKey(sessionId, seq)` — constructs the zero-padded R2 key
- [x] 3.5 Write tests for R2 message store (put, get, batch get, missing key)

## 4. Update Server Functions (Dual-Write)

- [x] 4.1 Update `addMessage` in `app/src/server/functions/messages.ts`: allocate seqs → R2.put → D1 INSERT index row
- [x] 4.2 Update `listMessages`: query D1 index → batch R2.get for content
- [x] 4.3 Update `getMessage`: lookup D1 index → R2.get for content
- [x] 4.4 Update `getChanges` in `app/src/server/functions/sync.ts`: query D1 index → batch R2.get for content
- [x] 4.5 Update `getSession` message count query (uses COUNT on D1 index — still works)
- [x] 4.6 Update server function tests for new dual-write behavior (mock R2 binding)

## 5. REST API Routes

- [x] 5.1 Create `app/src/routes/api/sessions/index.ts` — GET (list) + POST (create) handlers
- [x] 5.2 Create `app/src/routes/api/sessions/$id.ts` — POST (update) handler
- [x] 5.3 Create `app/src/routes/api/messages/index.ts` — GET (list) + POST (add) handlers
- [x] 5.4 Create `app/src/routes/api/sync/index.ts` — GET handler
- [x] 5.5 Create shared auth middleware for REST routes (device token + CF Access)
- [x] 5.6 Write tests for REST API routes

## 6. Wire Schema Updates

- [x] 6.1 Update `MessageResponse` in `packages/wire/src/sessions.ts` if needed (should still include full content)
- [x] 6.2 Verify `AddMessageRequest` schema is unchanged (CLI sends the same payload)

## 7. CLI Init Updates

- [x] 7.1 Add `findR2Bucket()` helper to check if `wapi-storage` exists
- [x] 7.2 Add R2 bucket creation to init flow (after KV, before scaffold)
- [x] 7.3 Update scaffold to substitute R2 bucket name in template
- [x] 7.4 Save `r2BucketName` to deployment state after creation
- [x] 7.5 Write tests for R2 bucket idempotent creation in init

## 8. Integration Verification

- [x] 8.1 Run full test suite (`pnpm test`) — all existing + new tests pass
- [x] 8.2 Run typecheck (`pnpm typecheck`) — clean
- [x] 8.3 Run lint (`pnpm lint`) — clean
- [x] 8.4 Verify `pnpm build` succeeds with updated wrangler template
