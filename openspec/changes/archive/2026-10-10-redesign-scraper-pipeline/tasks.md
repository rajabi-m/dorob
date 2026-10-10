# Tasks

## 1. Shared collection foundation

- [x] 1.1 Add the abstract server-only `BaseScraper` and typed v3 collection result, controlled origin clients, provider hooks and injectable transport/time/ID seams; verify a fixture subclass collects and validates an observation without backend access.
- [x] 1.2 Implement parent-owned initialization, bounded relevant-sitemap traversal, canonical deduplication, sequential iteration and cancellation using `PublicProviderClient`; verify offline tests cover traversal limits, duplicate URLs, partial failures and interruption.
- [x] 1.3 Verify and repair shared access-policy behavior needed by the base without changing other adapters: robots longest-match/agent selection, missing robots 404, denial/unreachable robots, spacing/crawl delay, Retry-After, finite retries, redirect/origin and size/time limits; run common transport tests and all existing provider regression tests.
- [x] 1.4 Document the parent/subclass contract and controlled request hooks in `docs/provider-adapters.md` and utility exports; verify the reference example typechecks and shared core has no server-runtime imports.

## 2. Maktabkhooneh reference migration

- [x] 2.1 Make `MaktabkhoonehScraper` extend the base and remove its duplicate transport/robots/retry implementation; verify existing discovery and access-denial fixture cases pass through the shared transport.
- [x] 2.2 Refactor existing pure extraction into reusable facts plus source evidence/coverage and assemble native v3 observations; verify retained Nuxt fixtures round-trip through API validation with correct identity, field paths, required sections and fresh observation IDs.
- [x] 2.3 Preserve pricing options and original-unit evidence, duration distinctions, ordered curriculum and anonymous feedback; verify paid/free/ambiguous-zero, sparse/partial/failed sections, empty-list evidence and contact-redaction regression cases.
- [x] 2.4 Add the explicit legacy v2 adapter over shared extraction and keep `scrape:maktabkhooneh` wired to the export-only CLI; verify old v2 checkpoint resume, saved-v2 conversion and dashboard aggregation still work without ingestion requests, and the other three adapters remain unchanged.
- [x] 2.5 Document Maktabkhooneh's programmatic v3 migration and legacy CLI boundary in `apps/utils/README.md`, `docs/provider-adapters.md` and `docs/course-data-format.md`; verify documented shapes match fixture output and CLI help.

## 3. Delivery client and durable worker

- [x] 3.1 Add an injectable backend client for existing ingestion and snapshot thumbnail endpoints with encoded identifiers, response validation, finite timeouts, bounded transient retries and redirect rejection; verify 200/201 receipts, lost responses, 409/422 terminal errors, 503 retry exhaustion and credential-safe errors with offline HTTP fixtures.
- [x] 3.2 Implement a versioned private atomic checkpoint journal and exclusive writer lock under ignored output paths; verify full-journal validation, existing-file protection, incompatible/legacy resume rejection before network or mutation, write failure and competing-writer behavior, plus documented crash-lock recovery.
- [x] 3.3 Implement `ScraperWorker` receiving scraper and backend client with sequential collect/save/submit/receipt transitions; verify crashes before submission and after acceptance replay the exact saved payload, unchanged fresh collections create distinct observations, and backend exhaustion preserves pending work while stopping further collection.
- [x] 3.4 Add exact-snapshot thumbnail coordination and independent state/reporting; verify ready/missing skip paths, HTTP-200 failed image states, busy bounded retry, interruption after acceptance and image-only resume without duplicate observations.
- [x] 3.5 Implement resumable partial runs and safe reporting/exit status; verify one extraction failure does not erase successful work, access denial stops collection, cancellation preserves journals, successful resume clears outstanding errors while retaining attempt history, and unavailable-image completion differs from failed processing.
- [x] 3.6 Document worker state transitions, fresh-run versus resume identity, checkpoint retention/lock recovery and the single-active-run operational limitation in `apps/utils/README.md` and `docs/catalog.md`; verify examples agree with tested behavior and explain acceptance-order current snapshots.

## 4. Explicit worker command

- [x] 4.1 Add `ingest:maktabkhooneh` with explicit URLs, default ten-course discovery limit, explicit full-catalog option, checkpoint/resume and local backend URL configuration; verify option conflicts, destination validation, help, new-file protection and resume without rediscovery using offline CLI tests.
- [x] 4.2 Expose the base and worker through server-only utility entry points and root Bun scripts without new automatic launcher/API/migration hooks; verify type checking, command help and unchanged existing export command help.
- [x] 4.3 Update root/utility READMEs, `Plan.md` and catalog workflow documentation for explicit ingestion and deferred frontend/provider migrations; verify each documented command matches CLI help and clearly distinguishes accepted facts, hosted-image readiness and website publication.

## 5. Integration acceptance

- [x] 5.1 Run worker-to-real-API integration against an isolated PostgreSQL database and temporary asset directories using controlled source/image fixtures; verify retained history, exact replay after lost receipt, changed fresh observations, thumbnail retry/reuse and persistence across normal restart without affecting existing data.
- [x] 5.2 Run the explicit public paid Python mk346 selection through the worker; inspect pricing evidence, native coverage, backend detail/history and hosted thumbnails, then verify same-checkpoint resume adds no duplicate history. Record actual outcomes in `docs/validation.md`. Per owner decision, skip the free LPIC-1 mk711 endpoint returning HTTP 500 and retain its live free-course acceptance as a TODO in `Plan.md`; do not claim that deferred check passed.
- [x] 5.3 Run documented workspace lint/typecheck, utility/API tests, frontend production build and API build, plus strict OpenSpec validation and whitespace checks; record results and existing environment/build limitations in `docs/validation.md`, and verify only Maktabkhooneh migrated with no frontend integration or database schema change.
