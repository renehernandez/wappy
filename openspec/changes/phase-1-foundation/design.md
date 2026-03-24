## Context

WAPI is a greenfield project for syncing AI coding sessions across devices via a PWA on Cloudflare Workers. No code exists yet. The PLAN.md outlines 6 phases; this change covers Phase 1 — the deployable foundation.

The project follows a single-tenant per Cloudflare account model: each deployer runs their own isolated instance with their own D1 database, KV namespace, and Cloudflare Access application. There is no multi-tenant logic, no shared infrastructure, and no org/team/role system.

The server is trusted — no client-side encryption, no E2E crypto, no IndexedDB. All data lives in Cloudflare products (D1, KV).

Two client types must authenticate: browsers (via Cloudflare Access) and CLIs (via per-device Bearer tokens issued through a browser-based device authorization flow).

## Goals / Non-Goals

**Goals:**
- Deployable TanStack Start app on Cloudflare Workers with D1 and KV bindings
- Browser authentication via Cloudflare Access with zero custom auth UI
- Device authorization flow: CLI prints URL, user approves in browser, CLI receives token
- D1 schema with Drizzle ORM covering accounts, machines, and device codes
- Auth middleware that handles both CF Access JWT and device Bearer token strategies
- pnpm monorepo with shared Zod schemas in a `wire` package

**Non-Goals:**
- Session CRUD, message storage, or any session-related data (Phase 2)
- Real-time via Durable Objects or partyserver (Phase 3)
- PWA manifest, service worker, offline support (Phase 4)
- R2 file storage (Phase 5)
- Multi-tenant logic, org/team management, role-based access control
- Email service integration (OTP, magic links)
- CLI binary (`wapi` command) — only the server-side endpoints it calls

## Decisions

### 1. Cloudflare Access for browser auth instead of custom auth

**Choice**: Delegate all browser authentication to Cloudflare Access (Zero Trust).

**Alternatives considered**:
- *Ed25519 challenge-response (like happy)*: Requires client-side keypair generation, IndexedDB storage, custom login UI. Powerful for E2E encryption but unnecessary in server-trusted model.
- *Email OTP / magic link*: Requires an email sending service (Resend, SES, etc.). Adds external dependency and custom auth UI code.
- *OAuth (GitHub/Google)*: Requires OAuth client setup, callback handling, custom auth UI. More code than CF Access.

**Rationale**: CF Access handles login UI, email OTP, and OAuth providers entirely in the Cloudflare dashboard — zero auth code in the app. The Worker just validates a JWT. This is the minimum viable auth for a single-tenant self-hosted app.

### 2. Browser-based device authorization for CLI instead of API keys

**Choice**: CLI initiates a device authorization flow — generates a code, prints a URL, user approves in a CF Access-protected browser page. No API keys.

**Alternatives considered**:
- *Shared API key (`wrangler secret put`)*: Simple but not revocable per-device, no visibility into which machines are connected.
- *API key + device registration*: API key bootstraps device registration, then per-device tokens. Adds an API key management concern.
- *Ed25519 keypair pairing*: CLI generates keypair, publishes public key, browser approves. Complex, unnecessary without E2E.

**Rationale**: The device auth flow gives per-device tokens (trackable, revocable) without introducing API key management. Works in headless/SSH environments via copy-paste URL. Same pattern as `gh auth login`.

### 3. D1 for relational data, KV for ephemeral TTL data

**Choice**: Accounts, machines, and device codes live in D1 via Drizzle ORM. KV is available for ephemeral data but not used in Phase 1.

**Alternatives considered**:
- *KV for auth tokens*: Originally planned to store session/OTP tokens in KV with native TTL. Unnecessary now that CF Access handles browser sessions and device tokens are long-lived in D1.
- *D1 only*: Would work, but keeps KV binding available for future phases (caching, idempotency keys).

**Rationale**: Device tokens are long-lived and relational (linked to accounts, need metadata, queryable). Device codes are short-lived but low-volume — a cleanup query is sufficient. KV binding is configured but unused in Phase 1.

### 4. TanStack Start server functions instead of Hono API routes

**Choice**: Use TanStack Start's native `createServerFn` with middleware chains for all server-side logic.

**Alternatives considered**:
- *Hono sub-router at /api/**:  More traditional REST API, usable from external clients. Adds a dependency.
- *Both (server fns for SSR, Hono for API)*: Maximum flexibility but more setup.

**Rationale**: TanStack Start server functions are type-safe, SSR-friendly, and tightly integrated with the router. The CLI calls the same endpoints via HTTP — server functions are just HTTP endpoints under the hood. No need for a separate API framework.

### 5. Single-tenant per deploy, no multi-tenant logic

**Choice**: Each Cloudflare account deployment is a fully isolated instance. No tenant IDs, no org tables, no access control beyond CF Access.

**Alternatives considered**:
- *Multi-tenant shared infra*: One deployment serves multiple users/orgs with tenant isolation via D1 row-level filtering. Significantly more complex.
- *Config-driven mode switching*: Same codebase supports solo and team modes via env var. Adds branching logic everywhere.

**Rationale**: Single-tenant maps naturally to Cloudflare's resource model (each account has its own D1, KV, etc.). A company deploys the same code to their CF account; multiple users within that deployment are just multiple `accounts` rows. Roles/permissions deferred until actually needed.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| CF Access adds Cloudflare dependency for auth | Acceptable for a Cloudflare-native app. Free for up to 50 users. If needed later, can add alternative auth behind the same middleware interface. |
| Device auth polling adds latency to first CLI login | One-time cost per device. 2-3 second polling interval is fine. Token is cached locally after first auth. |
| TanStack Start on Workers is relatively new | Already spiked and confirmed working. Fallback to raw Worker fetch handler if framework issues arise. |
| No auth token expiration for device tokens | Device tokens are long-lived by design. Revocation via `revokedAt` column. Can add TTL later if needed. |
| D1 has no serializable transactions | Phase 1 operations are simple upserts and inserts. Optimistic concurrency needed in Phase 2+ for versioned data. |
