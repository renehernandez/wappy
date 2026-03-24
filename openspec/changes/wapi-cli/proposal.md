## Why

The WAPI server is deployed but there's no way for users to interact with it from the terminal. Users need a CLI that handles three things: provisioning their own WAPI instance on their Cloudflare account (`wapi init`), authenticating their machine via the browser device flow (`wapi auth`), and wrapping AI coding tools to capture and sync sessions (`wapi claude`, `wapi codex`, etc.). Without the CLI, users must manually run wrangler commands, edit config files, and have no session capture.

## What Changes

- Create a `packages/cli/` package in the monorepo — a Node.js CLI binary published as `wapi`
- `wapi init` — provisions Cloudflare resources (D1, KV, CF Access app) via `wrangler` under the hood, applies migrations, deploys the Worker. Takes a user from `git clone` to running instance in one command
- `wapi auth` — runs the browser device authorization flow: generates a device code, prints the approval URL, polls until approved, stores the device token locally at `~/.config/wapi/credentials.json`
- `wapi <command>` (e.g., `wapi claude`) — wraps an AI coding tool, captures the session, and syncs it to the WAPI server. This is the core value proposition but depends on session CRUD (Phase 2 server work). The CLI should be structured to support this but the sync logic is deferred
- `wapi status` — shows current auth state, server URL, registered devices
- `wapi devices` — lists and revokes devices from the CLI
- Configuration stored at `~/.config/wapi/config.json` with `serverUrl` and at `~/.config/wapi/credentials.json` with the device token

## Capabilities

### New Capabilities
- `cli-init`: Cloudflare resource provisioning — creates D1 database, KV namespace, configures and deploys the Worker. Generates `wrangler.jsonc` with real resource IDs from a template
- `cli-auth`: Device authentication flow from the terminal — device code request, URL display, polling, credential storage. Supports headless/SSH via copy-paste URL
- `cli-wrap`: Command wrapping infrastructure — spawn a child process, capture session metadata, communicate with the WAPI server. Session sync logic is stubbed until Phase 2 server endpoints exist
- `cli-config`: Local configuration management — server URL, credentials, device info. Stored in `~/.config/wapi/`
- `cli-devices`: Device management from the terminal — list devices, revoke devices, show current device info

### Modified Capabilities

(none)

## Impact

- **New package**: `packages/cli/` with its own `package.json`, compiled to a standalone binary via `tsx` or bundled with `esbuild`
- **Shared schemas**: `@wapi/wire` is already set up for this — the CLI imports the same Zod schemas the server uses
- **Dependencies**: `commander` or `citty` for CLI framework, `open` for browser launching, `conf` or direct fs for config storage
- **Server endpoints**: The CLI calls the existing Phase 1 server functions (device code generation, polling, device list, revoke) via HTTP. No server changes needed for auth/device management. Session sync endpoints will be added in a future server change
- **Deployment**: Users install via `npx wapi` or `pnpm add -g wapi`. The init flow requires `wrangler` to be installed (or the CLI installs it as a dependency)
- **wrangler.jsonc**: The current file has placeholder IDs (`"local"`). The CLI's `init` command replaces these with real IDs after creating resources. The template stays in the repo; the CLI writes the real config
