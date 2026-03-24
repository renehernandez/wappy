## ADDED Requirements

### Requirement: Dual-strategy authentication middleware
The system SHALL provide auth middleware for TanStack Start server functions that supports two authentication strategies: Cloudflare Access JWT (browser) and device Bearer token (CLI). The middleware SHALL try strategies in order and authenticate with the first successful match.

#### Scenario: Browser request with CF Access JWT
- **WHEN** a request has a valid `CF-Access-JWT-Assertion` header
- **THEN** the middleware SHALL extract the email from the JWT, upsert the account, and attach the account to the request context

#### Scenario: CLI request with device token
- **WHEN** a request has an `Authorization: Bearer device:<token>` header with a valid, non-revoked token
- **THEN** the middleware SHALL look up the machine in D1, resolve the associated account, update `lastSeenAt`, and attach the account to the request context

#### Scenario: No valid credentials
- **WHEN** a request has neither a valid CF Access JWT nor a valid device token
- **THEN** the middleware SHALL respond with HTTP 401 Unauthorized

### Requirement: Request context carries authenticated account
The middleware SHALL attach the authenticated account to the request context so that downstream server functions can access the current user's account ID and email without re-authenticating.

#### Scenario: Server function accesses authenticated account
- **WHEN** a server function protected by the auth middleware executes
- **THEN** the function SHALL have access to `{ accountId, email }` from the request context

### Requirement: Public endpoints bypass auth
The system SHALL allow specific endpoints to bypass authentication. The device code generation and polling endpoints SHALL be accessible without authentication (the CLI has no credentials yet during initial device registration).

#### Scenario: Device code generation without auth
- **WHEN** a POST request is made to the device code generation endpoint without any authentication headers
- **THEN** the system SHALL process the request normally and return a device code

#### Scenario: Device poll without auth
- **WHEN** a GET request is made to the device polling endpoint without any authentication headers
- **THEN** the system SHALL process the request normally and return the device code status
