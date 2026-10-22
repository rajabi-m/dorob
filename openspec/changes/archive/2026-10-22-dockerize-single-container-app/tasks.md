# Tasks

## 1. Reproducible production packaging

- [x] 1.1 Add the root multi-stage Dockerfile with verified pinned Linux AMD64 Debian-compatible PostgreSQL/pgvector, Node and Bun versions/digests; verify frozen-lockfile installation and document the selected image/runtime versions.
- [x] 1.2 Package Next standalone output with workspace tracing root, public/static assets and server-only auth dependencies; verify a Node production build without a running catalogue and a source-free runtime serving public pages and admin login. Update production build/start documentation to distinguish Node success from the Bun-only failure.
- [x] 1.3 Package API, raster and migration bundles plus SQL, Sharp native dependencies and Swagger assets; verify actual image database migration, raster processing and Swagger operation without host toolchains or runtime package installation.
- [x] 1.4 Add `.dockerignore` and image-context confidentiality checks; verify sentinel environments, auth records, backups, local outputs/evidence and host dependencies are absent from context/layers/logs. Document safe build inputs and retained lockfile behavior.

## 2. Persistent storage and service lifecycle

- [x] 2.1 Implement explicit empty-mount preparation, versioned volume identity, fixed ownership and nonblocking full-lifetime disk lease; verify missing mounts, unsafe paths/permissions, incompatible PG_VERSION and a second container fail without replacing data. Document mount layout and init commands.
- [x] 2.2 Add init/reaper and the scoped Node supervisor with child-specific users/environments; verify PostgreSQL query readiness, explicit migrations, API/auth readiness and web startup occur in order, with no background collection/inference or public API/database listeners. Document required secrets and trusted origin.
- [x] 2.3 Implement startup deadlines and coordinated failure/shutdown; verify failure of each essential child, migration errors, stage timeout and SIGTERM produce the documented readiness/exit behavior and clean PostgreSQL shutdown under the grace budget. Document timeout and platform grace settings.
- [x] 2.4 Reconcile container auth runtime registrations under the outer lease and expose offline rotation mode; verify normal restart, hard-kill/reused-PID recovery, retained tokens and refusal to rotate an actively leased disk, while standalone-host safeguards still pass. Update auth maintenance documentation.
- [x] 2.5 Add bounded web-origin liveness/readiness endpoints and image health command; verify real dependency/storage failures cannot report ready and responses exclude secrets. Document probe paths, deadlines and startup allowance.
- [x] 2.6 Add the separately named local single-container runner/example and deployment instructions; verify it runs one image with a named volume and one public port while existing default development Compose commands remain unchanged. Record single-replica, stop-before-replace and resource constraints.

## 3. Explicit backup and transfer

- [x] 3.1 Add write-fenced logical database/assets export and private manifest tooling for existing Compose and container sources; verify complete synthetic history, judgments, vectors, migration ledger and staging survive capture, with canonical fingerprints and archive/image hashes and no credentials in manifest/logs. Document source fencing and off-disk backup steps.
- [x] 3.2 Add fresh-target maintenance import with compatibility/checksum preflight and bounded safe asset extraction; verify existing/incomplete targets, corrupt archives, unsafe archive paths and incompatible extensions are rejected without overwriting existing state. Document trusted-export requirements and fresh-disk recovery after failure.
- [x] 3.3 Restore under destination ownership with explicit vector-extension handling, then verify baseline schema/ledger, all user-table counts/fingerprints, vector round-trip and every historical asset hash before clearing incomplete status; verify interrupted import blocks normal startup and that no inference, repair or publication occurs. Deliver a private verification report for the synthetic rehearsal.
- [x] 3.4 Document separate optional private auth backup/recovery and the complete local-to-Darkub transfer/cutover/rollback runbook; verify a rehearsal creates a fresh deployment token by default and explicitly restored credential state works without stale runtime registrations. Keep source volumes/archives intact and do not perform live cutover.

## 4. Integrated acceptance and operator handoff

- [ ] 4.1 Build and run the actual Linux AMD64 image against disposable volumes; verify public catalogue/group/image rendering, protected browser login/handlers and direct backend bearer operations from inside the container, with no private listeners exposed externally. Record desktop/mobile keyboard and Persian RTL checks if public/auth UI files change.
- [x] 4.2 Exercise container replacement, graceful stop, hard-kill recovery, simultaneous disk use and offline maintenance end to end; verify exact retained synthetic records/assets/tokens, bounded failure behavior and clean disposal of acceptance containers/volumes without touching the working catalogue.
- [x] 4.3 Run documented lint/types, relevant API/auth/transfer tests, production image build and strict OpenSpec validation; update README, Plan.md and validation evidence with actual runtime/build results and platform preflight items. Verify the diff contains no secrets/generated data, and leave image publication, live transfer, provisioning, commit and push unperformed.

## Workflow follow-up

- Confirm Darkub architecture, disk locking, recreate behavior, one replica, resources, health/startup probes, termination grace and HTTPS origin before live deployment.
- Perform the separately initiated source export, off-disk copy, fresh-target import/verification and traffic cutover using the delivered runbook.
- Review the change and archive it through the OpenSpec workflow when implementation acceptance is complete.
