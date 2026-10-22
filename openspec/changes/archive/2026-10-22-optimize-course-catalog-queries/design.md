# Design

## Context

See proposal.md for motivation and the three delta specs for behavior. The current `apps/api/src/public-courses.ts` selects full JSON observations with a correlated category aggregate, runs `inspectAvailability` for every candidate, calls `presentCourse` on all candidates, then filters and slices in JavaScript. `inspectAvailability` can also invalidate database image state. The public course validator assumes a nonnull thumbnail; retained group validators reuse that schema and directly dereference image metadata. `PublicCourseCard` already has an image-error fallback, but cannot initially accept null metadata and retains failure state within a mounted card.

Production is one small Darkub container with a retained `/data` disk. SQL migrations have immutable checksums and execute in transactions; `migrate.ts` is the explicit migration entry invoked by the supervisor before API startup. Startup and migration subprocesses have finite deadlines. These constraints rule out unbounded first-request preparation or an implicit new background service.

## Goals / Non-Goals

**Goals:** Make list application work proportional to the requested page, keep exact database-derived totals, make image storage independent of individual-course metadata availability, and upgrade the deployed catalogue without re-import.

**Non-Goals:** Constant-time exact counts, cursor pagination, ranked/fuzzy search, Redis, scheduled image checks, automatic image repair, changing group edition selection or optimizing group queries. No provider collection, inference or historical fact rewriting.

## Decisions

### 1. Separate accepted course facts from image readiness

An individual course is eligible when `courses.current_snapshot_id` selects a validated accepted observation with its required pricing section. Unknown pricing is legitimate; minimal references with no snapshot remain excluded. Pending/missing/failed images are allowed. Always use the selected current snapshot, including when an older image is ready.

Return `thumbnail: null` when the current image association is not ready. If a ready association exists, return its recorded image metadata without touching disk. A subsequent missing/corrupt asset returns the existing safe asset error; the UI shows its fallback. Database and preparation failures remain errors, never empty catalogues. The app's aggregate storage readiness probe remains separate and is not weakened.

Alternative: recheck just page images and refill the page. Rejected because the owner explicitly wants the course to remain visible even when its image is gone. No separate reconciliation command is required for this change; existing explicit processing/retry remains available.

### 2. Add a compact current-course query projection

Add an additive SQL migration for `course_catalog_entries`, one row per course, with course ID, current snapshot ID, projection version, received timestamp, provider ID, normalized search text, exact content minutes, and selected public price summary/status. Keep raw payloads and historical assets in their existing stores. Add appropriate constraints, including a same-course snapshot reference, and a version/completion record for upgrade preparation.

Use the existing TypeScript `normalizeSearch` and `selectPrice` logic through one browser-safe derivation helper for acceptance and backfill. Search text retains the current concatenation of title, provider ID/name and instructor names; normalize queries with the same helper. Store precision without display rounding. Provider registry changes that affect searchable names require an explicit projection-version bump/rebuild.

Update the projection in the existing `ingest` transaction, under the existing course lock, alongside the new current snapshot pointer. Do not update the projection for an idempotent replay of historical observations. Any derivation failure rolls back acceptance and its pointer change. Thumbnail processing does not alter factual eligibility; query the current attempt/asset association only when hydrating the selected page.

Alternative: derive normalization and pricing independently in SQL for every query. Rejected to avoid semantic drift, especially NFKC/Arabic-letter/whitespace normalization and price tie-breaking. A large search service or full public-card cache would add unnecessary dependencies or invalidation work.

### 3. Database filtering and pagination; page-only hydration

Use parameterized SQL against prepared entries joined to `courses` on both identity and current snapshot, never an old projection. Apply provider, selected price status/freeOnly and exact duration conditions in SQL. Use literal substring matching such as `strpos` on already-normalized text; `%`, `_` and backslashes remain literal characters.

For category filtering, use `EXISTS` against the existing published-group/minimum-membership eligibility predicate so duplicates do not multiply courses. Compute group member counts once in a derived relation when needed, rather than repeatedly per course. Hydrate output category arrays for page IDs only, preserving existing category semantics rather than replacing them with judged-group selection rules.

Use separate count and page queries in the existing repeatable-read transaction. This retains totals when an offset produces no rows, unlike a bare window count on an empty page. Order by received timestamp descending then canonical ID with `C` collation; use `LIMIT/OFFSET` and retain the current API/page URLs. Begin with a matching order index and targeted filter indexes; confirm the actual plan before adding more. Exact counts and literal search may scan compact rows; they must not deserialize every observation into the API or inspect files.

