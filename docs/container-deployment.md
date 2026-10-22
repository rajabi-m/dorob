# Single-container deployment

This workflow is separate from the default development `compose.yaml` and
`run.sh`. The local image is `dorob:acceptance`; extended mobile/keyboard browser
acceptance remains tracked, and hosting requires the preflight below.
No image publication, live catalogue transfer or platform provisioning is implied.

## Pinned build inputs

The Dockerfile targets Linux AMD64 and Debian Bookworm/glibc:

| Runtime | Version | AMD64 manifest SHA-256 |
| --- | --- | --- |
| Node | 26.12.1, Bookworm slim | `1884ec272c7c06aba7696262fb822dc602f8fa5eb978d03617d6bfe487d7ebac` |
| Bun | 1.3.8, Debian | `49c194493c391cc282414695a42486b5cdafd2bb339729f9571813b9845b1224` |
| PostgreSQL / pgvector | 17.11 / 0.8.7, Bookworm | `cd4ccfdaf62cbfeb5c6ee19ef0dd663406d4ed740c320b324d016a90e85385b3` |

Registry manifests were checked on October 22, 2026. The owner approved Node
26.12.1 because the planned Node 26.11.0 Debian Docker tags were unavailable.
The lockfile is preserved; installation uses `bun install --frozen-lockfile`.
Never pass production credentials as build arguments. Local environments,
storage, backups, outputs and host dependencies are excluded by `.dockerignore`.
Only explicitly selected manifests enter the dependency-install stage.

Dependency installation check:

```sh
docker build --platform linux/amd64 --target dependencies -t dorob-dependencies:acceptance .
```

The web build uses Node, with catalogue reads pointed at an unavailable local
port so it cannot capture the working catalogue. Bun remains the API runtime
and dependency installer. The image build and runtime acceptance results are recorded below.

## Packaging verification — October 22, 2026

The actual Linux AMD64 image builds with the frozen lockfile (790 packages).
The web workspace explicitly declares Bun 1.3.8 test types; the lockfile records
that declaration without changing resolved package versions. Production web
builds use Node 26.12.1 and do not need a catalogue connection. A source-free
runtime serves public routes, static assets, protected browser login, admin pages
and admin API handlers. Admin routes explicitly render per request to avoid
saving a build-time unauthenticated redirect as a static page.

The runtime includes libatomic1/libstdc++6 for Node, bundled API/raster/migration
entries, adjacent SQL and frozen Sharp/Swagger dependencies. Native Sharp packages
retain their sibling library layout. Actual image migrations, WebP processing,
Swagger UI/assets and bearer protection pass without host toolchains or package
installation at startup.

Run `python3 scripts/container/check-context.py` with Docker available to check
synthetic environments, auth records, backups, outputs/evidence and host modules
against a scratch context/image layer and build logs. The same check verifies
that the product login API source remains included. Runtime credentials are
created on the mounted disk and never supplied during builds.

Runtime, lifecycle and synthetic transfer acceptance pass. Additional mobile/
keyboard browser acceptance remains unchecked. The working catalogue is unchanged.

## Storage and local runner

Use one replica, one independently mounted disk and stop-before-replace releases.
By default only website port 3000 accepts external traffic; API 3001 and
PostgreSQL 5432 listen on loopback. Set `DOROB_EXPOSE_API=true` to bind the API
to all interfaces for remote workers. PostgreSQL stays on loopback. A root bootstrap validates the mount and owns its kernel lease;
PostgreSQL runs as UID/GID 999 and API/web as UID/GID 10001. Do not recursively
change ownership of an existing mounted tree. The retained layout is:

```text
/data/volume.json         root, 0600, versioned storage format
/data/.runtime.lock       root, 0600, never unlink while leased
/data/postgres/           999:999, 0700, PostgreSQL 17 cluster
/data/thumbnails/         10001:10001, 0700, historical WebP assets
/data/staging/            10001:10001, 0700, retained upload assets
/data/auth/               10001:10001, 0700, private credentials
/data/import-state.json   root, 0600, when importing
```

Normal start refuses an ordinary unmounted directory, an unprepared mount,
symlink storage paths, unsafe permissions, incompatible identity/PG_VERSION and
incomplete imports. A nonblocking flock lease covers startup, runtime, shutdown
and maintenance. Another cooperating container exits 73 before changing state.
Never unlink or replace the lock inode to bypass an active lease.

