# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian-only RTL course discovery and comparison product. Phase 1's design system is accepted; **phase 2 is complete for now**, by owner decision on October 4, 2026. Phase 3 includes an independent local API/PostgreSQL foundation and manual curated catalog APIs. The dedicated course catalogue and bounded homepage shelf read the local public catalog; group cards and destinations use retained comparison editions and their evaluated provider facts. The homepage hero shelf also uses a selected real group; design-system fixtures remain separate. Production deployment remains pending.

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

The completed `add-course-group-catalog` change is
[archived](openspec/changes/archive/2026-10-21-add-course-group-catalog/) on
October 21, 2026, with all 20 tasks complete. Its four delta capabilities are
synced to main specs, including the new [course-group catalogue](openspec/specs/course-group-catalog/spec.md).
All 19 main specs pass standard validation; strict validation reports one
506-character preservation-requirement warning. The known Bun production-build
limitation remains documented in [validation](docs/validation.md).

The completed `add-course-catalog-page` change is
[archived](openspec/changes/archive/2026-10-21-add-course-catalog-page/) on
October 21, 2026 with 20/20 tasks complete. The new individual-course catalogue,
homepage discovery and public course filter deltas are synced to main specs;
all 20 main specs pass strict validation. Direct provider navigation, explicit
RTL search inputs and the restored compact course count are included.

The frontend refactor is [archived](openspec/changes/archive/2026-10-22-refactor-frontend-components/) on October 22, 2026 with 17/17 tasks complete. Its homepage-preservation requirement is synced to main specs; all 20 main specs pass strict validation. Follow-up artwork and provider-logo fixes are included. See [ownership and verification](docs/frontend-refactor.md).

## Current experience

- `/`: group-first search opening `/groups`, up to three judged-group cards, and a separate six-course horizontally scrollable shelf with direct provider links and an all-courses link. Category cards open the filtered group catalogue; the selected blue hero displays three courses from the real Python starter group.
- `/groups`: server-rendered group catalogue with search and one category filter, twelve groups per page, URL-backed `q`, `category` and `page`, active chips and a mobile category panel. Example: `/groups?q=Python&category=code&page=2`. The duplicate results heading is visually hidden while its accessible label and keyboard focus target remain. No provider, price, level or sort filters.
- `/courses`: server-rendered individual-course catalogue with normalized search, provider, pricing-status and content-duration filters, eighteen results per page, URL-backed state, chips and mobile filters. No category or level filter.
- `/design-system`: approved سنجش / لاجورد design, the supplied ring-and-cap logo, Vazirmatn, semantic tokens, interactive discovery examples, and component previews. Most examples are fictional; course-card snapshots are dated explicitly.
- `/groups/[id]`: eligible stored-slug destinations reuse the selected Python layout with retained AI hero text, exact judgment order, tags and assessments alongside their exact evaluated provider facts. Galleries, pinned course pagination and retry states are supported. Legacy `/groups/python-beginner` and `/groups/n8n` redirect to their canonical real slugs; other fixture-only destinations return 404 unless an eligible real group has that slug.

The hero shelf selects `python-starting-programming`, requires at least three eligible courses, and links its first three judged members to their comparison rows. Unavailable selections never fall back to dated samples. Homepage search targets groups; both catalogue conditions and page survive reload and Back/Forward in the URL. Course prices are retained observations, not current provider quotations. Individual course results use ingestion-time order; group comparisons preserve the selected judgment’s order. Visits do not run models, collect courses or refresh judgments. Scheduled refresh and production deployment remain deferred. See [frontend behavior and decisions](docs/frontend.md) and [snapshot provenance](docs/provider-snapshots.md).

The hero action «دیدن مجموعه دوره‌ها» jumps to the homepage group section.
Breadcrumbs share «صفحه‌ی نخست» and clickable catalogue/category ancestors.
The provider strip includes all five bundled provider identities; at 700px and
below, a vertical logo/name wheel replaces it. Provider animation continues on
hover, has no pause button, and honors reduced-motion preferences.

