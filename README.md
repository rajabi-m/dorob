# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian-only RTL course discovery and comparison product. Phase 1's design system is accepted; **phase 2 is complete for now**, by owner decision on October 4, 2026. Phase 3 includes an independent local API/PostgreSQL foundation and manual curated catalog APIs. Frontend and production integration remain pending.

Start with the [documentation hub](docs/index.md), [project plan](Plan.md), and [contributor instructions](AGENTS.md).

`backend-restart` starts from completed frontend commit `22931f2`. The previous backend is preserved on `main` at `a95f83f`; [old-backend.md](old-backend.md) records useful lessons for a fresh OpenSpec-based iteration. OpenSpec is initialized for Codex; `introduce-backend-project` implements the fresh local API foundation.

## OpenSpec workflow

OpenSpec CLI 1.14.1 was installed globally with npm on October 9, 2026 (requires Node.js 20.19.0 or higher). Project configuration is in `openspec/config.yaml`, using the `spec-driven` schema; generated Codex skills live in `.agents/skills/openspec-*/`. The completed `introduce-backend-project` change is archived at [2026-10-09-introduce-backend-project](openspec/changes/archive/2026-10-09-introduce-backend-project/). Its verified behavior contracts are synced to [backend-service](openspec/specs/backend-service/spec.md) and [database-connectivity](openspec/specs/database-connectivity/spec.md).

The completed `add-curated-course-groups` change is archived at [2026-10-10-add-curated-course-groups](openspec/changes/archive/2026-10-10-add-curated-course-groups/). Its verified behavior contracts are synced to [course-categories](openspec/specs/course-categories/spec.md) and [course-group-curation](openspec/specs/course-group-curation/spec.md).

In Codex CLI or IDE, invoke `$openspec-propose "your idea"`. In the Codex desktop app, select `openspec-propose` from Skills in the sidebar; reload the project if newly installed skills are not visible. Review the proposal, design, specs, and tasks before requesting implementation with `$openspec-apply-change`. Keep each change small and grounded in `Plan.md` and `old-backend.md`.

## Current experience

- `/`: snapshot-backed homepage with Persian search, category/free filtering, shared course cards and details, the selected blue hero, and cycling course-group covers.
- `/design-system`: approved سنجش / لاجورد design, the supplied ring-and-cap logo, Vazirmatn, semantic tokens, interactive discovery examples, and component previews. Most examples are fictional; course-card snapshots are dated explicitly.
- `/groups/[id]`: three topic destinations with course information and comparison interactions. `/groups/python-beginner` uses the selected eight-course Python prototype with real saved facts, a manual cover gallery, and labeled editorial analysis.

The homepage uses 18 dated provider samples; its beginner Python group has three members, while the Python route previews eight offerings across levels. Reconciling that membership and dedicated results/detail/comparison routes remain follow-ups. Search/filter state resets on reload. Prices are snapshots, popularity/order is illustrative, and no live AI, scheduled refresh, or production backend is connected. See [frontend behavior and decisions](docs/frontend.md) and [snapshot provenance](docs/provider-snapshots.md).

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
bun run build
bun run start
```

Run `build` successfully before `start`. Lint, type checking, and 72 utility tests pass. Production compilation/types pass, but page-data collection fails under Bun 1.3.8 with `Expected CommonJS module to have a function wrapper`. The experimental Turbopack worker-thread configuration resolves the earlier worker-port failure. The local Homebrew Node executable was previously unable to start because `libllhttp.9.3.dylib` was missing. See [current validation and limitations](docs/validation.md).

The frontend needs no environment variables, database, API keys, or remote fonts. Vazirmatn is bundled locally; its license is included in the installed font package.

## Backend development

The independent `apps/api` workspace uses Bun 1.3.8 and TypeScript. Root `dev`, `build`, and `start` still run the web app. API commands run with `apps/api` as the working directory; Bun loads `apps/api/.env` automatically for development and built-output startup.

```sh
bun run db:up
cp apps/api/.env.example apps/api/.env
bun run db:migrate
bun run dev:api
```

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

The local catalog adds explicit SQL migrations, minimal course references, editor-defined groups, and many-to-many assignments. See [catalog setup and workflow](docs/catalog.md). It has no ORM, frontend integration, scraper/AI jobs, authentication, or cloud deployment. Frontend data remains saved fixtures.


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
apps/api/       Bun/Elysia API, explicit SQL migrations, local catalog/Swagger
apps/utils/     Standalone TypeScript adapters, export CLI, local data dashboard
packages/core/  Dependency-free category registry and public catalog types
docs/index.md   Documentation hub
Plan.md         Current decisions, phase status, and remaining scope
AGENTS.md       Contributor instructions and commit policy
```

The frontend uses Next.js, React, TypeScript, Tailwind CSS, and Lucide icons. Shared tokens live in `apps/web/src/app/globals.css`; components use shared styles and CSS modules. The shared core package contains only browser-safe catalog contracts; worker and UI packages remain deferred. Keep scraper/server code and secrets out of browser-safe contracts.

## Contributing

Read `AGENTS.md` and `Plan.md` before changing product scope. Use the documented Bun commands and preserve the lockfile. Never commit without explicit confirmation for the current changes; review affected documentation, staged scope, and checks before committing. Pushes, branches, and history rewriting require separate authorization.

Project-local frontend and RTL skills live in `.agents/skills/`. Preserve their supplied license and attribution. Earlier exploration and implementation checkpoints are in [project history](docs/project-history.md).