Fetch list-required JSON paths and metadata only for selected IDs, preserving order, rather than selecting each full snapshot payload. Keep description, syllabus and full offers on the single-course endpoint, which reads only the requested current snapshot and also performs no file inspection. Shared price derivation guarantees detail/list agreement.

### 4. Explicit, bounded and resumable preparation

Extend explicit migration tooling after SQL DDL to derive existing current-course entries in small keyset batches (initially 100), reusing the same helper as ingestion. Track projection version and completed batches transactionally. Fence old-version API/writers during upgrade. Check each selected snapshot is still current before writing, and retry changed identities rather than allowing stale projections to overwrite newer facts.

Mark a version complete only after an anti-join check proves no accepted current observation lacks a matching current/versioned entry. Repeated execution after completion is cheap. Interrupted work retains committed batches and resumes; it must not silently expose a partial catalogue or falsely report migration completion. SQL-ledger completion alone does not prove this separate preparation completed. API startup verifies the expected preparation version before listening, and the supervisor therefore cannot mark the app ready early.

Rehearse preparation on a restored disposable catalogue under production-like limits. Existing supervisor migration subprocesses are bounded to 30 seconds even when total startup allowance is longer: if measured preparation exceeds that bound, provide an explicit offline preparation step using the same tooling and durable checkpoints before normal startup. Do not silently extend request timeouts or remove deadlines. Update failure wording so partial committed preparation is not described as if all work had rolled back.

### 5. Nullable individual images without weakening groups

Widen individual `PublicCourse`/detail schemas, validators and OpenAPI to accept null thumbnails. Update same-origin web validation and the shared individual card in the same release. Render the existing Persian fallback immediately for null and on failed requests; reset error state when the current image reference changes. Preserve aspect ratio, RTL semantics, keyboard links and source-fact copy.

Narrow group cover/assessed-course types and validators explicitly to require their existing nonnull thumbnail shape. Their asset hash checks, edition eligibility, no-history-fallback behavior and shared presentation functions must remain intact. The fallback applies to the individual catalogue and homepage individual shelf; it does not make a group with missing evaluated assets public.

This is a coordinated first-party API change. External clients that assume nonnull individual thumbnails need an announced upgrade; do not disguise absence with a fabricated UUID or a previous snapshot's image.

## Risks / Trade-offs

- **Projection drift** -> shared deterministic derivation, same-transaction acceptance, identity/version joins, restart checks, replay/concurrency tests and explicit rebuild tooling.
- **Unintended group broadening through shared schemas** -> explicit nonnull group schema/type narrowing and existing retained-asset regression checks.
- **Newly visible courses with no images** -> intentional owner-approved behavior; retain honest unknown facts and the existing fallback, not synthetic provider images.
- **JSON/normalization differences in a backfill** -> compare derived price/search fields against existing helpers, including unknown pricing and Unicode edge cases.
- **SQL still scans for count/substring search** -> scan compact records; prove bounded API hydration and zero filesystem calls. Add further indexes only after query-plan evidence.
- **Resource or deadline pressure during preparation** -> small resumable batches, measured offline preparation option and explicit readiness gating; no production experiment or infinite startup loop.
- **Backup compatibility across projection versions** -> transfer the derived table and completion metadata with all application tables; a restored older database runs preparation after baseline restore verification. Never edit applied SQL migration files.

## Migration Plan

1. Capture one baseline on an isolated restored catalogue, then implement the additive schema, shared derivation, preparation and new writers/readers together. Compare equivalent current-data filters; account separately for intentional newly visible no-image courses.
2. Rehearse migration and interrupted/resumed preparation on that disposable copy. Run focused contract tests, API/web lint/types/build, and one cold/warm benchmark series for page one, a selective query and a later page, including zero filesystem calls and at-most-limit hydrated rows. Record actual limits and timing; do not claim a universal latency promise from a laptop run.
3. For a separately authorized production release, retain a verified off-disk database/assets backup and the previous image. Stop the sole existing app and remote writers, deploy the coordinated new image on the same `/data` disk/password, and run preparation before normal API readiness. Use the explicit maintenance path first if the rehearsal cannot fit the existing startup budget. No database re-import or image reprocessing is required.
4. Verify readiness, exact counts under the new eligibility rule, page/filter results, image fallback and normal retained group comparisons; then resume writers.
5. Keep additive tables if rolling back to a compatible previous image. Old writers do not maintain the projection: before returning to the new image, explicitly invalidate its completion state and rebuild from current accepted snapshots. Rehearse/document this path; a retained version marker alone must never authorize reuse after an old-version write. Rollback restores the old stricter image visibility behavior. Do not downgrade SQL/history or restore over a working disk automatically.
