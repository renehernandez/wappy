## ADDED Requirements

### Requirement: Device authentication flow
The `wapi auth` command SHALL authenticate the current machine by running the browser device authorization flow against the configured WAPI server.

#### Scenario: Successful authentication
- **WHEN** the user runs `wapi auth` with a valid `serverUrl` configured
- **THEN** the CLI SHALL request a device code from the server, display the approval URL, poll for approval, and store the device token on success

#### Scenario: No server URL configured
- **WHEN** the user runs `wapi auth` and no `serverUrl` exists in config
- **THEN** the CLI SHALL display an error message instructing the user to run `wapi init` first or set the URL with `wapi config set serverUrl <url>`

### Requirement: Display approval URL
The CLI SHALL display the approval URL prominently so the user can open it in any browser. It SHALL attempt to open the URL in the default browser but SHALL NOT fail if the browser cannot be opened (headless/SSH support).

#### Scenario: Browser available
- **WHEN** the CLI generates a device code and a default browser is available
- **THEN** the CLI SHALL print the URL and attempt to open it in the browser

#### Scenario: Headless environment
- **WHEN** the CLI generates a device code and no browser can be opened
- **THEN** the CLI SHALL print the URL and instruct the user to open it manually on any device

### Requirement: Poll for approval
The CLI SHALL poll the server's device code endpoint at a 2-second interval until the code is approved, denied, or expired.

#### Scenario: Code approved
- **WHEN** the server returns status `approved` with a device token
- **THEN** the CLI SHALL store the token, display a success message, and exit with code 0

#### Scenario: Code denied
- **WHEN** the server returns status `denied`
- **THEN** the CLI SHALL display "Device authorization was denied" and exit with a non-zero code

#### Scenario: Code expired
- **WHEN** the server returns status `expired`
- **THEN** the CLI SHALL display "Device code expired. Run `wapi auth` to try again." and exit with a non-zero code

### Requirement: Store credentials securely
The CLI SHALL store the device token in `~/.config/wapi/credentials.json` with file permissions `0600` (owner read/write only).

#### Scenario: Credential file created
- **WHEN** authentication succeeds and no credential file exists
- **THEN** the CLI SHALL create `~/.config/wapi/credentials.json` with `{ "deviceToken": "<token>" }` and set permissions to `0600`

#### Scenario: Credential file updated
- **WHEN** authentication succeeds and a credential file already exists
- **THEN** the CLI SHALL overwrite the device token in the file

### Requirement: Already authenticated
The CLI SHALL detect if the machine is already authenticated and prompt before re-authenticating.

#### Scenario: Valid credentials exist
- **WHEN** the user runs `wapi auth` and a device token exists in credentials
- **THEN** the CLI SHALL display "Already authenticated as device <name>. Re-authenticate?" and wait for confirmation
