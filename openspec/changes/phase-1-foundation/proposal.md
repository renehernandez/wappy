## Why

WAPI is a greenfield project with no runnable code yet. Before any features (sessions, real-time sync, PWA) can be built, the project needs a deployable foundation: a scaffolded TanStack Start app on Cloudflare Workers, a D1 database with schema, authentication for both browser and CLI clients, and a device registration flow that lets the `wapi` CLI connect to the Worker.

## What Changes

- Scaffold a TanStack Start full-stack app targeting Cloudflare Workers with D1 and KV bindings
- Implement authentication using Cloudflare Access for browser clients (zero custom auth UI) and per-device Bearer tokens for CLI clients
- Create a browser-based device authorization flow (CLI prints URL, user approves in CF Access-protected page, CLI polls for token) that works in headless/SSH environments via copy-paste URL
- Define the D1 schema via Drizzle ORM: `accounts`, `machines`, `device_codes` tables
- Build TanStack Start server functions for device registration, approval, and session validation
- Create auth middleware that accepts both CF Access JWTs (browser) and device tokens (CLI)
- Set up pnpm workspace with a shared `wire` package for Zod schemas

## Capabilities

### New Capabilities
- `cf-access-auth`: Cloudflare Access JWT validation for browser requests, account upsert from JWT claims
- `device-auth`: Browser-based device authorization flow for CLI clients — device code generation, approval page, polling endpoint, per-device token issuance and revocation
- `d1-schema`: Drizzle ORM schema for D1 with accounts, machines, and device_codes tables, plus migration tooling
- `auth-middleware`: Request authentication middleware supporting dual auth strategies (CF Access JWT and device Bearer token)
- `project-scaffold`: TanStack Start on Cloudflare Workers with D1/KV bindings, pnpm workspace, shared wire package

### Modified Capabilities

(none — greenfield project)

## Impact

- **New project structure**: Monorepo with `app/` (TanStack Start) and `packages/wire/` (shared Zod schemas)
- **Cloudflare resources**: Requires D1 database, KV namespace, and Cloudflare Access application configured on the deployer's CF account
- **Dependencies**: TanStack Start, TanStack Router, Drizzle ORM, Drizzle Kit, Zod, nanoid, TailwindCSS
- **Deployment model**: Single-tenant per Cloudflare account — each deployer runs their own isolated instance with their own D1/KV. No multi-tenant logic needed.
- **CLI**: The `wapi` CLI binary is not built in this phase, but the server-side endpoints it will call (device registration, approval polling) are established here
