# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian-only RTL course discovery and comparison product. Phase 1's design system is accepted; **phase 2 is complete for now**, by owner decision on October 4, 2026. Phase 3 includes an independent local API/PostgreSQL foundation and manual curated catalog APIs. The homepage course grid now reads the local public catalog; group routes and surrounding samples remain fixtures. Production deployment remains pending.

Start with the [documentation hub](docs/index.md), [project plan](Plan.md), and [contributor instructions](AGENTS.md).

`backend-restart` starts from completed frontend commit `22931f2`. The previous backend is preserved on `main` at `a95f83f`; [old-backend.md](old-backend.md) records useful lessons for a fresh OpenSpec-based iteration. OpenSpec is initialized for Codex; `introduce-backend-project` implements the fresh local API foundation.

## OpenSpec workflow

OpenSpec CLI 1.14.1 was installed globally with npm on October 9, 2026 (requires Node.js 20.19.0 or higher). Project configuration is in `openspec/config.yaml`, using the `spec-driven` schema; generated Codex skills live in `.agents/skills/openspec-*/`. The completed `introduce-backend-project` change is archived at [2026-10-09-introduce-backend-project](openspec/changes/archive/2026-10-09-introduce-backend-project/). Its verified behavior contracts are synced to [backend-service](openspec/specs/backend-service/spec.md) and [database-connectivity](openspec/specs/database-connectivity/spec.md).

The completed `add-curated-course-groups` change is archived at [2026-10-10-add-curated-course-groups](openspec/changes/archive/2026-10-10-add-curated-course-groups/). Its verified behavior contracts are synced to [course-categories](openspec/specs/course-categories/spec.md) and [course-group-curation](openspec/specs/course-group-curation/spec.md).

The completed `add-course-ingestion-history` change is archived at [2026-10-10-add-course-ingestion-history](openspec/changes/archive/2026-10-10-add-course-ingestion-history/). Its verified behavior contracts are synced to [course-ingestion](openspec/specs/course-ingestion/spec.md) and [course-thumbnails](openspec/specs/course-thumbnails/spec.md).

The completed `redesign-scraper-pipeline` change is archived at [2026-10-10-redesign-scraper-pipeline](openspec/changes/archive/2026-10-10-redesign-scraper-pipeline/). Its contracts are synced to [provider-course-collection](openspec/specs/provider-course-collection/spec.md) and [scraper-worker](openspec/specs/scraper-worker/spec.md). The subsequent free-course bug fix recognizes the provider's `MAKTAB` free type and uses the current LPIC-1 URL; live paid/free ingestion, thumbnails and checkpoint resume passed. See [validation](docs/validation.md).

In Codex CLI or IDE, invoke `$openspec-propose "your idea"`. In the Codex desktop app, select `openspec-propose` from Skills in the sidebar; reload the project if newly installed skills are not visible. Review the proposal, design, specs, and tasks before requesting implementation with `$openspec-apply-change`. Keep each change small and grounded in `Plan.md` and `old-backend.md`.

The completed `connect-homepage-courses` change is archived at [2026-10-11-connect-homepage-courses](openspec/changes/archive/2026-10-11-connect-homepage-courses/). All 20 tasks are complete; its contracts are synced to [homepage-course-catalog](openspec/specs/homepage-course-catalog/spec.md) and [public-course-catalog](openspec/specs/public-course-catalog/spec.md), and all ten main specs pass strict validation.

