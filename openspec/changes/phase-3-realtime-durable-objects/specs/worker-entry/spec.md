## ADDED Requirements

### Requirement: Custom Worker entry point
The system SHALL use a custom `src/server.ts` as the Worker entry point instead of `@tanstack/react-start/server-entry`. The entry point SHALL route WebSocket upgrade requests to Durable Objects via `routePartykitRequest` and fall back to TanStack Start for all other requests.

#### Scenario: WebSocket upgrade request
- **WHEN** a request with `Upgrade: websocket` header arrives
- **THEN** `routePartykitRequest` SHALL route it to the appropriate DO (UserRoom or SessionRoom)

#### Scenario: Regular HTTP request
- **WHEN** a non-WebSocket request arrives
- **THEN** `routePartykitRequest` SHALL return null and the request SHALL be handled by TanStack Start

### Requirement: DO class exports
The `server.ts` SHALL export the UserRoom and SessionRoom Durable Object classes so the Workers runtime can instantiate them.

#### Scenario: DO classes available
- **WHEN** the Worker starts
- **THEN** `UserRoom` and `SessionRoom` classes SHALL be available as named exports

### Requirement: wrangler.jsonc DO bindings
The `wrangler.jsonc` SHALL declare Durable Object bindings for `UserRoom` and `SessionRoom` with the `new_sqlite_classes` migration tag for hibernation support.

#### Scenario: DO bindings configured
- **WHEN** `wrangler deploy` is run
- **THEN** both DO classes SHALL be bound and available via `env.UserRoom` and `env.SessionRoom`
