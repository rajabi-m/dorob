# Design

## Context

See proposal.md for motivation. Current Compose runs only digest-pinned PostgreSQL 17/pgvector; `run.sh` launches development processes and explicitly runs migrations. The API build emits the API and raster worker, but migration execution still uses source and adjacent SQL files. Sharp native modules and Swagger assets must remain resolvable. Thumbnails/staging use distinct absolute directory settings.

`add-admin-token-auth` is implemented with 20/20 tasks, and its specs are synced/archived. It introduces a shared private auth directory, persistent tokens, process-registration files and offline rotation. Container packaging must retain that behavior. Its filesystem code deliberately excludes auth state from Next tracing.

The just-completed local run built and served the production frontend successfully with Node 26.11.0 while Bun 1.3.8 remains the API/installer runtime. Bun's frontend page-data failure still exists; this image uses Node rather than treating that failure as acceptable deployment output. Local Node success is evidence for the approach, not proof of Linux image compatibility.

Darkub accepts Docker images and the owner confirms disk mounts are available. Exact platform image architecture, termination grace settings, volume filesystem locks and update behavior must be verified at deployment preflight. No platform account mutation is part of implementation acceptance.

## Goals / Non-Goals

**Goals:** A single deployable image with replaceable code, independently durable state, predictable failure behavior and a restore-tested way to move the whole catalogue. Keep the public product, token rules and explicit editorial operations unchanged.

**Non-Goals:** High availability, more than one replica, zero-downtime releases, managed databases, cloud provisioning, automatic live cutover, remote-worker ingress, inference services, scheduled collection or automatic publication. Docker apply builds/rehearses; it does not silently move the owner's working data.

## Decisions

### 1. Debian-compatible multi-stage image, Node web and Bun API

Use the existing pinned PostgreSQL 17/pgvector Debian image as the runtime foundation. Add pinned official Debian-compatible Node and Bun runtimes; verify and record exact Linux AMD64 manifests/digests during implementation. Preserve Bun 1.3.8. The owner approved Node 26.12.1 during apply because the exact Node 26.11.0 Debian image tags were unavailable; pin and verify its Linux AMD64 image instead. No Alpine/glibc mixing or unverified PostgreSQL physical-directory reuse.

Install workspace dependencies with `bun install --frozen-lockfile` in a builder. Build Next with the Node CLI, enable standalone output with the workspace as tracing root, and explicitly copy `public` and `.next/static`. Follow the installed Next 16.3.7 output guide for monorepo layout; verify the generated server path instead of assuming root `server.js`. Keep server-only shared auth code available in traced output without tracing `/data` or local storage.

Build API and raster bundles with Bun and add a bundled migration entry preserving SQL lookup layout. Carry Sharp's Linux native/optional dependencies, Swagger assets and their symlink targets. Runtime dependency selection comes from the frozen install graph, not an independent floating package install. No downloads, package installs, inference or builds occur at normal startup.

Add a root Dockerfile and `.dockerignore`; preserve current default Compose/run.sh development workflow and provide a separately named single-container runner/example. Exclude `.env*` except safe examples, Git metadata, all `storage`/auth/backups, utility/lab outputs, evidence, existing build directories and host dependencies. Verify exclusions with sentinel files and image/layer inspection. Never pass live credentials as build args. Static generation must not contact or capture a working catalogue during build.

Alternative: full workspace development images or Bun Next production startup would increase runtime surface or retain the observed build failure. Separate database hosting remains a later migration option, not this owner's selected MVP topology.

### 2. Disk layout, identity and exclusive lease

Require an actual mount at `/data`, checked through Linux mount information rather than merely testing directory existence. An explicit `init-volume` mode prepares an empty mount and writes a versioned volume identity; normal start refuses an unprepared mount. Import mode can prepare a fresh mount as part of its explicit workflow.

```text
/data/
  volume.json            non-secret identity and format version
  .runtime.lock          exclusive kernel-lock inode; never unlink while running
  postgres/              PostgreSQL cluster, postgres OS user, 0700
  thumbnails/            permanent assets, app OS user
  staging/               retained pending uploads, app OS user
  auth/                  credentials, app OS user, 0700
  import-state.json      incomplete/verified restore state when importing
```