For the optional local single-container runner, set a private password of at
least 16 characters in the environment. Do not put the password in Git or build
arguments. The public origin defaults to `http://127.0.0.1:3000` for this runner:

```sh
docker compose -f compose.single-container.yaml build
docker compose -f compose.single-container.yaml run --rm --no-deps app init-volume
docker compose -f compose.single-container.yaml up -d
docker compose -f compose.single-container.yaml down
```

Initialization is explicit, only on an empty mount. Do not initialize a restore
destination first: the import mode prepares its fresh disk after preflight.
These commands do not change default `docker compose` / `bun run db:up` or
`./run.sh`. The named volume survives `down`; do not use `down --volumes` on data
you need to retain. Set `DOROB_WEB_PORT` and matching `DOROB_WEB_ORIGIN` together
if changing the local public port.

For raw Docker, create a named volume, run the image with that mount in
`init-volume` mode, then run `start` with the same mount. Mount to `/data` exactly.
Supply `DOROB_DATABASE_PASSWORD` privately and an exact `DOROB_WEB_ORIGIN` (HTTPS
in hosting, no path/query/fragment). `DOROB_DEV_MODE=true` is rejected. The same
database password is required after replacement; it is not silently reset.

## Remote laptop workers

For Darkub remote workers, list HTTP service ports **3000 and 3001** and set
`DOROB_EXPOSE_API=true` in runtime environment variables. Route the website domain
to 3000 and a separate HTTPS API domain (for example `https://api.your-domain.ir`)
to 3001. Do not expose PostgreSQL port 5432. Keep `DOROB_WEB_ORIGIN` set to the
website origin; the web app continues calling the API over loopback.

On the laptop, set `DOROB_BACKEND_URL` to the HTTPS API origin and provide
`DOROB_ADMIN_TOKEN` privately through the environment. Existing ingestion and
embedding commands use those settings and send bearer authorization. The token
has full management access. No browser CORS configuration is needed for these
command-line workers. The internal `/internal/admin-auth` endpoint checks the
actual socket peer and rejects remote peers even with spoofed Host or forwarding
headers. Missing peer information is rejected as well.

The image must be rebuilt from these changes before exposure will work. Dockerfile
port declarations alone do not enable a listener. The separate local Compose
runner still publishes only website port 3000; it does not opt into API exposure.

## Startup, probes and shutdown

Startup validates disk/configuration, initializes only an empty prepared cluster,
waits for a real PostgreSQL query, prepares pgvector with the maintenance role,
executes the migration bundle, waits for API/auth readiness, then starts Next.
Standalone API startup still never migrates. API/web use child-specific protected
environments; the web child receives no database password or DATABASE_URL.
No collector, embedding worker, model server or laboratory starts with the image.

The total normal startup allowance is 120 seconds. `DOROB_STARTUP_SECONDS` accepts
1–1800 seconds; individual startup commands are also bounded to 30 seconds.
Migration errors/checksum mismatches and essential-child exits cause nonzero exit
after sibling shutdown. There are no internal service restart loops. Configure
the platform to restart a failed container only after the previous instance has
released the disk; never overlap replicas.

- `/health/live`: web handler liveness without SQL.
- `/health/ready`: completed supervisor startup, real bounded API/database query,
  required directory permissions and actual app-directory read/write access.
  Responses contain only generic status; the overall response deadline is 4.9s.
- `node /app/container/health.mjs`: image readiness command, five-second deadline.
  Docker defaults: 15s interval, 6s timeout, 130s startup allowance, three retries.

If increasing startup time, increase the platform/Docker startup-probe allowance
accordingly. Readiness may refuse connections before the web service starts.
On SIGTERM, readiness becomes false; web stops first, API drains next, PostgreSQL
receives fast clean shutdown last. The total shutdown budget is 60s (web 10s,
API 12s, PostgreSQL 30s, with escalation allowance). Forced termination exits
nonzero. Require at least **75 seconds** platform termination grace.

## Authentication maintenance

The dedicated protected API startup message discloses the operator token; log
access grants admin access. Token/session semantics are unchanged. The credential
file survives image replacement. Container service/lifecycle records carry a
runtime identity. Under the exclusive outer lease, bootstrap removes registrations
matching the prior container identity and atomically installs the next identity.
Unknown or standalone-host registrations require offline inspection; bootstrap
does not erase them based only on a possibly reused PID. Ordinary host rotation
continues to refuse live processes and stale lifecycle locks.

