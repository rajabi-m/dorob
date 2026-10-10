# Proposal

## Why

The local catalog stores only minimal course references, while existing scraper exports contain descriptions, offers, curricula, feedback, and evidence that the backend cannot retain. Before adding scraper or AI clients, Dorob needs a flexible ingestion contract, historical observations, and reliable hosted thumbnails for course presentation.

## What Changes

- Introduce a version-3 ingestion envelope with a small required identity/provenance core, mandatory pricing and thumbnail sections, and optional validated source-fact sections covering the existing v2 contract.
- Distinguish omitted, unknown, confirmed empty, partial, and failed collection; accept explicit unavailable pricing instead of fabricating amounts.
- Retain immutable source observations with idempotent submission retries. Current course detail uses the latest accepted snapshot as a whole; missing fields remain missing and older facts are accessible through history only.
- Temporarily use standard HTTPS with TLS verification and public-DNS/redirect preflight checks, without IP pinning. The owner accepts the residual SSRF/DNS rebinding risk for internal-crawler image URLs; restoring pinning is a documented TODO.
- Accept thumbnail URLs or uploaded files; validate, download when necessary, resize/compress, host locally, and deduplicate processed assets across historical observations.
- Expose documented local management ingestion, detail/history, thumbnail processing/retry, and hosted-asset operations. Report whether a course is ready for future website presentation.
- Preserve existing minimal registration, group membership, and public-group contracts. A ready hosted thumbnail is mandatory for future card-ready presentation; incomplete observations remain inspectable in management.
- Provide an explicit v2-to-v3 conversion utility without changing existing scraper exports or launching scraping jobs.

## Capabilities

### New Capabilities

- `course-ingestion`: Validated source-fact submissions, retained observation history, whole-snapshot current detail, compatibility conversion, and management reads.
- `course-thumbnails`: URL/file inputs, bounded safe processing, compressed local hosting, asset reuse, failure recovery, and presentation readiness.

### Modified Capabilities

None. Existing `course-group-curation` requirements remain in force, including minimal public references and editor-controlled assignments. Card-ready frontend integration and any change to public-group eligibility need a later change.

## Impact

Affected implementation areas are `apps/api` SQL migrations/repositories/routes/configuration/tests, browser-safe contracts in `packages/core`, a server-only conversion utility in `apps/utils`, API-local asset storage, and catalog/data-format/setup documentation. An image decoding/resizing dependency will be needed and must be verified under the documented Bun runtime. The new v3 API contract is additive; v2 exports, dashboard inputs, and existing endpoints remain supported as they are.

Excluded: AI execution or automated grouping, scheduled/provider scraping, frontend integration, cloud storage/deployment, authentication, ranking/comparison, original-image archival, and automatic history deletion. Management remains loopback-local.
