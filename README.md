# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian-only RTL course discovery and comparison product. Phase 1's design system is accepted; **phase 2 is complete for now**, by owner decision on October 4, 2026. Phase 3 milestones 1 and 2 are complete and locally validated; milestone 3 placement/retrieval is complete and locally validated with offline model transports; milestone 4 discovery/assessment/publication is complete and locally validated with offline transports; milestone 5 frontend integration and bounded opt-in refresh are complete for local offline acceptance, including desktop/320px keyboard review. Production build readiness remains blocked; live availability and quality remain untested.

Start with the [documentation hub](docs/index.md), [project plan](Plan.md), and [contributor instructions](AGENTS.md).

October 9 checkpoint: the owner has raised product-fit concerns about the backend and proposed an OpenSpec restart. This commit preserves the existing integration/refresh work for reference; it does not establish product acceptance or perform a revert. See [the checkpoint decision](Plan.md#product-vision) and [current commit checks](docs/validation.md#october-9-checkpoint-checks).

Published category/search/group contracts now connect the Next frontend through a server-only data-service boundary. Fixture mode is clearly labeled; backend failures never fall back to samples. Bounded selected refresh is disabled by default and never approves definitions, membership or analysis. See [integration, APIs, modes and refresh controls](docs/frontend-integration.md) and [validation](docs/validation.md).

The Bun backend is in `apps/backend` and the independent pg-boss worker is in `apps/worker`, with separate Docker images sharing PostgreSQL/Drizzle/pgvector. Saved-export imports and manually published factual groups are implemented. Start with [backend setup and operations](docs/backend-operations.md); the [backend handoff](docs/backend.md) records the pipeline. [Discovery and assessment operations](docs/group-discovery-assessment.md) covers retained proposals, Persian draft corrections, evidence review and publication. Bounded manual Maktabkhooneh/Roocket jobs are available; Jev Decisions/embedding clients, PostgreSQL hybrid retrieval and operator placement review are implemented; live model calls and schedules remain disabled by default. Development is local first; cloud hosting remains open.

## Current experience

- `/`: Persian URL-based published group search, broad category/level filters and bounded pagination, with the accepted blue hero.
- `/groups/[id]`: factual offers/source dates and qualified current reviewed comparisons, with stale/partial/unavailable states. Fixture mode uses one three-member Python selection in both discovery and details; the eight-course prototype remains retained design history, with no routed membership or editorial ranking.
- `/design-system`: accepted سنجش / لاجورد, local Vazirmatn, logo and shared semantic components. Showcase examples remain labeled fictional/dated samples.

No ranking, winner or live AI is implied. Unknown values, source currencies and access limits remain visible. See [frontend integration](docs/frontend-integration.md) for contracts and limitations.

## Local development

Use Bun 1.3.8 or a compatible release. From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Stop the server with Ctrl+C. Alternatively use `./run.sh` (or `bash run.sh`); it checks for Bun, installs with the frozen lockfile if Next.js is missing, and starts development. `./run.sh --port 3001` selects another port; the script also works when invoked by its full path from another directory.

```sh
bun run lint
bun run typecheck
bun run test:utils
bun run test:web
bun run build
bun run start
```

Run `build` successfully before `start`. Lint, type checking, and 72 utility tests pass. Production compilation/types pass, but page-data collection fails under Bun 1.3.8 with `Expected CommonJS module to have a function wrapper`. The experimental Turbopack worker-thread configuration resolves the earlier worker-port failure. The local Homebrew Node executable was previously unable to start because `libllhttp.9.3.dylib` was missing. See [current validation and limitations](docs/validation.md).

Default fixture mode needs no database, API keys or remote fonts. Select data mode explicitly when switching:

```sh
DOROB_DATA_MODE=fixture bun run dev
# Start the configured backend separately; published groups are required:
DOROB_DATA_MODE=backend DOROB_BACKEND_URL=http://127.0.0.1:4000 bun run dev
```

These are Next-server settings; use `apps/web/.env.local` if persisting them. Invalid/missing backend configuration produces an unavailable state, with no fixture fallback. Vazirmatn is bundled locally; its license is included in the installed font package.

## Backend and worker

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD and matching DATABASE_URL in .env.
bun run db:up
bun run db:migrate
bun run queue:setup
bun run dev:backend
# In another terminal:
bun run worker
```

The API listens on `http://127.0.0.1:4000`, with `/health/live`, `/health/ready`, and `GET /v1/groups`, `/v1/categories`, and `/v1/groups/:slug`. Public reads require an explicitly published group; private draft reads require the configured operator token. Use `bun run backend:cli --help` for bounded collection/resume, import, group, inspection and publication commands. `.env.example` documents server secrets and explicit model/budget settings; real environment files are ignored and excluded from Docker images.

`bun run test:backend` runs offline tests. `bun run test:backend:integration` runs an isolated ephemeral PostgreSQL/pgvector container and verifies imports, revisions, transactional queue handoff, retry/restart, stale inputs and publication gates. After building the two Docker images, `bun run test:backend:containers` checks separate services, both provider adapters and synthetic decision/embedding/generative transports in two independent workers, shared request limits, operator approval, hybrid retrieval and abrupt kill/resume. `bun run build:backend` builds both Bun entrypoints; root lint/typecheck include the new workspaces. `bun run db:generate` generates reviewed Drizzle migrations.

`docker compose up -d --build backend worker` runs separate containers after explicit migration/queue initialization. The same images can run on separate cloud servers with a shared `DATABASE_URL`. Set dashboard authentication before `bun run dashboard:queue`. See [operations](docs/backend-operations.md) for examples, Docker build targets, private dashboard setup, recovery and current limits.

## Bounded ingestion and placement

Create a JSON file such as `{"providerId":"roocket","urls":["https://roocket.ir/series/learn-python/"]}` or `{"providerId":"maktabkhooneh","maxCourses":2}`. After migrations/queue setup and starting the worker:

```sh
bun run backend:cli collect /absolute/path/collection.json
bun run backend:cli collection COLLECTION_UUID
bun run backend:cli resume COLLECTION_UUID
```

A maximum or explicit URL list is required (up to 100). Inspection accounts for each selected URL, partial failure and interruptions. Resume skips accepted results and preserves the three-attempt budget. Requests coordinate across hosts through PostgreSQL (one request, at least 1500 ms spacing); access denial pauses the entire provider until explicit operator review/unpause. Changed evidence retains published history and requires membership reapproval. See [operations](docs/backend-operations.md#bounded-manual-ingestion) for recovery, limits and approval procedures.

Bounded, resumable ingestion now uses Maktabkhooneh and Roocket, with durable URL/attempt history, provider-wide PostgreSQL request coordination and conservative revision invalidation. Milestone 3 adds versioned provisional taxonomy, Jev Decisions/embedding contracts, lexical/exact-vector candidate retrieval, durable unmatched/review states and PostgreSQL call budgets. Milestone 4 implements bounded discovery, retained definition corrections, evidence-backed unranked assessments and explicit review/publication. Public frontend integration and bounded opt-in refresh are implemented; browser acceptance limits are recorded separately. See the [five backend milestones and current status](docs/backend.md#implementation-order-and-acceptance). Cloud release preparation includes database TLS/connectivity, backups/restore, private operator access, monitoring and the existing frontend build blocker.

Placement commands start with `taxonomy-seed`, explicit `taxonomy-review`/`taxonomy-activate`, and `model-budget`. Use `placement` for classification, embedding or group evaluation; `retrieval-index` and `candidates` for bounded retrieval; `placement-inspect`, `placement-resume`, `placement-cancel` and `placement-review` for review/recovery. `fit` never approves membership itself, and publication is still separate. See the [complete placement workflow and JSON examples](docs/placement.md). Bundled taxonomy and fixtures are provisional/test data, not production human review. No live Jev or embedding request has been performed; no paid embedding model is selected.

## Group discovery, assessment and review

After indexing retained courses and creating an explicit bounded budget, use `discovery` to select retrieved unmatched peers and `proposal` to inspect every candidate. `definition` queues structured Persian draft generation; `definition-edit` appends corrections; `definition-review` explicitly approves the definition and selected current memberships. `assessment` creates a durable request for every approved candidate, and `analysis` displays pending/partial/failed outcomes. `assessment-review` approves qualified output; `publish-reviewed` records separate publication approval. Ranking and badges stay disabled.

```sh
bun run backend:cli discovery /absolute/path/discovery.json
bun run backend:cli proposal PROPOSAL_UUID
bun run backend:cli definition /absolute/path/definition-request.json
bun run backend:cli definition-review /absolute/path/definition-review.json
bun run backend:cli assessment /absolute/path/assessment-request.json
bun run backend:cli analysis ANALYSIS_UUID
bun run backend:cli assessment-review /absolute/path/assessment-review.json
bun run backend:cli publish-reviewed /absolute/path/publication-review.json
```

See [JSON contracts, corrections and recovery](docs/group-discovery-assessment.md). Existing `placement-inspect/resume/cancel` commands also handle discovery/generation/assessment requests within original shared PostgreSQL budgets. Missing live models/credentials do not block offline tests or factual workflows. Production workers have no synthetic fixture mode. No live model call or educational-quality evaluation was performed; taxonomy/model selection, Persian quality calibration and semantic claim review remain human responsibilities. Bun and the lockfile are preserved; the frontend now reads public contracts through an explicit server boundary.

## Opt-in selected refresh

`REFRESH_ENABLED=false`, `LIVE_REFRESH_ENABLED=false` and schedules stay disabled. The private `refresh PATH` CLI accepts an idempotency key, explicit supported providers, retained course/group IDs, mode and a 1–100 total course budget. `refresh-inspect ID` accounts for every collection; `collection-cancel ID` fences in-flight acceptance, and existing `resume ID` preserves attempt limits. Offline jobs require injectable synthetic transports; production workers never substitute live transport. Authorized live refresh additionally needs both flags enabled in the CLI and workers. No live calls are authorized by these examples.

See [request JSON, budgets, recovery and review](docs/frontend-integration.md#opt-in-refresh-and-review). Source changes retain history and require membership/assessment/publication review. Model requests still need the existing separately bounded ledger/configuration; refresh creates no implicit model budget or approval. Schedule enablement remains later work after explicit quality review.

## Standalone data utilities

Four server-side adapters export the [version-2 course contract](docs/course-data-format.md), separately from frontend fixtures:

```sh
bun run scrape:maktabkhooneh --limit 2
bun run scrape:toplearn --limit 2
bun run scrape:sabzlearn --limit 2
bun run scrape:roocket --limit 2
```

Each supports `--help`, explicit URLs, `--all`, `--resume`, and an output path. Generated exports are ignored under `apps/utils/output/`. Version-1 checkpoints require a fresh export without `--resume`; use a new output path to preserve old files. Requests are bounded, obey access rules, and preserve unknown values and source evidence. Public feedback is an anonymous bounded sample, not all student reviews.

To inspect existing local exports:

```sh
bun run dashboard:aggregate
bun run dashboard:data
```

Aggregation expects `apps/utils/output/dashboard-<provider>.json` files by default and supports repeatable `--input PATH` plus `--output PATH`. The read-only dashboard opens at `http://127.0.0.1:8787`; use `--file PATH --port N` for another snapshot/port. It rereads saved data without scraping and omits raw source HTML from browser responses. Generated files must be supplied locally; they are not committed. See [utility setup and limitations](apps/utils/README.md) and [provider mappings](docs/provider-adapters.md).

## Workspace

```text
apps/web/       Next.js frontend, component showcase, browser-safe snapshots
apps/utils/     Standalone TypeScript adapters, export CLI, local data dashboard
apps/backend/   Bun read-only HTTP service, operator CLI and backend tests
apps/worker/    Independent durable pg-boss worker
packages/core/  Browser-safe public DTOs and boundary schemas
packages/db/    Server-only Drizzle schema, access and reviewed SQL migrations
packages/backend/ Server-only import, query, queue and workflow services
infra/          API/worker image targets, private dashboard and isolated test DB
docs/index.md   Documentation hub
Plan.md         Current decisions, phase status, and remaining scope
AGENTS.md       Contributor instructions and commit policy
```

The frontend uses Next.js, React, TypeScript, Tailwind CSS, and Lucide icons. Shared tokens live in `apps/web/src/app/globals.css`; components use shared styles and CSS modules. Backend/core/database packages are implemented for the offline foundation; a shared UI package remains deferred. Keep scraper/server code and secrets out of browser-safe contracts.

## Contributing

Read `AGENTS.md` and `Plan.md` before changing product scope. Use the documented Bun commands and preserve the lockfile. Never commit without explicit confirmation for the current changes; review affected documentation, staged scope, and checks before committing. Pushes, branches, and history rewriting require separate authorization.

Project-local frontend and RTL skills live in `.agents/skills/`. Preserve their supplied license and attribution. Earlier exploration and implementation checkpoints are in [project history](docs/project-history.md).