Stop the whole app, then run the same image/disk in `rotate-auth` mode. The next
normal API startup prints the replacement token. Previous tokens and browser
sessions are invalidated. Rotation against a currently leased disk fails.

Portable catalogue exports exclude auth. To retain credentials for disaster
recovery, make a **separate** private backup while the app is stopped:

```sh
docker run --rm --platform linux/amd64 \
  --mount type=volume,src=YOUR_DATA_VOLUME,dst=/data \
  --mount type=bind,src=/absolute/private/auth-backup,dst=/auth-backup \
  dorob:local backup-auth
```

Prepare that separate backup directory with mode 0700; the new credential file is
0600. Only `credential.json` is copied, never runtime registrations/locks. For the
existing host setup, stop API/web and copy that one credential file privately
from `apps/api/storage/auth`, retaining 0600 permissions. Do not copy the entire
auth directory. Store the backup separately from portable catalogue archives.

Optional recovery runs `restore-auth` with the same backup mount read-only and a
fresh imported disk, before first normal boot. It refuses existing credentials;
it does not overwrite a token already generated by a deployment. The recovered
file is owned by 10001 with private permissions. Without explicit recovery,
first startup generates a fresh deployment token.

## Explicit catalogue export

Use an operator-established write-free window: stop web/API, all ingestion and
embedding processes, direct database writers and editorial clients. The tool
additionally holds SHARE locks across all user tables while fingerprints, dump
and assets are captured. These locks do not fence filesystem writers; stopping
all asset writers remains mandatory. No live physical PGDATA copy is supported.

For a single-container source, stop it and invoke offline export with the same
disk. Supply secrets through a private environment file, not command arguments:

```sh
docker run --rm --platform linux/amd64 \
  --env-file /absolute/private/container.env \
  --mount type=volume,src=YOUR_DATA_VOLUME,dst=/data \
  --mount type=bind,src=/absolute/private/empty-export,dst=/transfer \
  -e DOROB_WRITERS_STOPPED=yes dorob:local export
```

The export directory must be empty, on a separate mount outside `/data`; tooling
sets it to 0700 and its files to 0600. Export starts only PostgreSQL, without
migrations or app listeners, and shuts it down cleanly when capture finishes.

For the existing development Compose source, leave only its PostgreSQL running.
Use its actual private DATABASE_URL in the environment file, with loopback port
5432 **inside the shared container network namespace** (not the host port):

```sh
docker run --rm --platform linux/amd64 \
  --network container:"$(docker compose ps -q postgres)" \
  --env-file /absolute/private/compose-source.env \
  --mount type=bind,src=/absolute/Dorob/apps/api/storage/thumbnails,dst=/source/thumbnails,readonly \
  --mount type=bind,src=/absolute/Dorob/apps/api/storage/staging,dst=/source/staging,readonly \
  --mount type=bind,src=/absolute/private/empty-export,dst=/transfer \
  -e DOROB_TRANSFER_ROOT=/source -e DOROB_WRITERS_STOPPED=yes \
  --entrypoint node dorob:local /app/container/transfer.mjs export
```

Each portable export contains `database.dump`, `assets.tar` and a private
`manifest.json`. It includes all application tables/history, migration identity,
PostgreSQL/extension versions, locale, canonical sorted row SHA-256 fingerprints,
catalog-definition schema identity, archive SHA-256 checksums and every retained
historical/staged asset hash. Runtime ownership/ACLs and incidental dump ordering
are excluded from schema identity. Known temporary writes are excluded; missing
referenced historical or staged assets fail verification without repair.

## Fresh-disk import and verification

Use only **operator-trusted exports**. Checksums detect corruption, not trusted
authorship; a PostgreSQL dump can execute SQL. Current compatibility is PostgreSQL
17, UTF-8/libc locales available in the image, pgvector 0.8.7 and plpgsql. Other
extensions, fingerprint algorithms and major versions are refused before writes.
Transfer operations default to a one-hour deadline; `DOROB_TRANSFER_SECONDS`
accepts 1–86400 seconds independently from normal startup allowance.

Create a fresh empty destination volume; do not run init-volume first:

```sh
docker run --rm --platform linux/amd64 \
  --env-file /absolute/private/destination.env \
  --mount type=volume,src=YOUR_FRESH_VOLUME,dst=/data \
  --mount type=bind,src=/absolute/private/verified-export,dst=/transfer,readonly \
  dorob:local import
```

