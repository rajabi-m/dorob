# Design

## Context

See `proposal.md` for motivation and the two delta specs for acceptance behavior. `apps/api` uses Bun/Elysia, native Bun SQL, explicit checksummed migrations, safe catalog errors, and dependency-injected repositories in offline tests. `courses` contains only stable identity/title/URL; the five-field `CourseReference` is shared through `packages/core`. The existing curation spec intentionally promises minimal references and editor-controlled assignments.

`apps/utils/scrapers/course.ts` defines v2 facts, validation, anonymization, and hashing in one server-side module. The four adapters, export resume checks, aggregator, and dashboard require v2. No image processor or hosted-asset lifecycle exists. Existing public-group eligibility depends only on publication and member count; changing that policy here would break the current capability contract.

## Goals / Non-Goals

**Goals:** Preserve v2 information through an additive sparse contract; keep source observations independently auditable; expose one latest accepted snapshot as current course detail; process mandatory thumbnail inputs into reusable hosted assets; preserve local curation compatibility.

**Non-Goals:** Build a job platform, operate an AI client, change provider parsers or export formats, integrate the frontend, implement cloud media storage, or mutate historical source facts as image processing progresses. This change reports readiness to future UI consumers; it does not change existing minimal public-group visibility.

## Decisions

### 1. Versioned source envelope with optional sections

Introduce v3 types in `packages/core` without importing the server-only v2 module. Keep runtime schemas, hashing, network retrieval, and image processing in server packages. The envelope contains:

- `schemaVersion: 3`, client `submissionId`, `providerId`, `providerCourseId`, `title`, `sourceUrl`.
- `source`: `checkedAt`, `extractor`, `extractorVersion`, `method`, precise `fieldSources`, and warnings.
- Required `pricing` and `thumbnail` sections.
- Optional `description`, `education`, `classification`, `instructors`, `curriculum`, `feedback`, `providerState`, `features`, `raw`, and namespaced `providerData` sections. A documented mapping covers every v2 source-fact key. `raw` remains selected safe normalization evidence, not arbitrary captured HTML.

Each section has `coverage: { status, reason }` and `data`. Status is `complete`, `partial`, `unknown`, or `failed`. Omission means uninspected; explicit null means unknown; empty lists require source evidence of emptiness. Failed sections contain no asserted facts. Unknown coverage can retain evidenced values without claiming completeness; use null when no facts were established. Partial sections contain only collected facts and a reason. Nested v2 syllabus/review coverage survives as well; section coverage does not replace it. Supplied nested data must validate under every coverage state. Field sources refer to the new canonical paths. Required title/source identity also needs evidence.

Pricing data preserves v2 offer objects, including multiple offers, amount/original amount, normalized toman unit, original currency evidence, subscription billing, and access/support/certificate terms. Require pricing accountability, not a numeric amount: unknown/failed pricing has null data and a reason. Thumbnail data is a discriminated URL or upload reference with alt text; unknown/failed thumbnail data is null with a reason. Backend-generated snapshot IDs/hashes/asset metadata are not caller-controlled.

Alternative: make every v2 key mandatory-nullable. Rejected because it couples acceptance to a large document shape and hides uninspected versus unsuccessful extraction. Arbitrary unvalidated JSON is also rejected because facts must remain comparable and source-grounded.

### 2. Additive relational identity with JSONB observations

Add new migrations; never edit `001` or reset the development volume. Proposed tables:

| Table | Responsibility |
| --- | --- |
| Existing `courses` | Stable identity/reference fields and a nullable current snapshot FK; preserve existing curation contract |
| `course_snapshots` | UUID, course FK, submission ID, schema version, checked/received times, request hash, fact hash, immutable validated JSONB payload |
| `thumbnail_attempts` | Snapshot FK, pending/ready/failed/missing status, safe failure code, lease/attempt metadata, resulting asset FK |
| `thumbnail_assets` | Processed-content hash, profile version, storage key, format, dimensions, byte size |
| `thumbnail_uploads` | Opaque expiring token, validated staged asset/input reference, consumed snapshot link |

Use restrictive FKs for retained history and a unique `(course_id, submission_id)` constraint. The current snapshot pointer must reference a snapshot belonging to that same course. Index course/acceptance-order history and asset hashes. Thumbnail processing state is separate from immutable source payloads. The filesystem contains bytes; JSONB contains the URL/upload locator submitted and provenance, never binary images. Uploaded source bytes are ephemeral, so the retained locator records an observation rather than promising original-byte archival.

Alternative: normalize every instructor/offer/lesson/review into child tables now. Deferred until query requirements justify those indexes and joins. A single mutable JSONB course row is rejected because it loses historical inputs and refresh failure context.

### 3. Idempotency, hashes, and one current snapshot

Validate the full submission before opening its write transaction. Atomically create/reuse the course, insert the immutable snapshot, and update its single current snapshot pointer under a per-course row lock. The pointer advances only when a new snapshot is accepted. Retry comparison uses a server-calculated canonical request hash, including observation metadata and thumbnail source identity. Facts hash excludes submission IDs, checked/received times, extraction transport metadata, and operational progress while retaining meaningful coverage changes, offer evidence, review text, and curriculum order. Do not trust a supplied v2 hash. Arrays preserve order; object keys canonicalize.

