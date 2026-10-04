# Validation and known limitations

Current checks: October 4, 2026. Phase 2 is complete for now; phase 3 milestone 1 is implemented and locally validated. No production/live integration is active.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web, utilities, backend, worker and shared packages. |
| `bun run typecheck` | Pass: route generation, web TypeScript, utilities, backend, worker and shared packages. |
| `bun run test:utils` | Pass: 72 tests across five files. |
| `bun run test:backend` | Pass: 10 offline configuration/HTTP/validation tests, including real retained adapter fixtures. |
| `bun run test:backend:integration` | Pass: 16 real PostgreSQL/pgvector tests; migrations apply twice, pg-boss schema 43 verified, rollback/retry/restart/revisions/publication and immutable evidence checked. |
| `bun run build:backend` | Pass: both Bun backend and worker entrypoints. |
| API/worker Docker image builds | Pass: pinned Bun 1.3.8, frozen filtered production installs, separate targets and non-root runtime. |
| Private dashboard Docker build/auth | Pass: Node 22.20.0/dashboard 1.10.0 image, unauthenticated 401 and authenticated read against pg-boss schema 43. |
| `bun run test:backend:containers --dashboard` | Pass: separate API/worker containers, explicit migration/queue commands, deterministic factual publication and HTTP boundary, then a new workflow after worker restart; test containers/network cleaned up. |
| `bun run build` | Compilation and build TypeScript pass; page-data collection reproduces the established Bun CommonJS error (latest pre-commit route: `/icon.svg`). |
| Historical frontend RTL detector | Zero errors; 25 warnings in the two JSON snapshots, for preserved provider source text/titles with Latin digits. |
| Historical saved-data dashboard RTL detector | Pass: zero errors and warnings. |
| Documentation links and whitespace | Checked before committing the milestone. |

The RTL warnings concern retained source evidence and provider titles, not physical layout properties. Price, duration, date, and count rendering use Persian formatters. The detector is a static floor; it does not replace browser or screen-reader testing.

## Production build

On Bun 1.3.8, Next.js 16.3.7 compiles and type-checks, then fails while collecting page data (historically `/design-system`; the pre-commit rerun failed at `/icon.svg`):

```text
Expected CommonJS module to have a function wrapper
```

The experimental `turbopackPluginRuntimeStrategy: "workerThreads"` setting avoids the previously reproduced socket-based worker-port failure. The earlier October 2 investigation also reproduced the CommonJS error using Webpack; switching page-data workers to threads did not fix it and was reverted. The existing Homebrew Node executable previously failed to start because `libllhttp.9.3.dylib` was missing. The frontend runtime/dependencies were unchanged; the backend foundation introduces its own pinned dependencies and container runtimes. No system database service was installed.

An earlier phase 2 build attempt collided with simultaneous Next route-type generation (`ENOTEMPTY` in `.next/types`). A sequential rerun completed compilation/types and reproduced the established runtime blocker. Run Next type generation and production builds sequentially because they share `.next`.

## Browser review coverage

Historical Firefox reviews cover desktop and narrow mobile layouts, Persian and mixed Latin search, course details and Escape/focus restoration, filters, comparison-heading focus, categories/cards, cover galleries, and the local data dashboard. Specific iterations and incomplete checks remain in [frontend](frontend.md), [provider snapshots](provider-snapshots.md), and [project history](project-history.md).

This documentation/commit pass does not claim a new browser interaction review. Comprehensive screen-reader testing, every breakpoint, final Python mobile-card/focus review, and animation/reduced-motion review remain follow-ups. No complete production build or release validation is claimed.

## Data boundaries

Frontend course facts are dated saved samples; analytical copy and ordering are labeled editorial/prototype content. Current standalone adapters emit version 2 and return `derived: null`; frontend snapshots are separate browser-safe fixtures. Utility tests run offline with retained and synthetic fixtures. No new live collection or full-catalog crawl was run for this commit. Broader provider-template sampling, freshness operations, deployment monitoring, and evidence-backed AI evaluation remain future work.

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The local dashboard therefore requires local exports before use. See [utility usage](../apps/utils/README.md).

## Backend foundation boundaries

Integration tests use a separate ephemeral `dorob_test` PostgreSQL 17/pgvector container. Test-only synthetic facts are clearly marked and are never imported into the application database. The native queue was failed/retried and its client restarted to simulate redelivery; rollback tests prove domain results and follow-up insertion share a transaction. The container smoke test checks actual service startup, graceful worker shutdown/restart and processing of a later revision. These tests do not prove production recovery during every possible host/network failure.

On the first attempt Docker was stopped and its obsolete manual proxy pointed at unavailable `127.0.0.1:12334`. With the owner's explicit authorization, the manual overrides were removed, settings backed up locally, and Docker restarted; registry access and image downloads then worked. No system database service was installed. The separate cloud-ready images have been tested locally; no cloud infrastructure was provisioned or deployed.

The frontend still uses its dated fixtures. Live provider jobs, model clients/evaluations, embeddings/retrieval, taxonomy/category search, richer assessment/review, definition/member editing and friendly frontend unavailable states remain later milestones. Publication currently produces source facts with `analysis: null`, with source offers/freshness projected from current records. The minimum/distinct-identity gate requires explicit operator comparability review and does not establish a winner. Backups/restore, least-privilege roles, cloud routing/TLS and full production monitoring are not yet validated. See [backend operations](backend-operations.md).
