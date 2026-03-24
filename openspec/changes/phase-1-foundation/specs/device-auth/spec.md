## ADDED Requirements

### Requirement: CLI device code generation
The system SHALL provide a server function that generates a unique device code for CLI device authorization. The device code SHALL be a short, human-readable string (e.g., `ABCD-1234`). The system SHALL store the device code in D1 with status `pending`, associated machine info, and an expiration time of 10 minutes.

#### Scenario: Generate device code
- **WHEN** a POST request is made to the device code generation endpoint with `{ name: "rene-macbook" }`
- **THEN** the system SHALL return `{ code: "<device-code>", verifyUrl: "https://<host>/auth/device?code=<device-code>", expiresIn: 600 }`

#### Scenario: Device code expiration
- **WHEN** a device code was generated more than 10 minutes ago and has not been approved
- **THEN** the system SHALL treat the code as expired and reject any approval or polling attempts for it

### Requirement: Browser device approval page
The system SHALL serve a CF Access-protected page at `/auth/device` that displays the device code and machine name, allowing the authenticated user to approve or deny the device. This page SHALL only be accessible to users authenticated via Cloudflare Access.

#### Scenario: Approve device from browser
- **WHEN** an authenticated browser user visits `/auth/device?code=ABCD-1234` and clicks "Approve"
- **THEN** the system SHALL update the device code status to `approved`, create a new row in the `machines` table with a generated device token, and associate it with the authenticated user's account

#### Scenario: Deny device from browser
- **WHEN** an authenticated browser user visits `/auth/device?code=ABCD-1234` and clicks "Deny"
- **THEN** the system SHALL update the device code status to `denied` and no machine row SHALL be created

#### Scenario: Expired device code on approval page
- **WHEN** an authenticated browser user visits `/auth/device?code=ABCD-1234` and the code has expired
- **THEN** the system SHALL display a message indicating the code has expired and offer no approval action

### Requirement: CLI polls for device approval
The system SHALL provide an endpoint that the CLI polls to check whether a device code has been approved. When approved, the endpoint SHALL return the device token. The endpoint SHALL NOT require CF Access authentication (the CLI has no browser session yet).

#### Scenario: Poll returns pending
- **WHEN** a GET request is made to the polling endpoint with a valid, unexpired device code that has not been approved or denied
- **THEN** the system SHALL return `{ status: "pending" }`

#### Scenario: Poll returns approved with token
- **WHEN** a GET request is made to the polling endpoint with a device code that has been approved
- **THEN** the system SHALL return `{ status: "approved", deviceToken: "<token>" }` and the CLI SHALL store this token locally

#### Scenario: Poll returns denied
- **WHEN** a GET request is made to the polling endpoint with a device code that has been denied
- **THEN** the system SHALL return `{ status: "denied" }`

#### Scenario: Poll returns expired
- **WHEN** a GET request is made to the polling endpoint with a device code that has expired
- **THEN** the system SHALL return `{ status: "expired" }`

### Requirement: Authenticate CLI requests via device token
The system SHALL accept CLI requests authenticated with an `Authorization: Bearer device:<token>` header. The system SHALL look up the token in the `machines` D1 table and verify it is not revoked.

#### Scenario: Valid device token
- **WHEN** a request arrives with `Authorization: Bearer device:abc123` and a machine row exists with `deviceToken = "abc123"` and `revokedAt` is null
- **THEN** the system SHALL authenticate the request as the account associated with that machine and update `lastSeenAt`

#### Scenario: Revoked device token
- **WHEN** a request arrives with `Authorization: Bearer device:abc123` and the machine row has a non-null `revokedAt`
- **THEN** the system SHALL respond with HTTP 401 Unauthorized

#### Scenario: Unknown device token
- **WHEN** a request arrives with `Authorization: Bearer device:unknown` and no matching machine row exists
- **THEN** the system SHALL respond with HTTP 401 Unauthorized

### Requirement: Device revocation
The system SHALL allow an authenticated browser user to revoke a device by setting `revokedAt` on the corresponding `machines` row. Revoked devices SHALL be immediately unable to authenticate.

#### Scenario: Revoke a device from browser
- **WHEN** an authenticated browser user requests revocation of machine ID `m_123`
- **THEN** the system SHALL set `revokedAt` to the current timestamp on that machine row

#### Scenario: Revoked device attempts to authenticate
- **WHEN** a CLI request uses a device token belonging to a machine with a non-null `revokedAt`
- **THEN** the system SHALL respond with HTTP 401 Unauthorized

### Requirement: List registered devices
The system SHALL provide a server function that returns all machines registered to the authenticated user's account, including their name, last seen time, and revocation status.

#### Scenario: List devices for account with machines
- **WHEN** an authenticated user requests their device list and they have 2 registered machines
- **THEN** the system SHALL return both machine records with `id`, `name`, `lastSeenAt`, `createdAt`, and `revokedAt` fields
