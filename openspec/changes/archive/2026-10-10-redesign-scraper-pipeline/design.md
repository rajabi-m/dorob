# Design

## Context

See `proposal.md` for motivation. All four adapters currently return `ProviderCourse` v2. `runExportCli` handles checkpointed exports, and aggregation/dashboard consumers expect that shape. TopLearn, Sabzlearn and Roocket compose `PublicProviderClient`; Maktabkhooneh duplicates the request queue, robots parser, retry loop and options. Its pure parser and fixture tests already cover Nuxt decoding, offers, durations, syllabus and anonymous reviews.

The API accepts browser-safe `CourseIngestion` v3 through `POST /api/v1/manage/course-ingestions`, returns 201 for new acceptance or 200 for replay, and provides explicit snapshot thumbnail processing. `convertCourseV3` maps saved v2 facts but deliberately labels section coverage unknown. Current detail follows latest acceptance, including old observations newly delivered later. Existing ingestion and thumbnail specs remain unchanged.

## Goals / Non-Goals

**Goals:** Establish one parent abstraction for provider collection and an independent worker for durable delivery, using Maktabkhooneh to prove the full contract. Retain existing extraction capabilities and make coverage decisions at collection time.

**Non-Goals:** The worker is an explicitly run local command, not a scheduler, distributed job system or backend service. It does not determine publication, categories, memberships or website presentation. Other adapters remain v2 implementations until a subsequent change.

## Decisions

### 1. Abstract parent with composed transport

Add server-only `BaseScraper` under `apps/utils/scrapers`. It owns initialization, controlled request helpers, bounded sitemap traversal, cancellation and deduplicated sequential course iteration. Protected abstract hooks supply provider identity/origin, canonical course URLs, sitemap relevance, provider course identity and page extraction. Optional additional-origin clients are created through the same policy factory, with independent robots and spacing per origin.

`PublicProviderClient` remains the transport implementation; the parent delegates to it rather than copying policy. Maktabkhooneh extends the parent and removes its duplicate transport/robots implementation. Provider parsers receive fetched source data rather than unrestricted fetch functions. Injected transport/time/ID seams enable deterministic offline tests.

Alternative: composition-only adapters would reduce inheritance, but the owner selected an abstract parent as the common template. A universal configurable parser is rejected because provider page structures and evidence differ.

### 2. Native v3 collection boundary with an explicit v2 compatibility adapter

The public Maktabkhooneh scraper methods emit `CourseIngestion` v3; the stream carries requested URL, observation or safe failure. The base validates observations before yielding. Generate a fresh submission ID for each successful collection, then freeze that payload for delivery. Stable course identity uses the existing provider ID and source course ID, not title, frontend fixture ID or signed thumbnail URL.

Reuse Nuxt decoding and field extraction as pure functions. Refactor their result into facts plus deliberate coverage/evidence, then assemble v3. Preserve ordered lists, offer evidence, original units, anonymous feedback and source dates. Translate field locators to v3 paths. Omit uninspected optional sections; retain inspected unknown/partial/failed sections with reasons. Only mark complete when supported by the provider representation. Optional extraction errors can be section failures; invalid required identity/core remains a collection failure. Reuse API validation as a server-only dependency initially, following the existing converter, without moving runtime validation into browser-safe core.

Keep `scrape:maktabkhooneh` export-only and v2 through a dedicated compatibility adapter over the same facts and transport; do not reverse-map v3 observations into lossy v2 or maintain two independent parsers. Preserve legacy checkpoint validation and dashboard aggregation. Document the programmatic v3 breaking change and new import path/types; leave other provider entry points and the saved-v2 converter intact.

Alternative: always wrapping the old v2 converter is simpler, but loses native collection coverage. Replacing all CLI formats would force unrelated provider/dashboard migrations.

### 3. Worker and backend client are separate from the scraper

Add `ScraperWorker` and a narrow injectable backend client under `apps/utils`. The worker receives a base scraper and backend client, selects explicit URLs or bounded discovery, and processes selections sequentially: collect, persist payload, ingest, persist receipt, request image processing, persist result. Requests use encoded course/snapshot identifiers and the backend-returned identities. Only the backend downloads and hosts thumbnail bytes.

Provide a separate `ingest:maktabkhooneh` root command with `--url`, `--limit` (default ten), `--all`, `--checkpoint`, `--resume`, and explicit backend URL configuration, defaulting to the local loopback API. Validate options/destination before collecting; backend calls reject unexpected redirects and use finite timeouts with at most three transient retries. No credentials belong in checkpoint URLs or logs. Keep retries for backend delivery distinct from provider request retries. Failed image responses can be HTTP 200 with `thumbnail.status: failed`, so inspect response state as well as HTTP status.

