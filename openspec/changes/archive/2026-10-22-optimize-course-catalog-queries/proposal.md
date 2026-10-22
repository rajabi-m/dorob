# Proposal

## Why

The individual-course API loads every current snapshot, checks every thumbnail on disk, and filters/pages in memory even when returning eighteen cards. On Dorob's small production container this wastes database, CPU, memory and disk resources; the owner also wants accepted courses to remain discoverable when images are unavailable.

## What Changes

- Filter, count and paginate individual courses in PostgreSQL using compact, synchronously maintained current-course search/filter records. Hydrate only the selected page; keep full details on the single-course endpoint.
- Make individual-course visibility depend on a valid accepted current observation, including its accountable pricing section, rather than thumbnail processing state or physical file availability. Reference-only courses remain private. Pending, missing and failed thumbnails no longer exclude accepted courses.
- Continue storing and serving processed thumbnails. Reuse the existing Persian fallback when there is no current hosted image or an image request fails. Never borrow an earlier observation's image.
- **BREAKING**: individual-course API thumbnail fields may be null. Update shared validation, OpenAPI and first-party consumers in the same release; preserve the stricter nonnull image contracts of retained group comparisons.
- Preserve search normalization, literal substring matching, selected-price semantics, duration boundaries, category membership, exact matching totals, page URLs and stable ordering. Remove course/image filesystem inspection and thumbnail-state mutation from list/detail metadata requests.
- Provide an additive migration and bounded resumable projection backfill through explicit migration tooling, plus focused correctness/performance evidence and the existing-disk Darkub upgrade procedure.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-course-catalog`: image-independent eligibility, nullable thumbnails, database-side filtering/pagination and bounded per-page hydration without filesystem scans.
- `course-thumbnails`: separate management image readiness from individual-course visibility while preserving storage, processing, retry and historical retention.
- `course-catalog`: keep cards visible with an accessible image fallback when thumbnails are absent or fail to load.

## Impact

API course queries, ingestion-derived search/filter data, migration/backfill tooling, shared public course contracts and group-contract narrowing, existing card fallback, and API/web tests/documentation. The same endpoint improves the homepage individual-course shelf without changing its size or layout.

No Redis, new infrastructure, scraping, inference, scheduled repair, group-query optimization, changes to retained comparison selection, production writes, deployment, commit or push are included. Production receives the migration on its existing `/data` disk after a verified backup; no data re-import is needed. Group comparisons continue enforcing their existing evaluated-image rules and are not broadened by this change.