Use stable numeric UIDs/GIDs for postgres and app; API and web share the app identity. A narrowly scoped root bootstrap validates/creates owned subdirectories and drops privileges for every application/database child. Do not recursively chown arbitrary mounted trees or follow symlink storage paths. Runtime writable cache/tmp files are separate from retained catalogue state.

Hold a nonblocking kernel file lock for the entire normal or maintenance runtime, including startup and shutdown. A second image instance fails before database startup or maintenance writes. Validate that the actual platform filesystem supports the lock; unsupported locking blocks cutover. Configure one replica and stop-before-replace updates; a PostgreSQL PID file alone is not the cross-container fence.

Alternative: accepting an ordinary `/data` directory permits accidental ephemeral databases; relying only on deployment documentation permits overlapping PostgreSQL instances.

### 3. Supervised startup and bounded shutdown

Use `tini` as init/reaper, util-linux `flock` in no-fork mode to retain the disk lease, and a small Node supervisor as its direct managed command. Reuse the installed Node runtime rather than adding a Python process manager. The supervisor manages exactly three essential services, with explicit UID/GID/process groups, stage timeouts and signal handling; it does not become a general job runner. Avoid a shell that backgrounds services and only waits for one PID.

Startup order:

1. Validate mount identity, exclusive lease, configuration and permissions. Reject `DOROB_DEV_MODE=true` for this production image; force consistent protected settings and `DOROB_AUTH_DIR=/data/auth` for both app processes. Require an explicit database secret and trusted `DOROB_WEB_ORIGIN`; derive internal DATABASE_URL safely without logging it.
2. Refuse incompatible `PG_VERSION` or an incomplete import. Initialize only an empty prepared cluster; generate no course data. Configure PostgreSQL loopback/local sockets only, with authenticated database TCP access.
3. Start PostgreSQL as its OS user and wait for a real query. Prepare compatible pgvector with maintenance privileges, then invoke the explicit migration bundle. Keep migration checksums and advisory locking unchanged; standalone API startup still never migrates.
4. Start the Bun API on `127.0.0.1:3001`, wait for `/health/ready` and auth-state initialization. Start the Node standalone website on `0.0.0.0:3000`, with child-specific PORT/HOST settings so inherited API settings cannot bind it incorrectly. Set server-only `DOROB_API_URL=http://127.0.0.1:3001`.
5. Mark aggregate readiness only after the website is serving and all dependencies/storage pass. Startup stages have a total 120-second default deadline, separately configurable from health-probe intervals.

Unexpected exit of any essential service marks readiness false, stops siblings and causes a nonzero container exit; do not hide failures with endless internal restart loops. SIGTERM first makes readiness false and stops web ingress, then drains API, then sends PostgreSQL a clean fast-shutdown request. Budget 60 seconds total and require at least 75 seconds platform termination grace; escalate only after documented child deadlines. Test signal delivery through init and lock wrappers. Retain PostgreSQL crash recovery on hard interruption rather than deleting PID/WAL files.

### 4. Health and auth maintenance

Add concrete web-origin `/health/live` and `/health/ready` handlers. Liveness confirms the web handler can run without SQL. Readiness checks supervisor startup state, the existing bounded API readiness query and accessible required data directories, with a five-second overall deadline and generic responses. The image HEALTHCHECK calls the same readiness contract; do not count an HTTP 200 product error page as health. Raw supervisor details remain internal.

Maintain current token/session semantics, including its dedicated API startup disclosure. Credentials are generated on first protected boot or explicitly restored, never embedded in images or normal backup manifests. Log access therefore grants operator access, as documented by the auth change.

Auth process registrations currently contain PIDs, which can be reused after a container restart. Introduce a container runtime identity for ephemeral registrations/locks. Under the exclusive outer disk lease, normal/offline-maintenance bootstrap can reconcile registrations from a prior container identity without deleting the credential record. Never use PID existence alone across container instances, and never clean another active instance's records. Preserve legacy standalone-host rotation safeguards. Offline rotation stops the whole container and runs the image's maintenance mode against the same disk under a fresh exclusive lease; no live HTTP rotation endpoint is added.

### 5. Explicit logical export and fresh-target restore

Provide commands and a runbook that work with both the existing Compose source and the future single-container deployment. Export requires a write-free window: stop web/API plus any external workers/editorial clients while leaving source PostgreSQL running solely for backup. Use PG17 `pg_dump` custom format for the entire application database, including user schemas, migrations, source/judgment history and vectors. Archive permanent thumbnails plus staging required by retained upload metadata; never copy a live PGDATA directory.

