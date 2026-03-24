## ADDED Requirements

### Requirement: TanStack Start app on Cloudflare Workers
The system SHALL be a TanStack Start application configured to deploy as a Cloudflare Worker. The Worker entry point SHALL handle all HTTP requests via the TanStack Start handler.

#### Scenario: Deploy to Cloudflare Workers
- **WHEN** `wrangler deploy` is run
- **THEN** the application SHALL deploy as a single Cloudflare Worker that serves SSR pages and server functions

#### Scenario: Local development
- **WHEN** `wrangler dev` is run
- **THEN** the application SHALL start locally with access to D1 and KV bindings via Miniflare

### Requirement: D1 and KV bindings in wrangler configuration
The `wrangler.jsonc` configuration SHALL declare a D1 database binding named `DB` and a KV namespace binding named `KV`.

#### Scenario: D1 binding available in Worker
- **WHEN** a server function accesses `env.DB`
- **THEN** it SHALL have access to the configured D1 database for SQL queries via Drizzle ORM

#### Scenario: KV binding available in Worker
- **WHEN** a server function accesses `env.KV`
- **THEN** it SHALL have access to the configured KV namespace for key-value operations

### Requirement: pnpm monorepo with shared wire package
The project SHALL use pnpm workspaces with at least two packages: `app/` (the TanStack Start application) and `packages/wire/` (shared Zod schemas for request/response types). The wire package SHALL be importable from the app via its package name.

#### Scenario: Import shared schema in app
- **WHEN** the app imports a Zod schema from the wire package (e.g., `import { DeviceCodeRequest } from "@wapi/wire"`)
- **THEN** the import SHALL resolve correctly and the schema SHALL be usable for validation

### Requirement: Drizzle ORM configured for D1
The application SHALL use Drizzle ORM configured for Cloudflare D1 (SQLite dialect). The Drizzle client SHALL be initialized with the D1 binding from the Worker environment.

#### Scenario: Query D1 via Drizzle
- **WHEN** a server function uses the Drizzle client to query the `accounts` table
- **THEN** the query SHALL execute against the D1 database and return typed results

### Requirement: Protected dashboard route
The application SHALL serve a protected route at `/` (dashboard) that requires authentication. Unauthenticated requests to protected routes SHALL receive HTTP 401.

#### Scenario: Authenticated browser user views dashboard
- **WHEN** an authenticated browser user (via CF Access) navigates to `/`
- **THEN** the system SHALL render the dashboard page showing the user's email and registered devices

#### Scenario: Unauthenticated request to dashboard
- **WHEN** an unauthenticated request is made to `/`
- **THEN** Cloudflare Access SHALL intercept the request and redirect to the CF Access login page (handled by CF Access, not the application)

### Requirement: Device approval route
The application SHALL serve a route at `/auth/device` that displays a device approval form. This route SHALL be protected by CF Access authentication.

#### Scenario: View device approval page
- **WHEN** an authenticated browser user navigates to `/auth/device?code=ABCD-1234` with a valid pending code
- **THEN** the system SHALL display the device name and approval/denial buttons
