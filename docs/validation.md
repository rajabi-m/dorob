# Validation and known limitations

Current checks: October 4, 2026. Phase 2 is complete for now; phase 3 milestones 1 and 2 are complete and locally validated; milestone 3 is complete and locally validated with offline model transports. No production/live integration is active.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web, utilities, backend, worker and shared packages. |
| `bun run typecheck` | Pass: route generation, web TypeScript, utilities, backend, worker and shared packages. |
| `bun run test:utils` | Pass: 72 tests across five files. |
| `bun run test:backend` | Pass: 20 offline configuration/HTTP/validation/ingestion/placement tests, including synthetic Jev/embedding contracts, Persian normalization, ranking and abstention. |
| `bun run test:backend:integration` | Pass: 49 real PostgreSQL/pgvector tests; migrations apply twice, schema 43 verified. Both ingestion adapters plus placement/retrieval, duplicate delivery, retry/resume/cancellation, independent connections, session locks/reservations, budgets, stale course/group/taxonomy work, immutable inputs, response reuse, rollback/outbox handoff and approval/publication gates checked. |
| `bun run build:backend` | Pass: both Bun backend and worker entrypoints. |
| API/worker Docker image builds | Pass: pinned Bun 1.3.8, frozen filtered production installs, separate targets and non-root runtime. |
| Private dashboard Docker build/auth | Pass: Node 22.20.0/dashboard 1.10.0 image, unauthenticated 401 and authenticated read against pg-boss schema 43. |
| `bun run test:backend:containers --dashboard` | Pass: actual separate API and two worker containers, both providers plus Decisions/embedding transports, operator review, hybrid retrieval, response reuse, shared coordination and model/provider kill/restart/resume. Private dashboard authentication included. Final audited images additionally passed `--dashboard --placement-only`. |
| `bun run build` | Compilation and build TypeScript pass; page-data collection reproduces the established Bun CommonJS error (latest milestone 3 route: `/design-system`). |
| Historical frontend RTL detector | Zero errors; 25 warnings in the two JSON snapshots, for preserved provider source text/titles with Latin digits. |
| Historical saved-data dashboard RTL detector | Pass: zero errors and warnings. |
| Documentation links and whitespace | Pass: local documentation links and whitespace reviewed before the milestone 3 commit. |

The RTL warnings concern retained source evidence and provider titles, not physical layout properties. Price, duration, date, and count rendering use Persian formatters. The detector is a static floor; it does not replace browser or screen-reader testing.

## Production build

On Bun 1.3.8, Next.js 16.3.7 compiles and type-checks, then fails while collecting page data (historically `/design-system`; earlier runs failed at `/icon.svg`; the milestone 2 pre-commit rerun failed at `/groups/[id]`; the milestone 3 sequential build failed at `/design-system`):

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

The frontend still uses its dated fixtures. Bounded manual provider jobs are implemented and validated offline. Model Decisions/embedding clients, provisional taxonomy, operator placement/review and hybrid retrieval are implemented and tested offline. Live model evaluation/availability, visitor category search, richer generative assessment, definition editing and frontend unavailable states remain outstanding. Publication currently produces source facts with `analysis: null`, with source offers/freshness projected from current records. The minimum/distinct-identity gate requires explicit operator comparability review and does not establish a winner. Backups/restore, least-privilege roles, cloud routing/TLS and full production monitoring are not yet validated. See [backend operations](backend-operations.md).

## Milestone 2 validation boundaries

All new automated provider collection uses retained offline adapter fixtures, synthetic robots/sitemaps/errors and injectable transports. The actual backend CLI runs in its own API image; fixture transports are mounted only in two actual worker containers. Production images include neither fixture files nor a fixture-mode environment switch. The container suite checks shared provider spacing across both workers, revision deduplication on repeated unchanged collections and abrupt worker loss during a request. The persisted 60-second provider reservation delays replacement traffic until safe admission; resume records the interrupted attempt and accepts one result.

The database suite also proves provider session locks prevent overlap even after a reservation's wall-clock expiry and verifies stale lease tokens cannot accept responses/release replacements. Ingestion success and continuation insertion roll back together; invalidation outbox insertion is atomic with revision advancement, and outbox dispatch/job insertion rolls back/coalesces across dispatchers. Changed evidence never silently approves membership; published history is retained and the minimum eligible-alternatives gate remains enforced.

No new live provider smoke check is claimed. Broader provider-template/access review, production database/TLS/backup/monitoring validation and later AI/retrieval/frontend work remain outstanding. Standalone utility collectors do not share the backend PostgreSQL limiter. The frontend production build was attempted sequentially after successful Next route generation; compilation and TypeScript passed, and page-data collection reproduced the existing Bun CommonJS error (latest milestone 3 route: `/design-system`; earlier milestone 2 run: `/icon.svg`). Frontend code/runtime and the lockfile are unchanged.

## Milestone 3 validation boundaries

Measured locally October 4, 2026: 20 backend unit tests, 49 real PostgreSQL integration tests, 72 existing utility tests, workspace lint/type checking, both Bun builds and Docker image builds pass. The full `--dashboard` container suite passed both providers and all new model workflows, operator approval, hybrid retrieval, kill/restart and retained reservations. After the final call-ledger/database-clock/attempt-fencing audit, refreshed API/worker images passed `--dashboard --placement-only`, explicitly requiring model transports to run on both actual worker hosts. No fixture-mode switch ships in production images.

The database suite covers Choice option/distribution/confidence validation, Noul/sufficiency outcomes, unknown/multi-level separation, compatible vector spaces, alias retrieval/RRF ranking, revision outbox atomicity, duplicate request/delivery coalescing, concurrency beyond reservation clock expiry, call/USD budget admission, reported overruns, timeout/unknown outcomes, bounded resume and abandoned attempt recovery. It also checks retained response reuse without a configured transport after acceptance rollback, reported cost overruns surviving that rollback, late model-attempt fencing and reservation protection, membership/downstream rollback, explicit taxonomy/operator boundaries, PostgreSQL input immutability, definition-bound publication eligibility and durable unmatched status. Fixtures are labeled synthetic and review identities refer only to test acceptance, not production taxonomy or educational quality.

No live Jev, embedding or provider request was performed. Current official OpenRouter/TypeSafe contracts were checked; tests verify a synthetic transport reaches the Decisions endpoint and expected wire shapes. This proves implementation contract/orchestration behavior, not live model access or Persian accuracy. Model selection, availability/pricing/dimension verification, credentials, explicit live authorization/budget and a human-reviewed production evaluation set remain prerequisites to a bounded live check. The proposed paid embedding candidate was not selected or called. USD reservations are conservative admission estimates, not a provider billing cap; unknown calls may have been billed and exactly-once billing is not promised.

The frontend build ran sequentially after successful Next type generation; compilation and TypeScript passed, then page-data collection reproduced `Expected CommonJS module to have a function wrapper` for `/design-system`. No frontend source/runtime, dependency or lockfile change was made. No new UI/browser review is claimed. Cloud release, generative group creation/assessment/ranking, frontend integration and schedules remain outside milestone 3.