Produce a private manifest with source PostgreSQL/pgvector versions and locale, migration ledger identity, checksums, user-table counts and deterministic row-content fingerprints, and all referenced historical image hashes. Canonicalize row order and environment-dependent dump comments/ownership when comparing; do not compare incidental dump bytes as restored schema identity. Verify all referenced assets, not just current card images. Exclude cluster role passwords and auth state from the portable bundle; permit a separate explicit private credential backup for disaster recovery. Initial cloud import uses a fresh admin token by default.

Import runs as maintenance with app listeners stopped, a fresh mounted destination and the exclusive lease. Verify input checksums/versions before touching destination contents. Mark import incomplete before restoration; a crash retains that marker and blocks normal startup. Initialize the target cluster/database without running app migrations first. Pre-create the compatible vector extension as maintenance user; restore application objects under the destination app role with source ownership/ACLs omitted. Handle vector extension creation/comment TOC entries explicitly to avoid source-superuser assumptions. The runtime application role must not need cluster-administration privileges.

Refuse pre-existing app tables, existing retained images or prior incomplete imports; do not add overwrite/merge/wipe flags in the MVP. Choose another fresh disk after failure. Restore database and files, validate schema/migration identity, counts/fingerprints, vector round-trip and every referenced historical image hash before marking import verified. Validate the restored baseline before subsequent normal-start pending migrations, so additive schema changes do not obscure transfer verification. Source images/facts are not repaired, re-scraped or re-judged.

Accept only operator-trusted exports: a database dump can contain executable SQL and checksums establish integrity, not trusted authorship. Asset extraction must validate the flat content-key file namespace and reject traversal, absolute paths, symlinks/hardlinks, unexpected entries and archive size overruns before any destination write. Do not run unrestricted archive extraction as root.

For recurring backups, use the same explicit write-fenced workflow and copy the verified bundle outside `/data`; this change adds no scheduler or automatic backup destination. Preserve source volumes and original archives after rehearsal/cutover. A successful data import does not itself authorize publication, domain changes or source deletion.

## Risks / Trade-offs

- All services share availability and resources → one replica, accepted deployment downtime and documented CPU/RAM/disk headroom; no high-availability claim.
- Mounted storage semantics or platform defaults may allow overlap → mandatory lease test, single replica, recreate deployment and stop-before-replace preflight.
- Bundled native dependencies can differ on Linux/AMD64 → build and start the actual deployment image, including real Sharp raster processing and pgvector queries; local macOS success alone is insufficient.
- Supervisor mistakes can corrupt shutdown expectations → test failure of each child, stage timeouts, SIGTERM and hard-kill recovery against disposable disks.
- Startup migrations can prevent easy rollback → preserve pre-release verified backups; never automatically downgrade a schema or restore over the working disk.
- Admin auth changes are implemented and synced → use their artifacts/code as an explicit dependency, test packaged auth and avoid conflicting changes to their behavior.
- Source data may already lack referenced images → export verification reports the mismatch and prevents a claim of complete transfer; do not fabricate replacements.
- Startup token logs are sensitive → preserve only the intentionally requested disclosure, protect console/log access and keep all other secret handling redacted.

## Migration Plan

1. Implement packaging and operator tooling, then use synthetic isolated application records/assets and disposable Docker volumes for build, restore and lifecycle acceptance. Do not change the working PostgreSQL volume.
2. Document the verified Node production path and update stale statements that no production build can succeed. Keep the Bun-only failure recorded separately if it remains.
3. Prepare an operator runbook for source write fencing, export, off-disk backup, transport, fresh destination import, verification and normal startup. Actual source export/cutover remains an explicit operator workflow outside automatic implementation acceptance.
4. Before hosting, confirm Darkub AMD64 image compatibility, actual `/data` mount, flock support, resources, one replica, recreate behavior, startup/readiness probes, at least 75-second termination grace and HTTPS public origin. The current documentation page was not retrievable during this planning turn; do not claim account-specific settings were verified.
5. After a separately initiated live transfer, review catalogue/group/image readiness and protected login before traffic switch. Keep the source stopped but retained. If cutover is rejected before new writes, reactivate the retained source explicitly. After destination writes, first capture destination state and plan reconciliation; never silently revert to an older catalogue.
