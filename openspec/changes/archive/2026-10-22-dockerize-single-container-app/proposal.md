# Proposal

## Why

Dorob needs a simple MVP deployment on Hamravesh Darkub without coordinating separate hosted services. The owner selected one container for the website, API and PostgreSQL, with a mounted persistent disk and an explicit transfer of existing catalogue data and images.

## What Changes

- Build one production image containing Next.js on Node, the Bun API, PostgreSQL 17 with compatible pgvector and a process supervisor; expose only the website port.
- Use a multi-stage, frozen-lockfile build and exclude private data, credentials, local outputs and backups from its build context and layers.
- Persist database files, processed images, staging and generated admin credentials beneath `/data`; preserve records, assets and tokens across container replacement.
- Sequence storage validation, database startup, explicit migration-command execution, API readiness and website startup. Fail safely on errors and coordinate process failure/shutdown.
- Provide explicit backup/export, fresh-target restore/import and verification workflows for the existing database and thumbnail files. Never seed or restore during normal startup.
- Document a single replica, exclusive disk ownership, stop-before-replace releases, health checks, backups, maintenance and Darkub configuration.
- Preserve the implemented admin-token contract, including protected defaults and offline rotation; keep existing local development commands available.

## Capabilities

### New Capabilities

- `container-deployment`: One-image application runtime, persistent storage, startup, health, process lifecycle and deployment operations.
- `application-backup-restore`: Explicit verified transfer and recovery of database-backed catalogue state and its filesystem assets.

### Modified Capabilities

None. Container initialization invokes the explicit migration command before starting the API; standalone API startup and the existing development PostgreSQL contract stay unchanged. This change depends on the implemented `add-admin-token-auth` behavior whose main specs are synchronized and archived.

## Impact

Adds Docker build/context configuration, supervision/startup/maintenance tooling, isolated container acceptance checks, a separate optional local container runner and deployment/transfer documentation. May adjust server-only auth lifecycle registration for container restarts and runtime packaging paths without changing auth semantics. Production frontend build/start commands use Node; Bun remains the workspace installer and API runtime. The preceding local Node 26.11.0 production build/start succeeded; the documented Bun-only frontend build issue is not a reason to skip container production acceptance.

Implementation will rehearse restoration in disposable targets and prepare operator commands. Actual export uses an operator-selected write-free source window; live import/cutover, publishing an image, provisioning Darkub, credentials/domain setup, commit and push are not automatic apply actions. Managed databases, replicas, rolling updates, object storage migration, scheduled scraping, Ollama, embedding daemons and the experiment lab are outside this MVP image's startup scope.
