## ADDED Requirements

### Requirement: Provision Cloudflare resources
The `wapi init` command SHALL create the required Cloudflare resources: a D1 database named `wapi-db` and a KV namespace named `wapi-kv`. It SHALL use the `wrangler` CLI to create these resources.

#### Scenario: First-time init on a fresh CF account
- **WHEN** the user runs `wapi init` and no WAPI resources exist on their CF account
- **THEN** the CLI SHALL create a D1 database, create a KV namespace, capture their IDs, and display them to the user

#### Scenario: Wrangler not installed
- **WHEN** the user runs `wapi init` and `wrangler` is not found in PATH
- **THEN** the CLI SHALL display an error message with instructions to install wrangler and exit with a non-zero code

### Requirement: Generate wrangler.jsonc from template
The `wapi init` command SHALL generate `app/wrangler.jsonc` from `app/wrangler.template.jsonc` by substituting placeholder resource IDs with the real IDs returned from resource creation.

#### Scenario: Template exists and resources created
- **WHEN** D1 and KV resources have been created successfully
- **THEN** the CLI SHALL read `wrangler.template.jsonc`, replace `DATABASE_ID_PLACEHOLDER` with the real D1 database ID and `KV_ID_PLACEHOLDER` with the real KV namespace ID, and write the result to `wrangler.jsonc`

#### Scenario: wrangler.jsonc already exists
- **WHEN** the user runs `wapi init` and `app/wrangler.jsonc` already contains non-placeholder IDs
- **THEN** the CLI SHALL prompt the user to confirm overwrite before proceeding

### Requirement: Apply D1 migrations
After generating `wrangler.jsonc`, the `wapi init` command SHALL apply pending D1 migrations to the remote database using `wrangler d1 migrations apply`.

#### Scenario: Apply migrations on fresh database
- **WHEN** the D1 database has no tables
- **THEN** the CLI SHALL run `wrangler d1 migrations apply wapi-db --remote` and confirm all migrations applied successfully

### Requirement: Deploy the Worker
After migrations are applied, `wapi init` SHALL deploy the Worker to Cloudflare using `wrangler deploy`.

#### Scenario: Successful deployment
- **WHEN** migrations have been applied and the build succeeds
- **THEN** the CLI SHALL run the deploy command and display the deployed Worker URL

### Requirement: Display CF Access setup instructions
After deployment, the CLI SHALL display instructions for setting up Cloudflare Access, since Access configuration cannot be automated via wrangler.

#### Scenario: Deployment complete
- **WHEN** the Worker has been deployed successfully
- **THEN** the CLI SHALL print step-by-step instructions for configuring CF Access in the Cloudflare Zero Trust dashboard, including the Worker URL to protect

### Requirement: Store server URL in config
After a successful init, the CLI SHALL save the deployed Worker URL to the local config file so subsequent commands (`wapi auth`, `wapi status`) know which server to talk to.

#### Scenario: Config saved after init
- **WHEN** init completes successfully with a deployed URL of `https://wapi.example.workers.dev`
- **THEN** `~/.config/wapi/config.json` SHALL contain `{ "serverUrl": "https://wapi.example.workers.dev" }`