The frontend refactor gives branding, provider/category presentation, Persian
formatting, prices, catalogue controls and bounded public reads shared owners.
Product styles are independent of reference layout; unused prototype branches and
logo/Python fixture assets are retired. `/design-system` retains current isolated
examples. See the [ownership/removal inventory](docs/frontend-refactor.md) and
[verification results](docs/validation.md#frontend-refactor--october-21-2026).

The public `/groups` and `/courses` catalogues share their results toolbar,
responsive sidebar/modal layout, loading feedback and pagination focus behavior.
Their filters, cards, URLs and page sizes remain domain-specific. The completed
[unify-public-catalog-controls](openspec/changes/archive/2026-10-22-unify-public-catalog-controls/)
change is archived with all ten tasks complete and five requirements synced to
[public-catalog-controls](openspec/specs/public-catalog-controls/spec.md).
All 21 main specs pass strict validation; see [catalogue validation](docs/validation.md#unified-public-catalogue-controls--october-22-2026)
for tests, responsive checks and the existing production-build limitation.

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
retain their samples; the homepage course shelf and `/courses` connect to the launched API.

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

The homepage course shelf and `/courses` need the local API/database; frontend-only development shows a scoped course error with retry. `DOROB_API_URL` is optional when using the default API port. No API keys or remote fonts are required. Vazirmatn is bundled locally; its license is included in the installed font package.

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
DOROB_DEV_MODE=true bun run test:api
bun run build:api
bun run start:api
```

Root lint and typecheck also include the API. Build the API before `start:api`; output is ignored under `apps/api/dist`.

Install and start Docker Desktop (or another Docker engine with Compose v2) before `db:up`. Compose runs the digest-pinned upstream `pgvector/pgvector:0.8.7-pg17-bookworm` image (PostgreSQL 17.11 with pgvector 0.8.7), binds to `127.0.0.1:5432`, waits for `pg_isready`, and stores data in the `postgres_vector_data` named volume. Migration 004 enables the bundled `vector` extension. The [migration and recovery record](docs/pgvector-migration.md) documents the restore-verified move and retained original volume. The example uses database/user `dorob` and development password `dorob_dev`. API startup does not require a reachable database.

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
API_INTEGRATION=1 DOROB_DEV_MODE=true bun run test:api
```

Default API tests run offline with the explicit test-only dev mode shown above; protected-mode tests inject their own credentials. Database/signal tests are explicitly skipped unless enabled. To smoke-test recovery without restarting the API, run `bun run db:down`, confirm readiness 503 and greeting/liveness 200, then `bun run db:up` and confirm readiness 200. Repeat endpoint checks after `build:api` / `start:api`. Actual validation, temporary-record persistence results, and remaining limitations are in [validation](docs/validation.md).

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

The local catalog adds explicit SQL migrations, minimal course references, editor-defined groups, and many-to-many assignments. See [catalog setup and workflow](docs/catalog.md). It has no ORM or cloud deployment; management now uses shared-token authentication. The homepage course section reads eligible current observations; group cards and destinations read retained comparison editions. The real-group hero and independent design-system fixtures remain separate.

October 12 initial curation researched all 1,495 existing course references and
created seven verified draft groups with 17 explicit memberships across all six
categories. Python, data visualization and n8n include multiple providers;
Photoshop, negotiation, A1 conversation and Excel currently have supported
members from Maktabkhooneh only. The [curation report](docs/curation/initial-course-groups.md)
records exact evidence, persisted IDs, category limits and the restore-tested
pre-work database backup. Drafts await owner review and remain absent from
public group/category eligibility. Publication and automatic assignment remain separate editorial/automation work;
public group frontend integration is delivered for eligible published judged groups.


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

The parser accepts both `course-page-…` and `course-page:…` embedded-data keys,
while requiring the embedded course slug ID to match the requested URL.

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

The homepage `#courses` shelf and `/courses` catalogue read
the public course API. The real hero, group catalogue and group routes read
retained judged-group editions; design-system fixtures stay independent. `/courses`
filters by provider, pricing status and content duration without category or level
controls. The legacy API category filter uses published editorial memberships;
unassigned ready courses remain discoverable without category inference.
Pagination uses offsets and can shift during concurrent ingestion. API reads
display retained facts and never scrape.

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
with retry while static content and independent design-system examples remain usable.

Focused shared/web verification: run each `*.test.ts`/`*.test.tsx` under
`packages/core/tests` and `apps/web/tests` with `bun test <file>` in its own process
to isolate module mocks. Route acceptance also includes
`bun test apps/web/acceptance/course-catalog.test.tsx`.

Real public course cards summarize source instructors below their titles and expose the retained Jalali collection date through the price button. Titles and «مشاهده دوره» open the retained provider course page directly in a new tab; the retired details dialog is removed. Prices remain observations, not current provider quotations. Chrome acceptance for this refinement passed at mobile and desktop widths; see [validation](docs/validation.md#homepage-card-refinement--october-11-2026).

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
two members for public eligibility. Public judged-group cards/routes additionally require a complete retained judgment and ready evaluated facts/images for every assessed member.
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
Administration requires the persistent operator token by default. Explicit
`DOROB_DEV_MODE=true` bypasses protection for trusted loopback development only.
See [admin access](docs/admin-access.md) for login, client headers, private storage
and rotation. Shared-network deployment remains separate work. No migration publishes the seven existing drafts.

The completed `add-course-group-admin` change is [archived](openspec/changes/archive/2026-10-16-add-course-group-admin/)
on October 16, 2026. All 27 tasks are complete, its three behavior contracts are
synced to main specs, and all 12 main specs pass strict validation.

### Independent local embedding laboratory

`bun run build:lab` then `bun run start:lab` opens a separate Persian experiment
workbench at [127.0.0.1:3010](http://127.0.0.1:3010). `bun run dev:lab` is the lab's
own development entry point. Existing app/launcher commands do not start it.

Explicit read-only capture, installed BGE-M3/Ollama generation, immutable cached
runs, overlapping discovery, comparison, local feedback and evidence export/reimport
are implemented under `apps/embedding-lab`. Saved results work offline; generation
requires explicit action. `output/` is ignored and should be backed up separately.
No production schema, suggestion inbox or membership integration is included.
See [setup and commands](apps/embedding-lab/README.md), the [real-results walkthrough
and separate synthetic benchmark](docs/embedding-lab.md), and [validation](docs/validation.md#embedding-laboratory--october-16-2026).
Focused checks: `bun run lint:lab`, `bun run typecheck:lab`, `bun run test:lab`,
`bun run build:lab`.

### Catalog embedding integration

Saved discovery results are available at
[پیشنهادهای گروه‌بندی](http://127.0.0.1:3000/admin/discoveries), alongside group
administration. Use the same local API/database setup and server-only
`DOROB_API_URL`. Run selection, candidate selection and pagination survive reloads
and browser back/forward. Retained and suppressed collections are browsed separately.
Current course inspection is labelled separately from frozen run evidence;
similarity scores are experimental, not calibrated confidence or course quality.
No completed runs/collections produces an explicit empty state. Execute discovery
separately with `bun run worker:embeddings discover`; opening the page never
starts inference or generates group titles.

Use «مرتب‌سازی مجموعه‌ها» to show highest experimental mean similarity or most
courses first. Ordering covers the entire selected run and retained/suppressed
set before pagination. Equal values use stable candidate-ID ties. The URL retains
the order across reloads and navigation; changing it clears selection and returns
to page one. The default preserves the original ordering.

The review desk saves candidate approval/dismissal/return to pending using observed
versions and stable request IDs. Optional titles/notes are editorial annotations.
Approval creates no group or membership. A separate form creates one empty,
unpublished draft for a current, retained, approved candidate; partial evidence
requires an explicitly saved candidate-scoped acknowledgement. Promotion requests
are saved in session storage before sending; uncertain outcomes permit identical
replay only. Persisted promotion lookup recovers existing drafts even in another
session. Delivery and retry are explicit actions with cumulative counts, then
`/admin/groups/:id` handles membership approval and publication separately.
Browser storage must be available for safe new promotion; backend recovery reads
remain available if storage is unavailable. Administration remains trusted,
loopback-only, with management protected by the shared admin token unless explicit dev bypass is enabled.

The course-focused desk includes retained thumbnails and compact summaries, with
notes and detailed evidence behind disclosures. Full isolated browser-to-API
acceptance (in addition to ordinary web/core tests) can be run with
`API_INTEGRATION=1 bun test apps/web/acceptance/discovery-review.test.tsx`.
Its separate server-capable test type check is
`bun apps/web/node_modules/typescript/bin/tsc -p apps/web/tsconfig.integration.json`;
server fixture imports stay outside the frontend's normal TypeScript scope.

The finite HTTP CLI and backend workflow are implemented. Start the local API with
`./run.sh`, then explicitly run `bun run worker:embeddings generate`, `match`,
`discover` or `both`. Generation uses the installed local BGE-M3 artifact; compatible
vectors are reused and `--force` retains a new immutable revision. No startup hook
runs inference. Migration 004 enables pgvector; 005–006 add application persistence
and integrity constraints. All six migrations are active in the working database.

Matching suggestions use the existing inbox. Discovery review and explicit promotion
create an empty unpublished draft and suggestions for every member; memberships and
publication require separate review. Exact raw scores and provenance are available
through 37 documented endpoint paths under `/api/v1/manage/embeddings` in `/docs`.
The percentage displayed by the existing inbox is a compatibility score, not a
calibrated probability.

For delegated editorial review, give an agent the standalone
[AI group reviewer guide](docs/ai-group-reviewer.md). It reviews the top n eligible
collections in a saved run, chooses group definitions, excludes outliers and
approves retained courses into unpublished drafts through the existing APIs.
The guide includes exact requests, version checks and recovery; it installs no
worker and performs no catalog mutation by itself.

See [commands, evidence, cancellation and recovery](docs/catalog-embeddings.md),
[verified results and capacity](docs/embedding-results.md), and
[database migration/backup recovery](docs/pgvector-migration.md). The independent lab
keeps its existing commands and evidence. Checks include `bun run lint`,
`bun run typecheck`, `bun run test:embedding-engine`, `bun run test:embedding-worker`,
`bun run lint:embedding-worker`, `bun run typecheck:embedding-worker`,
`bun run build:api` and `bun run build:embedding-worker`; database acceptance uses
`API_INTEGRATION=1 DOROB_DEV_MODE=true bun run test:api` with the documented local DATABASE_URL.

October 17, 2026 — Both embedding changes are archived:
[`add-local-embedding-suggestions`](openspec/changes/archive/2026-10-17-add-local-embedding-suggestions/)
(20/20 tasks) and
[`integrate-catalog-embedding-workflow`](openspec/changes/archive/2026-10-17-integrate-catalog-embedding-workflow/)
(24/24 tasks). Their seven capability deltas are synced to main specs; all 16
main specs pass strict validation. The subsequent `add-discovered-group-review`
change adds the browser review desk, recovery read and run-wide sorting. It is
[archived](openspec/changes/archive/2026-10-18-add-discovered-group-review/) on
October 18, 2026 with all 23 tasks complete. Its ten added requirements are synced
to the administration and discovery main specs; all 16 main specs pass strict
validation.
The discovery-review verification passed 63 PostgreSQL API tests and 209 additional tests
in separate processes; the existing frontend Bun build limitation is recorded
in [validation](docs/validation.md).


### Private course-group judgments

Feed the self-contained [AI judge role guide](docs/ai-judge.md) to an HTTP-capable
agent for manually invoked judging. It covers complete evidence review,
SEO-friendly Persian hero writing, substantive strengths/weaknesses and safe
submission. Two or three supported points per list are a target, not a quota;
a course may have no weaknesses. After supplying the file, invoke it with:

```text
Act as the Dorob AI judge using the supplied guide.
API origin: http://127.0.0.1:3001
Group UUID: <replace-with-selected-group-uuid>
System ID: local-course-judge
Mode: judge and submit
Working location: use the permitted task working directory for recovery files.
```

Replace the UUID with an existing group's ID. Use `Mode: review only` to prepare
content without submitting it. The guide is a Markdown role prompt, not an
installed skill or automatic runner. No live judgment run is implied by its
delivery; the API/database and migration must already be available.

The backend now exposes revision-bound judge evidence and immutable judgment
submission/history through seven operations under
`/api/v1/manage/groups/:id/judge-input` and `/judgments`. Discover draft or published
groups through the existing management list, obtain context, then traverse every
member and retained comment/review with one inputRevision. New judgments require
at least two members and the exact member set; 409 restarts stale traversals.
The AI-owned array order is preserved, including expensive-first results. The
four tags are project_based, practice_based, popular and expensive; empty
assessments are valid. Generated prose cannot overwrite provider facts or layout.

Migration 007 adds a private immutable ledger and runs through the usual explicit
`bun run db:migrate` workflow; startup never migrates. `(systemId,submissionId)`
is globally unique. Exact retries recover the original record after source changes;
readback reports computed freshness and retains its complete input manifest.
Acceptance does not certify quality or change membership/publication. For published,
fully presentation-ready groups, public comparison reads automatically select the
newest complete ready retained edition. Model execution remains explicitly invoked; no separate
judgment approval gate is added. Keep management on trusted loopback.

See [traversal, bounds, recovery and rollback](docs/catalog.md#course-group-judge-evidence-and-judgments),
[shared contract](packages/core/src/group-judgments.ts),
[synthetic request](packages/core/examples/group-judgment.json), and `/docs`.
The older assessment draft's numeric ranking and extra tags are superseded by this
standard. Offline checks are included in `DOROB_DEV_MODE=true bun run test:api`; isolated PostgreSQL
acceptance uses `API_INTEGRATION=1 DOROB_DEV_MODE=true bun run test:api` as documented above.

The spec-driven judgment change is [archived](openspec/changes/archive/2026-10-19-add-course-group-judgments/)
with all 20 tasks complete. Its 14 requirements are synced to the
[judgment main spec](openspec/specs/course-group-judgments/spec.md); all 17 main
specs pass strict validation. Pre-commit verification is recorded in
[validation](docs/validation.md#judgment-pre-commit-verification--october-19-2026).
Archival does not apply migration 007.

The documentation-only `add-ai-judge-guide` change is
[archived](openspec/changes/archive/2026-10-19-add-ai-judge-guide/) with all
11 tasks complete. It has no delta specs to sync; the existing judgment contract
is unchanged. The owner-authorized local database operation subsequently applied
migration 007 after a full backup, with all 30 existing data-table fingerprints
unchanged and the judgment history read verified. See
[guide validation and operational results](docs/validation.md#ai-judge-guide-and-local-migration--october-19-2026).

### Public judged-group comparisons

The homepage group cards, `/groups` catalogue and `/groups/<stored-slug>` use one
retained comparison edition: a judgment plus its exact immutable source snapshots.
Working additions, source refreshes and definition edits leave that edition visible
unchanged. Newly approved courses wait for the next complete ready judgment; prices,
ratings, titles, images, dates, counts and order switch together on replacement.
Individual-course results independently use latest retained observations.

Existing `DOROB_API_URL` and launcher setup remain; no migration or extra data copy
is needed. Publish before judging. Unpublishing or removing an assessed member
hides the edition; removing a waiting member does not. Selected asset loss cannot
borrow another snapshot or fall back to older history. Management `isCurrent`
still flags working changes, and new judgments still require the current revision.
Pins survive working changes and return 409 on replacement/withdrawal. Retain both
historical source records and hosted assets in backups. No inference, collection,
public stale notice or fixture fallback is added. Rollback restores current-only
visibility without rewriting data. See [frontend behavior](docs/frontend.md#public-judged-group-frontend--october-19-2026)
and [public contracts](docs/catalog.md#public-judged-groups--october-19-2026).

The completed `connect-public-group-judgments` change is
[archived](openspec/changes/archive/2026-10-20-connect-public-group-judgments/)
with all 21 tasks complete. Its public judged-group contract and homepage
preservation update are synced to main specs; all 18 main specs pass strict
validation. See [validation](docs/validation.md#public-judged-group-pre-commit-verification--october-20-2026)
for the pre-commit checks and production-build limitation.

October 21, 2026 — Owner follow-up: public course titles and «مشاهده دوره»
open the course's retained provider page directly in a new tab. The early-stage
local details dialog has been removed from public course browsing; price-date
tooltips remain. Public course detail APIs and independent design-system fixture
previews retain their separate contracts.

The retained comparison change is [archived](openspec/changes/archive/2026-10-22-retain-published-group-comparisons/)
with all 13 tasks complete. Its seven modified and two added public-judgment
requirements are synced to the main spec. Verification and the existing Bun web
production-build limitation are recorded in
[validation](docs/validation.md#retained-public-comparison-editions--october-22-2026).


October 22, 2026 — `polish-public-frontend` is archived at
[`2026-10-22-polish-public-frontend`](openspec/changes/archive/2026-10-22-polish-public-frontend/)
with all four artifacts and 12 tasks complete, including removal of all public
purchase-option disclosures. Its seven added requirements are synced to the
three existing main specs, and all 21 main specs pass strict validation. The
known Bun production page-data limitation remains. See
[validation](docs/validation.md#public-frontend-polish--october-22-2026) for
browser coverage and checks.

### MVP admin authentication

Normal `./run.sh` enables token protection. The API prints its persistent admin
token once at startup; enter it at `/admin/login`. API and web share private
`DOROB_AUTH_DIR` state. `DOROB_DEV_MODE=true ./run.sh` explicitly bypasses protection
for trusted local development. Ingestion and embedding commands accept
`DOROB_ADMIN_TOKEN` through the environment. Stop API and web before
`bun run auth:rotate`; rotation invalidates previous tokens and browser sessions.
See [admin access and session lifecycle](docs/admin-access.md). Docker packaging,
data transfer and hosted deployment are still separate work.

The admin-token change is [archived](openspec/changes/archive/2026-10-22-add-admin-token-auth/)
with all artifacts and 20/20 tasks complete. Its three capabilities are synced to
main specs; all 22 main specs pass strict validation. See the
[pre-commit checks](docs/validation.md#admin-token-pre-commit-verification--october-22-2026).