The completed `migrate-remaining-providers-v3` change is [archived](openspec/changes/archive/2026-10-12-migrate-remaining-providers-v3/). All 28 tasks are complete; its provider collection and worker contracts are synced to main specs, and all ten main specs pass strict validation. Bounded paid/free ingestion, hosted images, replay and mobile/desktop browser evidence are recorded in [validation](docs/validation.md#remaining-provider-migration-acceptance--october-12-2026).

## Current experience

- `/`: public-catalog course grid with Persian search, editorial category/free filtering, pagination and real-course details; the selected blue hero and cycling course-group covers retain saved samples.
- `/design-system`: approved سنجش / لاجورد design, the supplied ring-and-cap logo, Vazirmatn, semantic tokens, interactive discovery examples, and component previews. Most examples are fictional; course-card snapshots are dated explicitly.
- `/groups/[id]`: three topic destinations with course information and comparison interactions. `/groups/python-beginner` uses the selected eight-course Python prototype with real saved facts, a manual cover gallery, and labeled editorial analysis.

The hero and sample groups retain dated provider samples; its beginner Python group has three members, while the Python route previews eight offerings across levels. Reconciling that membership and dedicated results/detail/comparison routes remain follow-ups. Search/filter state resets on reload. Course prices are retained observations, not current provider quotations. The API orders courses by ingestion time; sample group popularity remains illustrative. No live AI, scheduled refresh or production backend is connected. See [frontend behavior and decisions](docs/frontend.md) and [snapshot provenance](docs/provider-snapshots.md).

## Local development

Use Bun 1.3.8 or a compatible release. From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

For the whole local app, install/start Docker Desktop and run `./run.sh` (or
`bash run.sh`). It checks dependencies, starts the Compose dev PostgreSQL database,
waits for health, applies migrations, and launches the backend and frontend with
watching enabled. It prints the app and Swagger links. No API `.env` is required
for the default local database; the launcher supplies the Compose development
connection URL, overriding any `DATABASE_URL` for this run. Other API settings
still load from the environment or `apps/api/.env`.

```sh
./run.sh
./run.sh --port 3002 --api-port 3003 --db-port 5433
```

Default ports are frontend 3000, API 3001 and PostgreSQL 5432. `--port` selects the
frontend port; `--api-port` selects the backend port. `--db-port` overrides Compose's
`POSTGRES_PORT` (otherwise shell/root `.env` configuration applies). The script
also works by full path from another directory. Ctrl+C stops both app processes;
it stops PostgreSQL only if this run started it, preserving its volume and data.
If either app process exits, the launcher stops the other. Frontend fixtures
retain their samples; the homepage course grid connects to the launched API.

For frontend-only development, use `bun run dev` and open `http://localhost:3000`.
Use `bun run dev --port 3002` to select another frontend port.

```sh
bun run lint
bun run typecheck
bun run test:utils
bun run build
bun run start
```

Run `build` successfully before `start`. Lint, type checking, and 134 utility tests pass. Production compilation/types pass, but page-data collection fails under Bun 1.3.8 with `Expected CommonJS module to have a function wrapper`. The experimental Turbopack worker-thread configuration resolves the earlier worker-port failure. The local Homebrew Node executable was previously unable to start because `libllhttp.9.3.dylib` was missing. See [current validation and limitations](docs/validation.md).

The homepage course grid needs the local API/database; frontend-only development shows a scoped course error with retry. `DOROB_API_URL` is optional when using the default API port. No API keys or remote fonts are required. Vazirmatn is bundled locally; its license is included in the installed font package.

## Backend development

The independent `apps/api` workspace uses Bun 1.3.8 and TypeScript. Root `dev`, `build`, and `start` still run the web app. API commands run with `apps/api` as the working directory; Bun loads `apps/api/.env` automatically for development and built-output startup.

```sh
bun run db:up
cp apps/api/.env.example apps/api/.env
bun run db:migrate
bun run dev:api
```

Use the [whole-app launcher](#local-development) to automate the local database,
migrations and both app services, or use the commands above for API-only work.

`DATABASE_URL` is required and must contain a PostgreSQL host, username, password, and database. `HOST` defaults to `127.0.0.1`; `PORT` defaults to `3001` and accepts integers from 1 to 65535. Invalid configuration exits before listening with a credential-safe diagnostic. Example credentials are for local development only; actual `.env` files are ignored.

```sh
bun run lint:api
bun run typecheck:api
bun run test:api
bun run build:api
bun run start:api
```

Root lint and typecheck also include the API. Build the API before `start:api`; output is ignored under `apps/api/dist`.

Install and start Docker Desktop (or another Docker engine with Compose v2) before `db:up`. Compose runs only PostgreSQL `17.11-alpine3.23`, binds to `127.0.0.1:5432`, waits for `pg_isready`, and stores data in the `postgres_data` named volume. The example uses database/user `dorob` and development password `dorob_dev`. API startup does not require a reachable database.

If port 5432 is occupied, use `POSTGRES_PORT=5433 bun run db:up` and change the port in `apps/api/.env`'s `DATABASE_URL` to 5433. Compose reads `POSTGRES_PORT` from the shell or root `.env`; it does not read the API `.env`. Keep that override on later Compose commands. Change API `PORT` independently if 3001 is occupied.

Normal shutdown preserves data:

```sh
# Stop API with Ctrl+C, then:
bun run db:down
bun run db:up
```

**Destructive reset — deletes all local database data:** `docker compose down --volumes`. This is separate from normal shutdown and validation; only run it when you intend to discard the development database.

Open [Swagger UI](http://127.0.0.1:3001/docs), expand the greeting, select **Try it out**, then **Execute**. JavaScript/CSS are served by the API, with no CDN requirement. OpenAPI JSON is at `/docs/json`; requests target the current API origin.

```sh
curl http://127.0.0.1:3001/api/v1/hello
# 200: {"message":"سلام دنیا"}
curl http://127.0.0.1:3001/health/live
# 200: {"status":"ok"}
curl -i http://127.0.0.1:3001/health/ready
# 200: {"status":"ok","database":"up"}
# During a database outage: 503: {"status":"unavailable","database":"down"}
```

Readiness runs `SELECT 1` for every request, with at most five pooled connections, a two-second connection timeout, a four-second PostgreSQL statement timeout, and cancellation at 4.5 seconds. The overall check stays within five seconds plus normal response overhead. Greeting, liveness, categories, and docs remain usable during outages; readiness recovers when PostgreSQL returns. No credentials or internal database errors are returned or logged.

SIGINT/SIGTERM stop the listener and close the pool; cleanup waits up to five seconds for SQL and has a ten-second forced-exit bound. To run real database and process tests (PostgreSQL must be healthy):

```sh
API_INTEGRATION=1 bun run test:api
```

Default API tests run offline; database/signal tests are explicitly skipped unless enabled. To smoke-test recovery without restarting the API, run `bun run db:down`, confirm readiness 503 and greeting/liveness 200, then `bun run db:up` and confirm readiness 200. Repeat endpoint checks after `build:api` / `start:api`. Actual validation, temporary-record persistence results, and remaining limitations are in [validation](docs/validation.md).

The [archived `add-course-ingestion-history` change](openspec/changes/archive/2026-10-10-add-course-ingestion-history/)
has all 22 tasks complete and both behavior contracts synced to strictly validated
main specs. Its implementation adds v3 observation contracts,
explicit saved-v2 conversion, immutable snapshot history, whole-snapshot current
detail, explicit URL/upload processing and hosted WebP assets. The built API
flow verifies history, changed prices/images, retries, reuse and normal restarts.
Standard HTTPS keeps TLS verification and DNS/redirect preflight checks; the
owner temporarily accepts SSRF/DNS rebinding risk without IP pinning for internal
crawler URLs. **TODO:** restore verified IP pinning later. See [catalog setup,
Swagger walkthrough and storage lifecycle](docs/catalog.md#retained-source-observations-v3)
and [validation](docs/validation.md#course-ingestion-history--october-10-2026).
AI, scheduled collection and production deployment remain deferred. Homepage course consumption is implemented through the public presentation API. Maktabkhooneh’s retained v2 export/conversion and public curation contracts remain.
Use `bun run convert:courses --help` for explicit conversion. Keep separate
persistent asset/staging directories configured by `THUMBNAIL_ASSET_DIR` and
`THUMBNAIL_STAGING_DIR`; defaults are ignored under `apps/api/storage`. Back up
permanent images and PostgreSQL together; historical observations/assets are
retained indefinitely and original images are not archived. Built startup needs
installed Sharp/native optional dependencies plus both bundled entry points.

Optional built-service verification (requires temporary-database creation
permission and public httpbin fixture access):

```sh
bun run build:api
bun apps/api/tests/built-ingestion-smoke.ts
```

The local catalog adds explicit SQL migrations, minimal course references, editor-defined groups, and many-to-many assignments. See [catalog setup and workflow](docs/catalog.md). It has no ORM, AI jobs, authentication or cloud deployment. The homepage course section reads eligible current observations; surrounding frontend regions retain saved fixtures.

October 12 initial curation researched all 1,495 existing course references and
created seven verified draft groups with 17 explicit memberships across all six
categories. Python, data visualization and n8n include multiple providers;
Photoshop, negotiation, A1 conversation and Excel currently have supported
members from Maktabkhooneh only. The [curation report](docs/curation/initial-course-groups.md)
records exact evidence, persisted IDs, category limits and the restore-tested
pre-work database backup. Drafts await owner review and remain absent from
public group/category eligibility. Publication, real group frontend integration
and automatic assignment remain separate work.


## Standalone data utilities

Server-only native v3 collectors feed the existing ingestion and thumbnail
lifecycle through explicit commands. Start the local API/database, then run:

```sh
bun run ingest:toplearn --limit 2 --checkpoint apps/utils/output/toplearn-run.json
bun run ingest:sabzlearn --limit 2 --checkpoint apps/utils/output/sabzlearn-run.json
bun run ingest:roocket --limit 2 --checkpoint apps/utils/output/roocket-run.json
```

Each supports `--help`, repeatable `--url`, exclusive `--limit`/`--all`,
`--checkpoint`, `--resume`, `--backend-url`, `--json`, and bounded public feedback
through `--feedback-pages`/`--feedback-items` (defaults 10/500). Resume restores
saved limits and immutable observations; changed settings or legacy exports fail
without network/mutation. Fresh refreshes require a new private checkpoint.
TopLearn, Sabzlearn and Roocket have no supported v2 export command/adapter.
Maktabkhooneh retains its unchanged `scrape:maktabkhooneh` export-only v2 command,
`ingest:maktabkhooneh` native command and explicit saved-v2 conversion. Generated
exports/journals stay ignored under `apps/utils/output/`; collection never starts
automatically and does not assign editorial categories.

Course durations display the nearest whole Persian minute in cards and details; retained source values preserve their precision.

The standalone dashboard and aggregation commands are retired. Existing ignored
exports and journals are preserved. The pure aggregation helper remains only
as a dependency of the unchanged Maktabkhooneh regression test. See
[utility setup and limitations](apps/utils/README.md) and
[provider mappings](docs/provider-adapters.md).

## Workspace

```text
apps/web/       Next.js frontend, component showcase, browser-safe snapshots
apps/api/       Bun/Elysia API, explicit SQL migrations, local catalog/Swagger
apps/utils/     Server-only collectors, explicit ingestion worker and Maktabkhooneh export CLI
packages/core/  Dependency-free category registry and public catalog types
docs/index.md   Documentation hub
Plan.md         Current decisions, phase status, and remaining scope
AGENTS.md       Contributor instructions and commit policy
```

The frontend uses Next.js, React, TypeScript, Tailwind CSS, and Lucide icons. Shared tokens live in `apps/web/src/app/globals.css`; components use shared styles and CSS modules. The shared core package contains browser-safe catalog and ingestion contracts; the explicitly invoked worker lives in `apps/utils`, while a separate UI package remains deferred. Keep scraper/server code and secrets out of browser-safe contracts.

## Contributing

Read `AGENTS.md` and `Plan.md` before changing product scope. Use the documented Bun commands and preserve the lockfile. Never commit without explicit confirmation for the current changes; review affected documentation, staged scope, and checks before committing. Pushes, branches, and history rewriting require separate authorization.

Project-local frontend and RTL skills live in `.agents/skills/`. Preserve their supplied license and attribution. Earlier exploration and implementation checkpoints are in [project history](docs/project-history.md).

## Explicit Maktabkhooneh ingestion

The server-only v3 scraper and resumable worker are available through utility
entry points. TopLearn, Sabzlearn and Roocket now use native v3-only ingestion;
`scrape:maktabkhooneh` remains the unchanged export-only v2 command. Start the local API/database and apply existing migrations, then explicitly run:

```sh
bun run ingest:maktabkhooneh --help
bun run ingest:maktabkhooneh --url 'https://maktabkhooneh.org/course/python-mk346/' --checkpoint apps/utils/output/python-run.json
bun run ingest:maktabkhooneh --checkpoint apps/utils/output/python-run.json --resume
```

Without URL flags, new runs discover at most ten courses. `--limit N` changes
that bound; `--all` explicitly requests full bounded traversal. Selection flags
are mutually exclusive. `--backend-url http://127.0.0.1:3001` (or
`DOROB_BACKEND_URL`) selects a credential-free backend origin. New runs require
new checkpoint files; resume restores saved selections without rediscovery.

The command now defaults to human-readable output. Progress, retries, liveness
and stage failures use stderr; stdout ends with bounded totals, saved checkpoint
state and recovery guidance. Scripts parsing the former default report must add
`--json`:

```sh
bun run ingest:maktabkhooneh --checkpoint apps/utils/output/python-run.json --resume --backend-url http://127.0.0.1:3001 --json > report.json
```

Machine stdout contains exactly one full report or, before a report exists, a
safe fatal-error document. Exit status remains zero for complete work and nonzero
for partial, interrupted or fatal runs. Invoke `--help` alone to print usage.
For an illustrative first-delivery failure in 1,000 selections, the summary says
`delivery pending 1` and `Unattempted selections: 999`, identifies the safe stop
reason, then supplies a quoted command to resume at the matching backend. This
example does not claim that the pending live run has succeeded. See
[CLI output and optional observers](apps/utils/README.md#ingestion-cli-output).

Finish pending work before fresh refreshes. See [worker transitions, private
journals and lock recovery](apps/utils/README.md#private-worker-checkpoints-and-crash-locks).

Accepted facts, hosted-image readiness and editorial website publication are
separate. This command creates retained observations and explicitly processes
images; it does not publish groups or connect frontend fixtures. API startup,
migrations and the launcher do not start collection. Schedules and AI remain deferred; the remaining-provider migration is implemented and verified with bounded paid/free live ingestion, replay and desktop/mobile browser acceptance. Homepage course integration is now implemented separately. Acceptance check
results are recorded in [validation](docs/validation.md).

October 10 dev sampling: the initial ten courses succeeded. A subsequent
100-selection run accepted 99 observations (89 new course records and ten
refreshes), with all 99 hosted thumbnails verified. Pricing was 95 paid and four
unknown; the known free LPIC-1 selection failed with provider HTTP 500 before
extraction. This does not establish a general free-course parser defect.
Private journals and reports remain ignored under `apps/utils/output/`.

### Homepage catalog configuration

Only the homepage `#courses` grid and real-course details read the public API.
The hero shelf/provider strip, topics, sample groups, group routes and design
system retain their saved samples. Categories use published backend editorial
group memberships, so ready unassigned courses can be visible unfiltered while
category results remain empty. Pagination uses offsets and can shift during
concurrent ingestion. API reads display retained facts; they do not scrape.

`./run.sh` supplies its resolved API origin (including `--api-port`) to the web
process as server-only `DOROB_API_URL`; wildcard bind hosts map to loopback.
Standalone web configuration is illustrated in `apps/web/.env.example`:

```sh
DOROB_API_URL=http://127.0.0.1:3003 bun run dev
```

The value must be an HTTP(S) origin without credentials, path, query or fragment.
Default: `http://127.0.0.1:3001`. Browser JSON/image requests use `/api/courses`
and `/api/thumbnails/:assetId` on the web origin. No public API-origin variable,
database setting or credentials are sent to the browser. Five-second deadlines,
validated responses and scoped retry states keep other page regions usable when
the backend is unavailable. Frontend-only mode therefore shows a course error
with retry while fixture routes remain usable.

Focused shared/web verification: `bun test packages/core/tests apps/web/tests`.

Real homepage cards now summarize source instructors below their titles and expose the retained Jalali collection date through the price button. «مشاهده دوره» continues to open the existing details dialog. Prices remain observations, not current provider quotations. Chrome acceptance for this refinement passed at mobile and desktop widths; see [validation](docs/validation.md#homepage-card-refinement--october-11-2026).

The homepage card refinement is [archived](openspec/changes/archive/2026-10-11-refine-homepage-course-cards/) with its instructor, alignment, provenance and details-action contracts synced to the [homepage catalog spec](openspec/specs/homepage-course-catalog/spec.md).

The completed `curate-initial-course-groups` change is [archived](openspec/changes/archive/2026-10-16-curate-initial-course-groups/) on October 16, 2026. All 18 tasks are complete; its curation requirements are synced to main specs and all ten main specs pass strict validation. The seven groups remain drafts awaiting owner review and a separate publication instruction.

October 16 operational follow-up: a one-time editorial pass created 12 empty,
unpublished groups, two per category, after a restore-tested database backup.
All eight existing groups and 17 memberships were preserved; the local catalog
now has 20 groups. See the [draft definitions and recovery report](docs/curation/empty-course-group-drafts.md).
These are AI-drafted editorial scopes; course suggestions, assignment and
publication remain separate actions.

Thumbnail association recovery restored 1,493 eligible homepage courses using
verified retained associations and existing image files, without re-ingestion.
The two pre-existing download/input failures remain. See the
[recovery validation](docs/validation.md#thumbnail-association-recovery--october-16-2026).
Database backups and image files remain ignored local assets outside Git.

### Local group administration

After `bun run db:up` and `bun run db:migrate`, run the loopback API with
`bun run dev:api`, then the web app with:

```sh
DOROB_API_URL=http://127.0.0.1:3001 bun run dev --hostname 127.0.0.1
```

Open [group administration](http://127.0.0.1:3000/admin/groups). Create a draft,
edit its fields, select existing catalog courses manually, inspect retained source
facts, and explicitly publish/unpublish. A saved publication flag needs at least
two members for public eligibility. Public group cards/routes still use fixtures.
The existing frontend-only startup remains available; admin reads show a retry
state if the API is unavailable. The whole-app launcher also supplies the API URL;
its web listener now binds explicitly to `127.0.0.1`.

External callers submit attributed suggestions through the local management API;
review them by confidence in the panel. Approvals add one membership atomically.
Rejections persist across resubmissions until explicitly reopened. Manual additions
are explicit overrides. Confidence and system names are caller-supplied, without
verified identity or quality calibration. AI judging is visibly disabled.
See [management API examples and review semantics](docs/catalog.md#local-group-suggestion-ledger).

Browser requests use concrete `/api/admin/...` handlers. Server-only
`DOROB_API_URL` selects the upstream; requests have five-second deadlines, bounded
validated responses and no caching. Browser mutations require matching Origin.
This is local development administration without authentication: use loopback
listeners and a trusted machine. Authentication, shared-network use and deployment
remain deferred. No migration publishes the seven existing drafts.

The completed `add-course-group-admin` change is [archived](openspec/changes/archive/2026-10-16-add-course-group-admin/)
on October 16, 2026. All 27 tasks are complete, its three behavior contracts are
synced to main specs, and all 12 main specs pass strict validation.
