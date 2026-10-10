# Tasks

## 1. Ingestion contract and v2 compatibility

- [x] 1.1 Define browser-safe v3 envelope/current/history types in `packages/core`, including mandatory pricing/thumbnail sections and optional typed source sections; verify core/API type checking and a field mapping covering every v2 source-fact key.
- [x] 1.2 Implement server-side boundary validation and canonical request/fact hashing with bounded payload/extension sizes; verify sparse/rich records, invalid nested data, coverage states, explicit free versus unknown prices, multiple offers, list order, anonymous review constraints, and timestamp-independent fact hashes with offline tests.
- [x] 1.3 Add explicit saved-v2 conversion helper/CLI under `apps/utils`, retaining source locators, nullable facts, raw evidence, and deterministic submission IDs; verify reduced fixtures round-trip without overwriting exports, triggering requests, or breaking existing v2 utility tests/dashboard aggregation.
- [x] 1.4 Document the v3 envelope, v2 mapping, required-versus-optional fields, unknown/empty/failure meanings, and conversion command in `docs/course-data-format.md` and utility documentation; verify documented minimal/rich examples pass validation.

## 2. Persistent observations and current views

- [x] 2.1 Add new SQL migrations for snapshots, a same-course current snapshot pointer, thumbnail assets/attempts/uploads and required constraints/indexes without editing applied migrations; verify isolated PostgreSQL migration reruns, transactional failure, and preservation of existing courses/memberships, updating the current hard-coded migration-count assertions appropriately.
- [x] 2.2 Implement atomic course/snapshot ingestion, per-course serialization, and submission replay/conflict handling; verify concurrent submissions, response-loss retry, same-facts later checks, identity stability, and unchanged memberships with repository and integration tests.
- [x] 2.3 Implement whole-snapshot current detail and paginated/exact history reads using serialized acceptance order; verify all current fields share one snapshot ID, missing/partial/failed sections stay explicit, historical replay does not change current, previous facts remain in history, and legacy references have no implied snapshot.
- [x] 2.4 Document history, latest-accepted-snapshot semantics, manual-reference versus source facts, migration/rollback, and retention behavior in `docs/catalog.md`; verify the described synthetic two-observation sequence against repository outputs.

## 3. Thumbnail processing and local storage

- [x] 3.1 Select and pin a server-only raster processor, verifying JPEG/PNG/WebP fixture decoding and encoding under Bun 1.3.8 in development and built startup before adoption; preserve the lockfile and report any dependency-install network/runtime blocker.
- [x] 3.2 Implement configurable persistent asset/staging directories, profile-versioned resize/WebP encoding, actual-content validation, and bounded isolated processing; verify input/output limits, decoded pixels, orientation, aspect ratio, no upscaling/cropping, metadata removal, unsupported animation/SVG, spoofed MIME, timeout cleanup, and dimensions/byte size with fixture tests.
- [x] 3.3 Implement injectable public-HTTPS retrieval using standard HTTPS with TLS verification enabled, public-DNS/address preflight, redirect checks, and streaming/deadline/concurrency limits; temporarily defer IP pinning per owner decision, document accepted SSRF/DNS rebinding risk and a restoration TODO, and verify IPv4/IPv6/mapped-address blocks, mixed DNS results, preflight-to-connection resolution gap, private redirects, false/absent Content-Length, timeout cancellation, and no credential forwarding through controlled transport tests.
- [x] 3.4 Implement opaque expiring upload references and content-addressed atomic asset writes/reuse; verify token consumption/replay, expiry, path isolation, concurrent identical inputs, staged-input recovery, and no duplicated permanent files with filesystem/repository tests.
- [x] 3.5 Implement durable pending/missing/failed/ready states, bounded processing leases and explicit retry, and per-snapshot asset links; verify interruption/restart recovery, older-snapshot processing cannot alter current detail, failed current processing does not borrow historical images, missing/corrupt files, and no ready association before persisted bytes exist.
- [x] 3.6 Document proposed profile defaults, supported formats, limits, storage configuration/ignored paths, cleanup, joint DB/files backup, and original-image non-retention in catalog/setup documentation; verify a normal restart preserves fixture asset access and cleanup retains referenced history.

## 4. API operations and readiness

- [x] 4.1 Add ingestion/current-detail/history/snapshot routes with dependency-injected repositories and safe errors; verify 201/200/409 replay behavior, 422 validation, 404 lookups, 503 outages, canonical encoded IDs, pagination, and source-data/operational-state separation in offline API tests.
- [x] 4.2 Add multipart thumbnail upload, explicit process/retry, and processed-asset serving routes; verify upload size errors, active-lease conflict, safe persisted failure states, ETag/cache headers, unknown IDs/path traversal, and absence of temporary/raw file serving.
- [x] 4.3 Expose the current snapshot's provenance, processing state, and `presentationReady` using its pricing accountability plus its own usable hosted thumbnail; verify unknown pricing remains explicit, missing/failed images are unready even with historical assets, identical input can reuse asset bytes, and all existing curation/public eligibility tests still pass.
- [x] 4.4 Add complete OpenAPI schemas/examples and a synthetic Swagger URL/upload walkthrough in `docs/catalog.md`; verify the machine-readable document and execute the documented ingestion, process, history, and hosted-image flow locally.
- [x] 4.5 Update README, Plan, environment/setup documentation, and validation notes to describe actual local capabilities, unchanged v2 utilities, optional metadata, history retention, explicit thumbnail processing, and deferred AI/frontend/production integration; verify each documented command and endpoint against the implemented service.

## 5. Integration validation

- [x] 5.1 Run documented root lint/typecheck plus API tests/build and utility tests, and the production web build required by contributor instructions; record results and any existing/environment blockers in `docs/validation.md` without changing unrelated frontend behavior.
- [x] 5.2 With isolated healthy PostgreSQL, run `API_INTEGRATION=1 bun run test:api` and built-service smoke checks spanning rich/sparse ingestion, changed pricing, duplicate replay, URL/upload thumbnail reuse, historical image changes, migration reruns, and normal restarts; verify retained IDs, facts, group links, asset URLs, and safe partial-failure recovery.
- [x] 5.3 Review the implementation diff against both capability specs and verify no automatic scraping/import/AI calls, legacy contract changes, secrets, generated assets, or destructive retention operations entered the change; record remaining limitations for owner review.
