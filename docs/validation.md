# Validation and known limitations

## Backend foundation — October 9, 2026

The spec-driven `introduce-backend-project` change has all 12 tracked tasks complete and is [archived](../openspec/changes/archive/2026-10-09-introduce-backend-project/) with both main specs synced and strictly validated. It runs on the existing Bun 1.3.8 runtime, with pinned Elysia 1.4.30, `@elysia/openapi` 1.4.16, Swagger UI 5.33.1, and Bun types 1.3.8. Installation and frozen-lockfile verification passed; existing workspace versions were retained.

| Check | Result |
| --- | --- |
| Focused API lint/typecheck/build | Pass. Bundled Bun entry point runs from `apps/api/dist/index.js`. |
| `API_INTEGRATION=1 bun run test:api` | Pass: 12 tests, including real PostgreSQL and process-level SIGINT/SIGTERM checks. |
| Root environment loading | Pass: temporary API `.env` port override loaded through both root `dev:api` and `start:api`; test file removed. |
| `docker compose config --quiet` / `bun run db:up` | Pass: Docker Desktop started, pinned PostgreSQL 17.11-alpine3.23 pulled, service healthy. |
| Database readiness | Real SELECT 1 succeeds; unavailable connection returns false within five seconds. Slow `pg_sleep(30)` fails in about 4.0 seconds; next query on a single-connection pool succeeds, with no slow query left active. |
| Shutdown | SIGINT and SIGTERM pass with idle and in-flight database work. In-flight cleanup takes about 4.1 seconds, below the ten-second bound; listener can be rebound and slow database work is gone. |
| Persistent volume and API recovery | Pass: a unique `validation_…` schema/table held a test record across normal `db:down` / `db:up`. Only that generated schema was dropped afterward; the volume was retained. |
| Local smoke | Dev-mode hello/live/ready succeeded. During database outage, readiness returned 503 in 0.003 seconds while hello/live stayed 200; readiness recovered in 0.013 seconds without API restart. Built-output hello and readiness also succeeded. |
| OpenAPI/local Swagger assets | Handler tests pass: all three operations, readiness 503, relative API origin, locally served JS/CSS, no external HTML asset URLs. Chrome Swagger Try it out / Execute passed: current-origin request returned HTTP 200 and `{"message":"سلام دنیا"}`. |
| Root lint/typecheck / utility tests | Pass: lint and typecheck cover web, utilities, and API; 72 utility tests pass. |
| Default API tests / production build | Pass: six offline tests; six explicit integration skips. API build passes independently of the web build. |
| Web production build | Existing Bun CommonJS failure reproduced after successful compilation and TypeScript, during page-data collection for `/icon.svg`. No web code or runtime changed. |
| OpenSpec / whitespace | `openspec validate introduce-backend-project --strict` and `git diff --check` pass. |

Initial real checks exposed a Bun 1.3.8 cancellation limitation: query cancellation returned while PostgreSQL still ran `pg_sleep`, leaving a connection busy. The implementation combines a four-second PostgreSQL startup `statement_timeout`, a two-second connection timeout, and cancellation at 4.5 seconds. Repeated integration checks then verified release and recovery. No runtime upgrade was needed.

Smoke validation created and removed a temporary API environment file; copy the tracked example before running the API yourself. PostgreSQL's normal restart preserved its named volume. No product tables or migrations were introduced, no volume was removed, and the frontend still reads fixtures. See [backend setup](../README.md#backend-development).

After the owner repaired Chrome control, interactive Swagger execution was verified in Chrome at `http://127.0.0.1:3001/docs`. The request URL matched the running API origin, the server response was 200, and the displayed Persian JSON was exact. API and PostgreSQL remain running locally for review.

Archive/commit verification on October 9 reran root lint/typecheck, 72 utility tests, six offline API tests, the API build, and strict main-spec validation successfully. All 12 API integration tests passed with local network access after sandbox restrictions prevented loopback listeners and database access. The web build again compiled and type-checked successfully, then reproduced the known Bun CommonJS failure during page-data collection for `/`. No new browser review or database restart/persistence check was performed during archiving.

## Frontend milestone — October 4, 2026

Phase 2 is complete for now by owner decision; this does not imply production readiness. The following records preserve that milestone's checks.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web and utilities. |
| `bun run typecheck` | Pass: route generation, web TypeScript, and utilities. |
| `bun run test:utils` | Pass: 72 tests across five files. |
| `bun run build` | Compilation and build TypeScript pass; page-data collection fails with the Bun CommonJS error below. |
| Frontend RTL detector | Zero errors; 25 warnings in the two JSON snapshots, for preserved provider source text/titles with Latin digits. |
| Dashboard RTL detector | Pass: zero errors and warnings. |
| Documentation links and whitespace | Checked before committing the milestone. |

The RTL warnings concern retained source evidence and provider titles, not physical layout properties. Price, duration, date, and count rendering use Persian formatters. The detector is a static floor; it does not replace browser or screen-reader testing.

## Production build

On Bun 1.3.8, Next.js 16.3.7 compiles and type-checks, then fails while collecting page data for `/design-system`:

```text
Expected CommonJS module to have a function wrapper
```

The experimental `turbopackPluginRuntimeStrategy: "workerThreads"` setting avoids the previously reproduced socket-based worker-port failure. The earlier October 2 investigation also reproduced the CommonJS error using Webpack; switching page-data workers to threads did not fix it and was reverted. The existing Homebrew Node executable previously failed to start because `libllhttp.9.3.dylib` was missing. No runtime, dependency, or system installation changes were made for this milestone.

The first build attempt during this check collided with simultaneous Next route-type generation (`ENOTEMPTY` in `.next/types`). A sequential rerun completed compilation/types and reproduced the established runtime blocker. Run Next type generation and production builds sequentially because they share `.next`.

## Browser review coverage

Historical Firefox reviews cover desktop and narrow mobile layouts, Persian and mixed Latin search, course details and Escape/focus restoration, filters, comparison-heading focus, categories/cards, cover galleries, and the local data dashboard. Specific iterations and incomplete checks remain in [frontend](frontend.md), [provider snapshots](provider-snapshots.md), and [project history](project-history.md).

This documentation/commit pass does not claim a new browser interaction review. Comprehensive screen-reader testing, every breakpoint, final Python mobile-card/focus review, and animation/reduced-motion review remain follow-ups. No complete production build or release validation is claimed.

## Data boundaries

Frontend course facts are dated saved samples; analytical copy and ordering are labeled editorial/prototype content. Current standalone adapters emit version 2 and return `derived: null`; frontend snapshots are separate browser-safe fixtures. Utility tests run offline with retained and synthetic fixtures. No new live collection or full-catalog crawl was run for this commit. Broader provider-template sampling, freshness operations, deployment monitoring, and evidence-backed AI evaluation remain future work.

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The local dashboard therefore requires local exports before use. See [utility usage](../apps/utils/README.md).
