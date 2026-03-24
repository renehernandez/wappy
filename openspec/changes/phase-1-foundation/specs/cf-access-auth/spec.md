## ADDED Requirements

### Requirement: Validate Cloudflare Access JWT on browser requests
The system SHALL validate the `CF-Access-JWT-Assertion` header on incoming requests. When a valid JWT is present, the system SHALL extract the user's email from the JWT claims and use it to identify the authenticated user.

#### Scenario: Valid CF Access JWT on first visit
- **WHEN** a request arrives with a valid `CF-Access-JWT-Assertion` header containing email `user@example.com` and no matching account exists in D1
- **THEN** the system SHALL create a new account record with that email and return the authenticated user context

#### Scenario: Valid CF Access JWT for existing account
- **WHEN** a request arrives with a valid `CF-Access-JWT-Assertion` header containing email `user@example.com` and an account with that email already exists in D1
- **THEN** the system SHALL return the existing account as the authenticated user context without creating a duplicate

#### Scenario: Missing or invalid CF Access JWT without device token
- **WHEN** a request arrives without a `CF-Access-JWT-Assertion` header and without an `Authorization: Bearer device:*` header
- **THEN** the system SHALL respond with HTTP 401 Unauthorized

### Requirement: Upsert account from JWT claims
The system SHALL upsert an account row in the `accounts` D1 table based on the email extracted from the CF Access JWT. The upsert SHALL insert a new row if no account with that email exists, or return the existing row if one does.

#### Scenario: Account created on first authentication
- **WHEN** the email `new@example.com` is extracted from a valid JWT and no account with that email exists
- **THEN** the system SHALL insert a new row into `accounts` with a generated nanoid as `id`, the email, and current timestamp as `createdAt` and `updatedAt`

#### Scenario: Account returned on subsequent authentication
- **WHEN** the email `existing@example.com` is extracted from a valid JWT and an account with that email already exists
- **THEN** the system SHALL return the existing account row without modification
