## Context

WAPI Phase 1 delivered the server: TanStack Start on Cloudflare Workers with D1, CF Access auth, and a device authorization flow. The server-side endpoints for device code generation, polling, approval, listing, and revocation are implemented and tested.

What's missing is the CLI — the primary interface for developers. The CLI needs to:
1. Provision a WAPI instance on the user's CF account (replacing manual wrangler commands)
2. Authenticate the user's machine via the browser device flow
3. Eventually wrap AI coding tools to capture sessions (depends on Phase 2 server work)

The CLI lives at `packages/cli/` in the monorepo and imports `@wapi/wire` for shared schemas.

## Goals / Non-Goals

**Goals:**
- `wapi init` provisions D1, KV, deploys the Worker — zero manual wrangler config
- `wapi auth` runs the device flow end-to-end: code → browser → poll → credential storage
- `wapi status`, `wapi devices` for visibility into auth state and registered machines
- `wapi <command>` spawns a child process (stub — no session sync yet)
- Local config at `~/.config/wapi/` — portable, XDG-compliant
- Works in headless/SSH (copy-paste URL, no browser auto-open required)

**Non-Goals:**
- Session capture and sync to the server (requires Phase 2 sessions CRUD)
- Real-time WebSocket connection to Durable Objects (Phase 3)
- Auto-update mechanism
- Windows support (defer — focus on macOS/Linux)

## Decisions

### 1. CLI framework: `citty` over `commander`

**Choice**: Use `citty` from the UnJS ecosystem.

**Alternatives considered**:
- *commander*: Most popular, mature. But heavier, callback-style API, no built-in color output.
- *yargs*: Feature-rich but complex configuration.
- *Raw process.argv*: No deps but reinventing the wheel.

**Rationale**: `citty` is lightweight, TypeScript-first, supports subcommands, and has a clean async handler API. Fits the UnJS/Cloudflare ecosystem we're already in.

### 2. Config storage: XDG-compliant flat files

**Choice**: Store config in `~/.config/wapi/config.json` and credentials in `~/.config/wapi/credentials.json`. Use `XDG_CONFIG_HOME` if set, fallback to `~/.config`.

**Alternatives considered**:
- *`conf` package*: Auto-handles XDG, migration, schema validation. Adds a dependency for something simple.
- *Single file*: One `~/.wapirc` with everything. Simpler but mixes config and secrets.
- *Keychain/credential store*: Most secure for tokens but platform-specific, complex.

**Rationale**: Two flat JSON files — one for config (server URL, preferences), one for credentials (device token). Direct `fs` read/write, no extra dependencies. Credentials file gets `0600` permissions.

### 3. Wrangler as a peer dependency, not embedded

**Choice**: The CLI requires `wrangler` to be installed globally or in the project. `wapi init` shells out to `wrangler` commands.

**Alternatives considered**:
- *Embed wrangler as a dependency*: Guaranteed version, but massive dependency tree (200+ packages). CLI becomes huge.
- *Use Cloudflare API directly*: No wrangler dependency, but must reimplement D1 creation, KV creation, deploy logic. Fragile.

**Rationale**: Wrangler is the official tool for CF resource management. Users deploying to CF already have it. The CLI checks for wrangler on startup and gives a clear error if missing.

### 4. Init generates wrangler.jsonc from template

**Choice**: The repo ships `app/wrangler.template.jsonc` with placeholder IDs. `wapi init` creates D1/KV, captures the real IDs, and writes `app/wrangler.jsonc` from the template with real values substituted.

**Alternatives considered**:
- *Edit wrangler.jsonc in-place*: Fragile regex/JSON manipulation on an existing file.
- *Env vars for IDs*: Use `.env` or wrangler secrets for resource IDs. Possible but wrangler.jsonc is the canonical place for bindings.

**Rationale**: Template + substitution is clean and deterministic. The generated `wrangler.jsonc` stays gitignored (it has account-specific IDs). The template stays in version control.

### 5. Child process wrapping via `execa`

**Choice**: `wapi claude` spawns the wrapped command via `execa` with stdio inherited, captures exit code.

**Alternatives considered**:
- *Node `child_process.spawn`*: Works but raw API, no promise support, TTY handling is manual.
- *PTY (`node-pty`)*: Full terminal emulation. Needed for session capture but overkill for the stub.

**Rationale**: `execa` handles stdio inheritance, signal forwarding, and promise-based lifecycle cleanly. When session capture is added later, we may need `node-pty` for full terminal recording, but the wrapping infrastructure starts with `execa`.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Wrangler CLI changes break `wapi init` | Pin minimum wrangler version, parse output defensively, test against wrangler releases |
| CF Access setup can't be automated via wrangler | `wapi init` creates D1/KV/Worker but prints manual instructions for CF Access setup. Automate when CF Access API stabilizes |
| Credential file on disk | `0600` permissions, clear `wapi logout` command. Keychain integration can be added later |
| `wapi <command>` is a stub without session sync | Clear messaging: "Session capture will be available in a future release. Your command runs normally." |
