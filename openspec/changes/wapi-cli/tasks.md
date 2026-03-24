## 1. CLI Package Setup

- [x] 1.1 Create `packages/cli/` with `package.json` (name: `wapi`, bin: `wapi`), `tsconfig.json`
- [x] 1.2 Install dependencies: `citty`, `execa`, `open`, `consola`
- [x] 1.3 Create CLI entry point `src/index.ts` with citty main command and subcommands
- [x] 1.4 Verify `pnpm --filter cli build` produces a runnable binary

## 2. Config Management

- [x] 2.1 Create `src/config.ts` — read/write `config.json` and `credentials.json` with XDG-compliant paths
- [x] 2.2 Create `src/commands/config.ts` — `wapi config get <key>` and `wapi config set <key> <value>`
- [x] 2.3 Support `WAPI_SERVER_URL` env var override
- [ ] 2.4 Write tests for config read/write, XDG path resolution, env var precedence

## 3. Init Command

- [x] 3.1 Create `app/wrangler.template.jsonc` with placeholder IDs (`DATABASE_ID_PLACEHOLDER`, `KV_ID_PLACEHOLDER`)
- [x] 3.2 Create `src/commands/init.ts` — check wrangler is installed, prompt for confirmation
- [x] 3.3 Implement D1 database creation via `wrangler d1 create`, parse output for database ID
- [x] 3.4 Implement KV namespace creation via `wrangler kv namespace create`, parse output for namespace ID
- [x] 3.5 Generate `wrangler.jsonc` from template with real resource IDs
- [x] 3.6 Run `wrangler d1 migrations apply` against the remote database
- [x] 3.7 Run `wrangler deploy` and capture the deployed URL
- [x] 3.8 Save server URL to config, display CF Access setup instructions
- [ ] 3.9 Write tests for template substitution and output parsing

## 4. Auth Command

- [x] 4.1 Create `src/commands/auth.ts` — check server URL, check existing credentials
- [x] 4.2 Implement device code request: POST to `serverUrl` device code endpoint with machine name
- [x] 4.3 Display approval URL prominently, attempt `open` to launch browser
- [x] 4.4 Implement polling loop: GET device code status every 2 seconds, handle approved/denied/expired
- [x] 4.5 Store device token to `credentials.json` with `0600` permissions on success
- [x] 4.6 Handle already-authenticated state: prompt to re-authenticate
- [ ] 4.7 Write tests for polling state machine, credential storage

## 5. Devices + Status Commands

- [x] 5.1 Create `src/commands/devices.ts` — list devices from server, display as table
- [x] 5.2 Implement `wapi devices revoke <name-or-id>` — find matching device, confirm, call revoke endpoint
- [x] 5.3 Create `src/commands/status.ts` — display server URL, auth state, device info
- [x] 5.4 Create `src/commands/logout.ts` — delete credentials file
- [ ] 5.5 Write tests for device list formatting, revoke flow

## 6. Command Wrapping

- [x] 6.1 Create `src/commands/wrap.ts` — default command handler for `wapi <command> [args...]`
- [x] 6.2 Implement child process spawn via `execa` with stdio inherited
- [x] 6.3 Implement signal forwarding (SIGINT, SIGTERM) to child process
- [x] 6.4 Implement exit code forwarding
- [x] 6.5 Add authentication check before spawning
- [x] 6.6 Add session capture stub message
- [ ] 6.7 Write tests for signal forwarding and exit code passthrough

## 7. Server Integration

- [x] 7.1 Create `src/api.ts` — HTTP client for WAPI server endpoints with device token auth header
- [x] 7.2 Implement typed API methods: `createDeviceCode`, `pollDeviceCode`, `listDevices`, `revokeDevice`
- [x] 7.3 Handle HTTP errors, timeouts, and unreachable server gracefully
- [ ] 7.4 Write tests for API client with mocked HTTP responses

## 8. Build + Distribution

- [x] 8.1 Configure `esbuild` or `tsup` to bundle CLI to a single file
- [x] 8.2 Add `bin` field to `package.json` pointing to bundled output
- [ ] 8.3 Test `npx wapi --help` works from outside the project
- [ ] 8.4 Add `wapi` to root `package.json` scripts for convenience
