# Validation and known limitations

Current checks: October 4, 2026. Phase 2 is complete for now; phase 3 milestones 1 and 2 are complete and locally validated. No production/live integration is active.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web, utilities, backend, worker and shared packages. |
| `bun run typecheck` | Pass: route generation, web TypeScript, utilities, backend, worker and shared packages. |
| `bun run test:utils` | Pass: 72 tests across five files. |
| `bun run test:backend` | Pass: 13 offline configuration/HTTP/validation/bounded-request tests, including retained adapter fixtures. |
| `bun run test:backend:integration` | Pass: 29 real PostgreSQL/pgvector tests; migrations apply twice, schema 43 verified. Both ingestion adapters, partial discovery/selection, duplicate delivery, retry/resume/cancellation, independent connections, session locks/leases, stale-response fencing, immutable inputs, rollback/outbox handoff and approval/publication gates checked. |
| `bun run build:backend` | Pass: both Bun backend and worker entrypoints. |
| API/worker Docker image builds | Pass: pinned Bun 1.3.8, frozen filtered production installs, separate targets and non-root runtime. |
| Private dashboard Docker build/auth | Pass: Node 22.20.0/dashboard 1.10.0 image, unauthenticated 401 and authenticated read against pg-boss schema 43. |
| `bun run test:backend:containers --dashboard` | Pass: actual separate API and two worker containers with mounted offline transports, both provider pipelines, shared spacing, partial outcomes, restart and abrupt kill/resume after retained provider reservation; private dashboard authentication included. |
| `bun run build` | Compilation and build TypeScript pass; page-data collection reproduces the established Bun CommonJS error (latest pre-commit route: `/groups/[id]`). |
| Historical frontend RTL detector | Zero errors; 25 warnings in the two JSON snapshots, for preserved provider source text/titles with Latin digits. |
| Historical saved-data dashboard RTL detector | Pass: zero errors and warnings. |
| Documentation links and whitespace | Reviewed before the milestone 2 commit. |

The RTL warnings concern retained source evidence and provider titles, not physical layout properties. Price, duration, date, and count rendering use Persian formatters. The detector is a static floor; it does not replace browser or screen-reader testing.

## Production build

On Bun 1.3.8, Next.js 16.3.7 compiles and type-checks, then fails while collecting page data (historically `/design-system`; earlier runs failed at `/icon.svg`; the latest pre-commit rerun failed at `/groups/[id]`):

```text
Expected CommonJS module to have a function wrapper
```

The experimental `turbopackPluginRuntimeStrategy: "workerThreads"` setting avoids the previously reproduced socket-based worker-port failure. The earlier October 2 investigation also reproduced the CommonJS error using Webpack; switching page-data workers to threads did not fix it and was reverted. The existing Homebrew Node executable previously failed to start because `libllhttp.9.3.dylib` was missing. The frontend runtime/dependencies were unchanged; the backend foundation introduces its own pinned dependencies and container runtimes. No system database service was installed.

An earlier phase 2 build attempt collided with simultaneous Next route-type generation (`ENOTEMPTY` in `.next/types`). A sequential rerun completed compilation/types and reproduced the established runtime blocker. Run Next type generation and production builds sequentially because they share `.next`.

## Browser review coverage

Historical Firefox reviews cover desktop and narrow mobile layouts, Persian and mixed Latin search, course details and Escape/focus restoration, filters, comparison-heading focus, categories/cards, cover galleries, and the local data dashboard. Specific iterations and incomplete checks remain in [frontend](frontend.md), [provider snapshots](provider-snapshots.md), and [project history](project-history.md).

This backend milestone does not claim a new browser interaction review. Comprehensive screen-reader testing, every breakpoint, final Python mobile-card/focus review, and animation/reduced-motion review remain follow-ups. No complete production build or release validation is claimed.

## Data boundaries

Frontend course facts are dated saved samples; analytical copy and ordering are labeled editorial/prototype content. Current standalone adapters emit version 2 and return `derived: null`; frontend snapshots are separate browser-safe fixtures. Utility tests run offline with retained and synthetic fixtures. No new live collection or full-catalog crawl was run for milestone 2. Broader provider-template sampling, freshness operations, deployment monitoring, and evidence-backed AI evaluation remain future work.

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The local dashboard therefore requires local exports before use. See [utility usage](../apps/utils/README.md).

## Backend foundation boundaries

Integration tests use a separate ephemeral `dorob_test` PostgreSQL 17/pgvector container. Test-only synthetic facts are clearly marked and are never imported into the application database. The native queue was failed/retried and its client restarted to simulate redelivery; rollback tests prove domain results and follow-up insertion share a transaction. The container smoke test checks actual service startup, graceful worker shutdown/restart and processing of a later revision. These tests do not prove production recovery during every possible host/network failure.

On the first attempt Docker was stopped and its obsolete manual proxy pointed at unavailable `127.0.0.1:12334`. With the owner's explicit authorization, the manual overrides were removed, settings backed up locally, and Docker restarted; registry access and image downloads then worked. No system database service was installed. The separate cloud-ready images have been tested locally; no cloud infrastructure was provisioned or deployed.

The frontend still uses its dated fixtures. Bounded manual provider jobs are implemented and validated offline. Model clients/evaluations, embeddings/retrieval, taxonomy/category search, richer assessment/review, definition/member editing and friendly frontend unavailable states remain later milestones. Publication currently produces source facts with `analysis: null`, with source offers/freshness projected from current records. The minimum/distinct-identity gate requires explicit operator comparability review and does not establish a winner. Backups/restore, least-privilege roles, cloud routing/TLS and full production monitoring are not yet validated. See [backend operations](backend-operations.md).

## Milestone 2 validation boundaries

All new automated provider collection uses retained offline adapter fixtures, synthetic robots/sitemaps/errors and injectable transports. The actual backend CLI runs in its own API image; fixture transports are mounted only in two actual worker containers. Production images include neither fixture files nor a fixture-mode environment switch. The container suite checks shared provider spacing across both workers, revision deduplication on repeated unchanged collections and abrupt worker loss during a request. The persisted 60-second provider reservation delays replacement traffic until safe admission; resume records the interrupted attempt and accepts one result.

The database suite also proves provider session locks prevent overlap even after a reservation's wall-clock expiry and verifies stale lease tokens cannot accept responses/release replacements. Ingestion success and continuation insertion roll back together; invalidation outbox insertion is atomic with revision advancement, and outbox dispatch/job insertion rolls back/coalesces across dispatchers. Changed evidence never silently approves membership; published history is retained and the minimum eligible-alternatives gate remains enforced.

No new live provider smoke check is claimed. Broader provider-template/access review, production database/TLS/backup/monitoring validation and later AI/retrieval/frontend work remain outstanding. Standalone utility collectors do not share the backend PostgreSQL limiter. The frontend production build was attempted sequentially after successful Next route generation; compilation and TypeScript passed, and page-data collection reproduced the existing Bun CommonJS error (latest pre-commit route: `/groups/[id]`; earlier milestone 2 run: `/icon.svg`). Frontend code/runtime and the lockfile are unchanged.
