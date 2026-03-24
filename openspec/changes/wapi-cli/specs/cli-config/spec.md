## ADDED Requirements

### Requirement: XDG-compliant config directory
The CLI SHALL store configuration in `$XDG_CONFIG_HOME/wapi/` if `XDG_CONFIG_HOME` is set, otherwise in `~/.config/wapi/`. The directory SHALL be created automatically if it does not exist.

#### Scenario: Default config location
- **WHEN** `XDG_CONFIG_HOME` is not set
- **THEN** the CLI SHALL use `~/.config/wapi/` as the config directory

#### Scenario: Custom XDG path
- **WHEN** `XDG_CONFIG_HOME` is set to `/home/user/.local/config`
- **THEN** the CLI SHALL use `/home/user/.local/config/wapi/` as the config directory

### Requirement: Config file structure
The CLI SHALL maintain two files: `config.json` for non-sensitive settings and `credentials.json` for authentication tokens.

#### Scenario: Config file contents
- **WHEN** the CLI reads config
- **THEN** `config.json` SHALL contain `serverUrl` (string) and optionally `deviceName` (string)

#### Scenario: Credentials file contents
- **WHEN** the CLI reads credentials
- **THEN** `credentials.json` SHALL contain `deviceToken` (string) and `machineName` (string)

### Requirement: Config get/set commands
The CLI SHALL provide `wapi config set <key> <value>` and `wapi config get <key>` for managing configuration.

#### Scenario: Set server URL
- **WHEN** the user runs `wapi config set serverUrl https://my-wapi.workers.dev`
- **THEN** the CLI SHALL update `serverUrl` in `config.json`

#### Scenario: Get server URL
- **WHEN** the user runs `wapi config get serverUrl`
- **THEN** the CLI SHALL print the current `serverUrl` value

### Requirement: Server URL from environment variable
The CLI SHALL accept `WAPI_SERVER_URL` environment variable, which takes precedence over the config file value.

#### Scenario: Env var overrides config
- **WHEN** `WAPI_SERVER_URL=https://override.workers.dev` is set and `config.json` has a different URL
- **THEN** the CLI SHALL use `https://override.workers.dev` as the server URL