Preflight checks archive hashes, versions, locale and the complete asset archive
namespace before preparing the destination. Asset extraction accepts only flat
content-key WebP files beneath thumbnails/staging; traversal, absolute paths,
links, unexpected headers/entries, duplicate paths and overruns are refused.
Limits are 100,000 assets, 512 KiB per asset and 32 GiB per archive. Extraction
uses explicit bounded file creation; it never invokes unrestricted root tar.

Import writes an incomplete marker before cluster initialization. It creates a
restricted destination application role, pre-creates vector with maintenance
privileges, filters vector extension creation/comment entries and restores with
source ownership/ACLs omitted. It does not run app migrations before baseline
verification. Schema/ledger, every user-table count/fingerprint, vector round-trip
and every historical/staging asset hash must match before marking verified.
The private report is `/data/restore-verification.json`; copy it off-disk for
review. A failed comparison can leave `/data/restore-failure.json` for inspection.

Existing data, prior incomplete imports or retained files are never overwritten.
After any failed/interrupted import, retain it for inspection and select another
fresh disk; there is no merge/wipe/repair mode. Normal startup refuses incomplete
imports. A successful import preserves publication state without inference,
collection, re-judging or publication. Only subsequent normal startup applies
pending migrations, after the restored baseline was verified.

## Darkub preflight, cutover and rollback

1. Build and verify Linux AMD64 locally; publish a reviewed immutable image only
   through a separately authorized release. Provisioning/publication are not
   performed by this change's apply workflow.
2. Confirm Darkub supports this image architecture, an actual `/data` disk mount
   with working nonblocking kernel locks, exactly one replica, recreate updates
   and **stop-before-replace** behavior. Verify the lease using two disposable
   instances on the actual filesystem before moving live data.
3. Confirm private secrets, exact HTTPS origin/domain, website-only ingress,
   startup/readiness/liveness settings and at least 75s termination grace. These
   are platform preflight requirements, not verified account-specific settings.
4. Allocate CPU/RAM for PostgreSQL, Node, Bun and bounded Sharp workers together.
   Measure peak requests/raster load, not only idle usage. Reserve disk for the
   catalogue, all historical assets, staging, WAL and growth. Local synthetic
   acceptance is not a production capacity benchmark. No inference is included.
5. Fence the live source and export. Verify it and copy the complete bundle to
   storage **outside the deployment disk** before transferring. Keeping the only
   backup on `/data` is not disaster recovery. Retain original source volumes and
   archives; do not remove them after rehearsal or traffic switch.
6. Transfer the trusted bundle privately, import into a fresh destination and
   review the private verification report. Optionally restore separate auth
   state before boot; otherwise obtain the fresh token from protected logs.
7. Start normal service and verify public catalogue/groups/images, login,
   protected operations, aggregate readiness and retained data before explicitly
   switching traffic. No traffic switch is automatic.
8. If rejected before destination writes, stop the destination and explicitly
   reactivate the retained source. After destination writes, preserve a new
   destination export and plan reconciliation before rollback; do not silently
   revert to an older catalogue. Never automatically downgrade migrations or
   restore an archive over the working disk.

For subsequent releases, capture a verified off-disk backup first, stop the sole
instance, replace its image using the same disk/secrets, and verify readiness.
Schema compatibility determines whether code rollback alone is safe.


## Acceptance tooling

The checked-in helpers create owned disposable fixtures and require Docker plus
Python on the development host. `check-lifecycle.py`, `check-storage.py`,
`check-timeout.py`, `check-runner.py` and `check-context.py` verify the contracts
summarized in validation. `node --test scripts/container/archive.test.mjs` covers
bounded extraction security. `check-import.py VERIFIED_SYNTHETIC_EXPORT_DIRECTORY`
checks rejected/interrupted imports without changing the original bundle. The
explicit `seed-acceptance.ts` fixture requires its synthetic acknowledgment and
an empty disposable catalogue; it is not part of the production image.

Acceptance helpers and source fixtures are excluded from the final runtime copy.
The private synthetic restore report is retained outside Git; no working catalogue
export or live cutover is implied. Remaining extended browser/mobile acceptance
can be completed separately without changing the built image.

## Archive and release status — October 22, 2026

The owner approved syncing and archiving this change with task 4.1 still
unchecked for additional mobile/keyboard browser acceptance. Both capabilities
are synced to main specs (15 requirements); all 24 main specs pass strict
validation. The Dockerization implementation and archive are included in the
owner-authorized commit. Hosting preflight, live catalogue transfer and cutover
remain separate operator work. No image publication, deployment or push is included.
