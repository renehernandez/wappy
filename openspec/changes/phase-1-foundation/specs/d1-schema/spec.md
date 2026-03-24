## ADDED Requirements

### Requirement: Accounts table
The system SHALL maintain an `accounts` table in D1 with the following columns: `id` (TEXT PRIMARY KEY, nanoid), `email` (TEXT UNIQUE NOT NULL), `displayName` (TEXT, nullable), `createdAt` (TEXT, ISO8601), `updatedAt` (TEXT, ISO8601). The `email` column SHALL have a unique index.

#### Scenario: Insert new account
- **WHEN** a new account is created with email `user@example.com`
- **THEN** the system SHALL insert a row with a generated nanoid `id`, the email, and current timestamps for `createdAt` and `updatedAt`

#### Scenario: Prevent duplicate email
- **WHEN** an attempt is made to insert an account with an email that already exists
- **THEN** the system SHALL reject the insert due to the unique constraint on `email`

### Requirement: Machines table
The system SHALL maintain a `machines` table in D1 with the following columns: `id` (TEXT PRIMARY KEY, nanoid), `accountId` (TEXT NOT NULL, foreign key to accounts.id), `name` (TEXT NOT NULL), `deviceToken` (TEXT UNIQUE NOT NULL), `lastSeenAt` (TEXT, nullable), `createdAt` (TEXT, ISO8601), `revokedAt` (TEXT, nullable). The `deviceToken` column SHALL have a unique index.

#### Scenario: Insert new machine
- **WHEN** a device is approved and a machine row is created
- **THEN** the system SHALL insert a row with a generated nanoid `id`, the approving account's `accountId`, the device name, a generated unique `deviceToken`, and current timestamp as `createdAt`

#### Scenario: Look up machine by device token
- **WHEN** the system needs to authenticate a CLI request with a device token
- **THEN** the system SHALL query the `machines` table by `deviceToken` and check that `revokedAt` is null

### Requirement: Device codes table
The system SHALL maintain a `device_codes` table in D1 with the following columns: `code` (TEXT PRIMARY KEY), `machineName` (TEXT NOT NULL), `accountId` (TEXT, nullable — set on approval), `status` (TEXT NOT NULL, CHECK in 'pending', 'approved', 'denied'), `deviceToken` (TEXT, nullable — set on approval), `expiresAt` (TEXT NOT NULL, ISO8601), `createdAt` (TEXT, ISO8601).

#### Scenario: Create pending device code
- **WHEN** the CLI requests a new device code with name "my-laptop"
- **THEN** the system SHALL insert a row with a generated code, `machineName = "my-laptop"`, `status = "pending"`, null `accountId` and `deviceToken`, and `expiresAt` set to 10 minutes from now

#### Scenario: Approve device code
- **WHEN** a browser user approves device code `ABCD-1234`
- **THEN** the system SHALL update the row to `status = "approved"`, set `accountId` to the approving user's account ID, and set `deviceToken` to the newly created machine's device token

### Requirement: Drizzle ORM schema definition
The system SHALL define the D1 schema using Drizzle ORM's SQLite schema builder (`drizzle-orm/sqlite-core`). The schema SHALL be defined in a single file that exports all table definitions.

#### Scenario: Generate migration from schema
- **WHEN** a developer runs `drizzle-kit generate`
- **THEN** Drizzle Kit SHALL produce a SQL migration file that creates the `accounts`, `machines`, and `device_codes` tables with all columns, constraints, and indexes

### Requirement: D1 migration support
The system SHALL use Drizzle Kit to generate SQL migrations and `wrangler d1 migrations apply` to apply them. Migrations SHALL be stored in the `db/migrations/` directory.

#### Scenario: Apply migration to fresh D1 database
- **WHEN** `wrangler d1 migrations apply` is run against an empty D1 database
- **THEN** all tables SHALL be created with the correct schema
