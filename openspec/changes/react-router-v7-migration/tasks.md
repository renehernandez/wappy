## 1. Dependencies & Config

- [x] 1.1 Remove TanStack deps: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-start/plugin/vite`
- [x] 1.2 Add React Router v7 deps: `react-router`, `@react-router/cloudflare`, `@react-router/dev`
- [x] 1.3 Update `vite.config.ts`: replace `tanstackStart()` plugin with `reactRouter()` from `@react-router/dev/vite`
- [x] 1.4 Create `react-router.config.ts` with Cloudflare preset and file-based routing
- [x] 1.5 Update `wrangler.jsonc` `main` field if the output path changes
- [x] 1.6 Define `AppLoadContext` type in `app/src/env.ts` with `cloudflare: { env: Env; ctx: ExecutionContext }`

## 2. Server Entry

- [x] 2.1 Rewrite `app/src/server.ts`: use `createRequestHandler` from `react-router`, pass `{ cloudflare: { env, ctx } }` as load context
- [x] 2.2 Keep `routePartykitRequest` before the React Router handler
- [x] 2.3 Keep DO class exports (`UserRoom`, `SessionRoom`)
- [ ] 2.4 Verify `pnpm build` produces a deployable Worker bundle

## 3. Root Layout

- [x] 3.1 Create `app/routes/root.tsx` (or `_layout.tsx` per RR7 convention) with `<Outlet />`, `<Scripts />`, `<ScrollRestoration />`
- [x] 3.2 Move auth check from TanStack `beforeLoad` to a root route `loader` using `AppLoadContext`
- [x] 3.3 Move `UserRoomListener` component and wire it to the loader's session data
- [x] 3.4 Move `NavShell` rendering and user email display

## 4. Page Routes

- [x] 4.1 Migrate `/` (index) route: convert `createFileRoute` to RR7 file route with `loader`
- [x] 4.2 Migrate `/sessions` list route: convert loader from `createServerFn` to RR7 `loader` with `AppLoadContext`
- [x] 4.3 Migrate `/sessions/$sessionId` detail route: convert loader, keep `useSessionRoom` hook and `liveMessages` state
- [x] 4.4 Migrate `/auth/device` route
- [x] 4.5 Replace all `Route.useLoaderData()` with `useLoaderData()` from `react-router`

## 5. API Resource Routes

- [x] 5.1 Migrate `POST /api/sessions` → `api.sessions.ts` with `action` export
- [x] 5.2 Migrate `GET /api/sessions`, `POST /api/sessions/:id` → resource routes with `loader`/`action`
- [x] 5.3 Migrate `GET /api/messages`, `POST /api/messages` → `api.messages.ts` resource route
- [x] 5.4 Migrate `POST /api/messages/batch` → `api.messages.batch.ts` resource route
- [x] 5.5 Migrate device routes: `/api/devices`, `/api/devices/code`, `/api/devices/poll`, `/api/devices/revoke`
- [x] 5.6 Migrate `/api/connect` and `/api/sync` resource routes
- [x] 5.7 All resource route actions/loaders SHALL extract `ctx` from `AppLoadContext` and pass to notify functions

## 6. DO Notifications

- [x] 6.1 Update `notifyUserRoom` and `notifySessionRoom` to return `Promise<void>` (no longer need to be awaited by callers)
- [x] 6.2 Update all call sites in `addMessage`, `addMessages`, `createSession`, `updateSession`, `deleteSession` to use `ctx.waitUntil(notifyUserRoom(...))` instead of `await notifyUserRoom(...)`
- [x] 6.3 Remove `await Promise.all([notify...])` pattern — each notify is independently `waitUntil`'d

## 7. Server Functions Removal

- [x] 7.1 Remove `app/src/server/functions/session-actions.ts` (server functions → inline in loaders)
- [x] 7.2 Remove `app/src/server/functions/message-actions.ts` (server functions → inline in loaders)
- [x] 7.3 Remove `app/src/server/functions/session.ts` (auth server function → loader in root layout)
- [x] 7.4 Keep `app/src/server/functions/messages.ts` and `sessions.ts` as pure business logic (no framework deps)

## 8. Tests

- [ ] 8.1 Update `app/src/server/lib/__tests__/notify.test.ts` — tests stay mostly the same, notify is still async
- [ ] 8.2 Update any tests importing from `@tanstack/react-start` or `@tanstack/react-router`
- [ ] 8.3 Run `pnpm test` and fix all failures
- [x] 8.4 Run `pnpm typecheck` and fix all type errors
- [ ] 8.5 Run `pnpm lint` and fix all lint issues

## 9. Validation

- [ ] 9.1 Run `pnpm build` and verify the Worker bundle builds
- [ ] 9.2 Deploy to Cloudflare and verify session list loads
- [ ] 9.3 Start a `wappy run claude` session and verify messages appear in real-time on the session detail page
- [ ] 9.4 Verify `ctx.waitUntil()` is used (not `await`) for DO notifications in server logs
- [ ] 9.5 Verify no messages are dropped — all CLI messages should appear on the dashboard without page refresh
