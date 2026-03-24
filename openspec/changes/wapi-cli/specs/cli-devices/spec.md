## ADDED Requirements

### Requirement: List registered devices
The `wapi devices` command SHALL display all devices registered to the authenticated user's account by calling the server's device list endpoint.

#### Scenario: List devices with active and revoked entries
- **WHEN** the user runs `wapi devices` and has 3 registered machines (2 active, 1 revoked)
- **THEN** the CLI SHALL display a table with device name, last seen time, status (active/revoked), and creation date

#### Scenario: No devices registered
- **WHEN** the user runs `wapi devices` and no machines exist for their account
- **THEN** the CLI SHALL display "No devices registered."

#### Scenario: Not authenticated
- **WHEN** the user runs `wapi devices` without valid credentials
- **THEN** the CLI SHALL display "Not authenticated. Run `wapi auth` first." and exit with a non-zero code

### Requirement: Revoke a device
The `wapi devices revoke <name-or-id>` command SHALL revoke a registered device by calling the server's revoke endpoint.

#### Scenario: Revoke by device name
- **WHEN** the user runs `wapi devices revoke my-laptop` and a device with that name exists
- **THEN** the CLI SHALL prompt for confirmation, call the revoke endpoint, and display "Device 'my-laptop' revoked."

#### Scenario: Revoke nonexistent device
- **WHEN** the user runs `wapi devices revoke unknown-device` and no matching device exists
- **THEN** the CLI SHALL display "No device found matching 'unknown-device'." and exit with a non-zero code

### Requirement: Show current device
The `wapi status` command SHALL display the current authentication state: server URL, authenticated device name, and connection status.

#### Scenario: Authenticated device
- **WHEN** the user runs `wapi status` with valid credentials
- **THEN** the CLI SHALL display the server URL, device name, and "Authenticated"

#### Scenario: Not authenticated
- **WHEN** the user runs `wapi status` with no credentials
- **THEN** the CLI SHALL display the server URL (if configured) and "Not authenticated"

#### Scenario: No config at all
- **WHEN** the user runs `wapi status` with no config or credentials
- **THEN** the CLI SHALL display "Not configured. Run `wapi init` to get started."

### Requirement: Logout
The `wapi logout` command SHALL delete the local credentials file, effectively de-authenticating the current device. It SHALL NOT revoke the device token on the server (the user can do that via `wapi devices revoke`).

#### Scenario: Successful logout
- **WHEN** the user runs `wapi logout` and credentials exist
- **THEN** the CLI SHALL delete `credentials.json` and display "Logged out."

#### Scenario: Already logged out
- **WHEN** the user runs `wapi logout` and no credentials exist
- **THEN** the CLI SHALL display "Already logged out."