Same submission ID and canonical request returns the original snapshot (200); changed request returns 409. A new observation with identical facts gets its own snapshot (201). Do not deduplicate historical observations by fact hash. Latest means the latest newly accepted snapshot in serialized per-course acceptance order. Source `checkedAt` remains visible provenance, not a separate selection policy. Replaying an older submission never makes it current again. No late-arrival or completeness ranking policy is introduced.

Read all source facts, coverage, observation time, and thumbnail association from the current snapshot only. Omitted, null, partial, or failed sections remain exactly that in current detail; do not fill them from history. The response carries one snapshot ID and its source/receipt timestamps. Historical facts and images remain inspectable through their own snapshot detail. Thumbnail processing success or failure changes only that snapshot's operational state; processing an older snapshot cannot change current detail. Asset deduplication is permitted when the current snapshot's own input resolves to identical stored bytes, without borrowing an earlier observation's association.

Current identity/title/URL for ingested views come from the current snapshot, while legacy `CourseReference` registration still updates its own reference fields. Ingestion updates reference title/URL when accepting a new current snapshot. A later manual reference edit does not rewrite retained source observations or their evidence. Memberships are never touched.

Alternative: merge sections from different observations and retain older successful values as fallback. Rejected by the owner because that would present facts collected together at different times as one course state and adds unnecessary edge-case handling. Previous facts remain useful in history without participating in current detail. Accepted means the envelope passed validation; optional completeness and image-processing readiness remain explicitly reported.

### 4. Explicit local API surface and v2 conversion

Keep existing routes unchanged. Add management-only operations:

| Operation | Proposed route |
| --- | --- |
| Submit source observation | `POST /api/v1/manage/course-ingestions` |
| Current ingested detail/readiness | `GET /api/v1/manage/courses/{courseId}` |
| Paginated observation history | `GET /api/v1/manage/courses/{courseId}/snapshots` |
| Exact immutable source observation plus processing state | `GET /api/v1/manage/courses/{courseId}/snapshots/{snapshotId}` |
| Stage image upload | `POST /api/v1/manage/thumbnail-uploads` (multipart file) |
| Process/retry accepted thumbnail | `POST /api/v1/manage/courses/{courseId}/snapshots/{snapshotId}/thumbnail/process` |
| Serve processed bytes | `GET /assets/thumbnails/{assetId}` |

Ingestion commits facts and a pending/missing thumbnail state, then returns 201 (or 200 on replay). It performs no remote download inside a SQL transaction. Clients explicitly invoke bounded processing and inspect the result; no automatic queue/scheduler is introduced. Retry returns ready state immediately for completed work, and 409 for an already active processing lease. Persist pending state and expiring leases so interruption is retryable without requiring an in-memory queue. A malformed upload fails before issuing a token; otherwise uploads are validated and compressed into staging before submission, avoiding retention of oversized originals. Processing an upload finalizes its association rather than downloading again.

Snapshot/current lookup of a missing course returns 404. A legacy reference without observations returns its minimal reference plus empty snapshot/readiness state. History uses existing pagination conventions (default 20, max 100), newest acceptance first with a stable per-course ordering recorded on insertion. Raw normalization evidence and extension data are management-only. Safe response codes include 422 invalid submission/image, 413 size limit, 404 missing record/token, 409 replay/lease conflict, and 503 unavailable database/storage. A persisted image failure is returned as processing state with a safe code, not a raw transport/decoder error. Swagger documents examples and upload tokens. Do not expose source signed URL secrets in logs/errors.

Implement an explicit server-only v2 conversion helper/CLI: read saved exports, map fields and source locators, preserve selected raw evidence, and output validated v3 envelopes. Null v2 offers/image become explicit unknown with a reason. Unknown completeness must stay unknown/partial, not inferred from presence. Derive a deterministic submission ID from the converted source record including checked time so repeating conversion is safe. Neither conversion nor API startup runs scraping or imports saved exports automatically. Existing utilities continue emitting/reading v2 unchanged.

### 5. Thumbnail profile and safe transport

Proposed defaults: static JPEG/PNG/WebP input, 10 MiB input limit, 25 megapixel decoded limit, at most 3 redirects, 15-second download deadline, and 2 concurrent processing operations. Reject SVG and animated inputs for this first profile. Encode one static WebP fitting within 640 x 640 pixels, preserving aspect ratio without cropping/upscaling, quality 80, auto-orientation and metadata removal. Enforce a 512 KiB processed-output cap; reduce quality within a bounded profile or fail explicitly. Version the profile so later format/dimension changes remain traceable. These are proposed local defaults to validate against representative saved images, not claims about measured savings.

A raster processor with native decoding/resizing is needed. Verify the candidate dependency on Bun 1.3.8 and both dev/build startup with fixture images before wiring it into the service; preserve the lockfile and record the pinned package. Use server-only processing behind a small interface for offline tests. Prefer a decoder package over spawning shell converters on each request. Decoder/runtime compatibility and bounded processing must be proven, not assumed.

