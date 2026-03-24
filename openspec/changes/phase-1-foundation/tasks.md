## 1. Project Scaffold

- [x] 1.1 Initialize pnpm workspace with `pnpm-workspace.yaml` listing `app/` and `packages/*`
- [x] 1.2 Scaffold TanStack Start app in `app/` with Cloudflare Workers preset (`app.config.ts`, `server.ts`, `router.tsx`)
- [x] 1.3 Configure `wrangler.jsonc` with D1 database binding (`DB`) and KV namespace binding (`KV`)
- [x] 1.4 Create `packages/wire/` package with `package.json` (name: `@wapi/wire`), `tsconfig.json`, and `src/index.ts` entry point
- [x] 1.5 Add TailwindCSS to the app
- [x] 1.6 Verify `wrangler dev` starts locally and serves the TanStack Start app

## 2. D1 Schema + Drizzle ORM

- [x] 2.1 Install `drizzle-orm` and `drizzle-kit` in `app/`
- [x] 2.2 Create `db/schema.ts` defining `accounts`, `machines`, and `device_codes` tables using Drizzle SQLite schema builder
- [x] 2.3 Configure `drizzle.config.ts` for D1 dialect with migrations output to `db/migrations/`
- [x] 2.4 Generate initial migration with `drizzle-kit generate`
- [x] 2.5 Create `server/lib/db.ts` — Drizzle client factory that takes the D1 binding from Worker env
- [x] 2.6 Verify migration applies to local D1 via `wrangler d1 migrations apply`

## 3. Cloudflare Access Auth

- [x] 3.1 Create `server/auth/cf-access.ts` — function to extract and validate email from `CF-Access-JWT-Assertion` header
- [x] 3.2 Create `server/functions/auth.ts` — `upsertAccount` server function that inserts or returns an account by email
- [x] 3.3 Write tests for CF Access JWT extraction and account upsert logic

## 4. Auth Middleware

- [x] 4.1 Create `server/middleware/auth.ts` — TanStack Start middleware that tries CF Access JWT first, then device Bearer token, or returns 401
- [x] 4.2 Define the authenticated request context type (`{ accountId, email }`) and attach it to the middleware context
- [x] 4.3 Mark device code generation and polling endpoints as public (bypass auth)
- [x] 4.4 Write tests for middleware with both auth strategies and unauthenticated requests

## 5. Device Authorization Flow — Server Functions

- [x] 5.1 Create Zod schemas in `@wapi/wire` for device auth request/response types (`DeviceCodeRequest`, `DeviceCodeResponse`, `DevicePollResponse`)
- [x] 5.2 Create `server/functions/devices.ts` — `createDeviceCode` server function: generates code, inserts into `device_codes` with 10-minute expiry
- [x] 5.3 Create `server/functions/devices.ts` — `pollDeviceCode` server function: looks up code, returns status and token if approved
- [x] 5.4 Create `server/functions/devices.ts` — `approveDevice` server function: validates code, creates machine row, updates device_codes status
- [x] 5.5 Create `server/functions/devices.ts` — `denyDevice` server function: updates device_codes status to denied
- [x] 5.6 Create `server/functions/devices.ts` — `listDevices` server function: returns all machines for the authenticated account
- [x] 5.7 Create `server/functions/devices.ts` — `revokeDevice` server function: sets `revokedAt` on the machine row
- [x] 5.8 Write tests for device code generation, approval, denial, polling, and revocation

## 6. Device Token Authentication

- [x] 6.1 Create `server/auth/device-token.ts` — function to extract device token from `Authorization: Bearer device:<token>` header and look up machine in D1
- [x] 6.2 Update `lastSeenAt` on the machine row on each successful device token authentication
- [x] 6.3 Write tests for device token validation, revoked token rejection, and unknown token rejection

## 7. Routes + UI

- [x] 7.1 Create `routes/__root.tsx` — root layout with auth context provider
- [x] 7.2 Create `routes/index.tsx` — protected dashboard showing user email and registered devices list
- [x] 7.3 Create `routes/auth/device.tsx` — device approval page: displays device name, approve/deny buttons, handles expired codes
- [x] 7.4 Create `components/DeviceList.tsx` — lists registered devices with name, last seen, and revoke button
- [x] 7.5 Create `components/DeviceApproval.tsx` — device approval form with approve/deny actions

## 8. Integration Verification

- [x] 8.1 End-to-end test: browser auth via CF Access JWT → dashboard renders with account info
- [x] 8.2 End-to-end test: device code generation → browser approval → CLI poll receives token → authenticated CLI request succeeds
- [x] 8.3 End-to-end test: device revocation → subsequent CLI request with revoked token returns 401
- [ ] 8.4 Verify `wrangler deploy` succeeds and the deployed Worker serves the app