Alternative: direct database persistence bypasses ingestion validation and history policy. Embedding delivery in provider classes couples parsers to the API. A queue service adds deployment scope that is unnecessary for the local reference implementation.

### 4. Versioned durable run journal

Use an ignored checkpoint path beneath `apps/utils/output`, a versioned JSON journal, private file permissions and atomic replacements. Keep run ID, provider/extractor version, selected canonical URLs and selection mode, sanitized backend origin, immutable observation payloads, per-selection attempts, receipt identities, image outcomes, failures and timestamps. Acquire an exclusive per-checkpoint lock; never run two writers against the same file. Diagnose abandoned locks after a crash and provide an explicit safe recovery procedure, without silently removing a possibly live owner's lock.

New runs require a new checkpoint path; existing files are not overwritten. Resume reads and validates the complete journal, payloads and matching configuration before any network or write operation. It does not rediscover selections. Saved observations bypass scraping and retain their original IDs/content/dates. Selections without an observation can be recollected; accepted selections retry only outstanding image work. A crash after backend acceptance but before receipt persistence is recovered by replaying the identical saved payload. Update outstanding error state on successful resume while retaining attempt history.

On transient backend exhaustion, retain pending work and stop fetching more courses. Terminal 409/422 is recorded without mutation; it remains an actionable failure on resume rather than receiving an automatic replacement ID. Individual extraction failures do not prevent other selections from succeeding. Cancellation stops new work and leaves the last atomic journal recoverable. Persistence failure is fatal before any new unsaved submission.

Alternative: in-memory progress cannot distinguish replay from refresh after a crash. Backend-backed job state would need new endpoints and schema. Fact hashes alone cannot identify retries because unchanged fresh observations must still produce history.

### 5. Thumbnail outcomes and completion

Use returned snapshot state to skip ready assets and explicit missing input. For URL inputs, call `/api/v1/manage/courses/:courseId/snapshots/:snapshotId/thumbnail/process`. Retain failed/pending image outcomes separately from accepted ingestion receipts; busy processing has bounded retry, and explicit resume retries unresolved images without creating new observations. Report new acceptance, replay, pending delivery, collection/delivery errors and image states independently. Unknown pricing remains unknown; ready images alone do not establish live facts. Intentional missing thumbnails do not make the run fail, but reports show presentation readiness false.

## Risks / Trade-offs

- Provider template drift -> Preserve pure fixtures and regression tests, report extraction failures, and verify the explicit paid Python sample live. Owner decision on October 10 defers live free LPIC-1 acceptance after its endpoint returned HTTP 500; retain that limitation and TODO instead of claiming free live coverage.
- Shared transport changes affect unmigrated providers -> Reuse existing defaults and run their offline tests; do not restructure those adapters in this change.
- Programmatic output changes -> Mark the v3 break explicitly; keep export-only CLI, v2 compatibility tests and migration examples.
- Old undelivered observations can become current after a newer run -> The backend uses acceptance order. Document one active worker run per provider/backend, finish pending delivery before fresh refreshes, and do not claim cross-checkpoint or distributed ordering protection.
- Checkpoints contain source evidence -> Ignore generated files, keep permissions private, redact logs, and require operator cleanup/retention rather than committing data.
- Thumbnail URLs may expire -> Preserve accepted facts and actionable image failure; a fresh collection can provide a refreshed URL. Existing backend TLS and preflight policies and the documented temporary IP-pinning exception are unchanged.
- The local API lacks authenticated administration -> Keep the worker workflow local and trusted; production operation remains deferred.

## Migration Plan

1. Introduce the base and common policy tests while existing provider commands continue working.
2. Migrate Maktabkhooneh to v3 and route its legacy CLI through the compatibility adapter; verify both outputs against existing fixtures.
3. Add the independent backend client, worker journal and explicit ingestion command. No database migration, automatic startup hook or fixture import is needed.
4. Verify offline crash/retry behavior and real ingestion/history/image persistence in an isolated test database. Run the explicit paid Python mk346 selection for live acceptance and same-checkpoint resume. Per owner decision on October 10, skip free LPIC-1 mk711 after confirmed provider HTTP 500; retain a live free-course acceptance TODO and the prior failed-run evidence. Free pricing remains verified by offline fixtures. Do not expand to a catalog crawl.
5. Update utility/root READMEs, `Plan.md`, adapter/format/catalog and validation documentation with the reference subclass and run/resume workflow.

Rollback disables the new command or reverts utility changes while preserving backend observations/assets and local checkpoints. Existing v2 exports and the other provider commands remain usable. No historical backend data is deleted during rollback.