Remote retrieval checks HTTPS, no credentials, public address classification (IPv4/IPv6 including mapped IPv4), DNS results, and every redirect. Use standard HTTPS with TLS certificate/hostname verification enabled and implicit redirects disabled. Temporarily do not pin connections to the preflight-validated IP: the owner explicitly accepts the residual SSRF/DNS rebinding risk because URLs come from the internal crawler. The HTTPS client can resolve DNS again after preflight, so these checks do not guarantee the connected address remains public. TODO: restore verified IP pinning in a later change. Reject mixed public/private DNS answers. Use an injectable transport for tests. Enforce streaming byte/deadline limits even if Content-Length is absent or false; do not forward cookies/auth. Decode in a bounded isolated operation so cancellation/deadline is not merely an abandoned Promise. Cap processing time at 30 seconds, reclaim concurrency slots, and clean temporary files on failure/shutdown.

Alternative: save remote URLs only. Rejected because provider availability and asset size would control our UI. Cloud object storage and multiple responsive variants are deferred; one modest profile establishes the local lifecycle first.

### 6. Local persistence, deduplication, and readiness

Use a configurable API-owned persistent asset directory (default ignored `apps/api/storage/thumbnails`), with separate staging. Never accept client filenames or paths as storage keys. Hash processed bytes; use immutable hash-based keys and atomic rename. Reuse one asset record/file for identical bytes; retain profile information on associations if multiple profiles produce the same content. Write/verify the file before committing a ready asset association. A crash-created unreferenced file can be reused on retry; any cleanup must recheck references before removal. DB success alone cannot mark a missing file ready.

Upload tokens expire after one hour, are bound to one submission on consumption, and permit idempotent replay of that submission only. Provide bounded staging cleanup at startup and after upload/process operations; pending consumed tokens must retain enough staged content for explicit retries. Retain historical processed files indefinitely in this change. Do not automatically garbage-collect referenced assets or archive originals. Document joint database/asset backup requirements.

Serve asset IDs through metadata lookup, not arbitrary paths, with WebP content type, ETag, and immutable cache headers. Public serving covers processed images only. If the current snapshot's asset is missing/corrupt, current detail reports unready and exposes the failure. No earlier snapshot's thumbnail is substituted.

`presentationReady` is true only when the current snapshot has an accepted pricing section (including explicitly unknown pricing) and its own ready hosted thumbnail. A pending, missing, or failed thumbnail makes the current detail unready even if history contains a working image. Price amounts remain optional. This is a new management detail flag, not a retrofit to existing public-group eligibility. Future frontend integration must honor the flag before rendering real ingested courses.

## Risks / Trade-offs

- Unbounded historical growth -> retain history as requested, deduplicate image bytes, bound submissions, and document disk monitoring; retention deletion needs a separate decision.
- A sparse new snapshot can leave current detail less complete -> show its actual missing/partial states and preserve previous complete observations in history; never silently assemble a composite course.
- Bun 1.3.8 pinned HTTPS/TLS incompatibility -> owner-authorized standard HTTPS without pinning, while keeping TLS verification, DNS/address/redirect preflight checks and all resource/image limits. Known SSRF/DNS rebinding risk remains; TODO: restore verified IP pinning later. Do not continue fixing the pinned transport in this change.
- Filesystem/SQL cannot commit together -> atomic writes, content keys, ready-after-file association, retry leases, and reference-aware staging cleanup.
- Rich provider metadata could contain identities or injected instructions -> preserve v2 review anonymization, selected evidence only, bounded extensions, and source-fact/AI separation.
- Existing groups can still expose minimal references without thumbnails -> explicitly preserve that contract; only future card-ready integration enforces the new readiness flag.
- Explicit processing is a two-step client workflow -> document it in Swagger; durable state is usable by a later worker without requiring that worker now.
- Management remains unauthenticated -> retain loopback-local operation; production access/deployment is outside this change.

## Migration Plan

1. Introduce additive v3 contracts and converter; leave v2 adapters/dashboard intact.
2. Add new checked SQL migrations and configurable ignored asset/staging directories. Preserve existing records and applied migration checksums.
3. Implement repositories/routes and processing. No automatic import, scraping, or seeding.
4. Validate with synthetic submissions, reduced saved provider records, raster fixtures, and isolated PostgreSQL tests. Do not run full-catalog scraping.
5. Update `docs/catalog.md`, `docs/course-data-format.md`, utility/setup docs, README, Plan, and validation notes during implementation to reflect actual behavior and limitations.
6. Roll back by disabling the new route wiring while preserving new tables/files. Never drop history or reset volumes as routine rollback. Back up PostgreSQL and referenced asset storage together.

## Open Questions

- Exact pinned image-processing package/version depends on the specified Bun fixture verification; its choice cannot relax the processing contract.
- Later card layout may justify alternate thumbnail sizes or responsive variants; those require a new processing profile rather than rewriting existing assets.
