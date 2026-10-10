# Proposal

## Why

Dorob's provider scrapers export v2 files independently of the v3 ingestion backend, and Maktabkhooneh duplicates transport policy already shared by other providers. Establish a reusable collection and delivery architecture with Maktabkhooneh as the golden example before migrating the remaining providers.

## What Changes

- Introduce an abstract `BaseScraper` for controlled provider requests, robots compliance, politeness, bounded discovery, cancellation, deduplicated course iteration, and validated v3 observations.
- Rewrite only `MaktabkhoonehScraper` to extend the base, preserving source extraction, pricing accountability, anonymous feedback, syllabus ordering, and evidence while reporting section coverage deliberately.
- **BREAKING:** Maktabkhooneh's programmatic collection interface returns v3 observations instead of v2 courses. Preserve its existing export-only CLI and saved-v2 conversion through an explicit compatibility boundary; the other three scrapers and their v2 commands remain unchanged.
- Add an explicitly invoked `ScraperWorker` that receives a scraper and backend client, checkpoints observations before delivery, resumes safely, submits through the existing ingestion API, and requests thumbnail processing for accepted snapshots.
- Add offline contract tests, a bounded real-service collection check, and a documented reference workflow for later provider migrations.
- Defer other provider rewrites, schedules/queues, frontend integration, old frontend fixture imports, automatic editorial groups, AI, and production deployment.

## Capabilities

### New Capabilities

- `provider-course-collection`: Controlled provider collection and traceable v3 observations, with Maktabkhooneh as the initial implementation and explicit legacy export compatibility.
- `scraper-worker`: Explicit resumable collection-to-backend delivery, observation retry identity, thumbnail coordination, and run reporting.

### Modified Capabilities

None. Existing `course-ingestion` and `course-thumbnails` behavior is consumed without changing their contracts; API startup and migrations still perform no collection.

## Impact

Server-only utilities under `apps/utils`, utility package exports/scripts, Maktabkhooneh tests, and operational documentation are affected. Reuse `PublicProviderClient`, browser-safe v3 types in `packages/core`, and existing management endpoints; no database migration or frontend change is expected. Generated checkpoints remain ignored, other provider exports/dashboard inputs remain v2, and the backend remains the owner of snapshot persistence and hosted images.
