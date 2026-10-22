# Design

## Context

See `proposal.md` for motivation and scope. The web workspace uses Next.js 16.3.7 and React 19.3.0; `app/page.tsx` renders the client `Homepage`. That component imports `providerHomepageCourses`, owns local filtering, and also serves fixture-backed group pages. The hero separately imports fixture cards and shares the homepage's sample detail callback. `CoursePrice` assumes only numeric/null one-time prices, so it cannot faithfully represent the backend's full pricing model.

The Bun/Elysia API already has PostgreSQL repositories, safe route errors, OpenAPI, minimal management course lists, and current whole-snapshot management detail. Current snapshots retain structured facts and pricing coverage; thumbnail state and permanent asset metadata are separate. Public group membership/visibility and the six-category registry already exist. Public course presentation is additive; none of those existing contracts needs modification. Local launch uses configurable API ports but does not yet supply a web backend origin.

## Goals / Non-Goals

**Goals:** Establish a shared, validated HTTP presentation boundary; keep database/server code inside the API; render initial results on the web server; preserve the course grid's design and the rest of the frontend; make failures local to the course experience.

**Non-Goals:** Generic proxying, browser access to management responses, new framework/state libraries, course publication controls, assigning categories during ingestion, fixture replacement outside `#courses`, new course routes, or fixing unrelated historical build/runtime problems.

## Decisions

### 1. Add compact public list and detail contracts

Introduce public catalog types and dependency-free runtime validators in `packages/core`, reusing `Page<T>` and `CategoryId`. Implement additive API public routes backed by a dedicated public catalog repository/projection rather than assembling a page through one management HTTP call per course.

List items include course ID, snapshot ID, source checked time, provider ID/display name, title, source URL, thumbnail asset ID/path/dimensions, nullable level/content duration/instructors, editorial category IDs, and a structured price summary. Details extend this with nullable source description, structured syllabus and normalized public offers. Project only display fields, not the retained ingestion envelope. Map known provider names through an explicit registry; unknown provider identity is displayed honestly, without invented logos or facts. Null/omission and confirmed empty sections must remain distinguishable where meaningful.

Alternative: use Elysia's management response types directly. Rejected because they expose evidence/history concerns and bind website changes to internal ingestion evolution. Native `fetch` plus the small shared public contract is sufficient; no Axios, Eden, or query-state dependency is required here.

### 2. Apply eligibility and discovery before paging

Read `courses.current_snapshot_id` and join that observation's facts, thumbnail attempt, and asset. Require existing presentation readiness, including its own hosted asset. Reuse the thumbnail service's existing asset-availability checks; reconcile known missing files before calculating eligible totals/pages, rather than dropping items after paging. Use bounded batched inspection for this small local catalog and avoid loading image bytes or issuing one HTTP call per course. Preserve existing recovery behavior without triggering processing.

List query defaults: 18 items, offset zero; maximum 100 items. Validate `q` length at 200 characters, category against the registry, `freeOnly` as boolean, and integral paging against existing API bounds. Sort by current snapshot `receivedAt` descending, then course ID with deterministic collation. Count and list under a consistent read view after readiness reconciliation. Concurrent catalog updates can change offset pages; no frozen multi-request catalog snapshot is promised.

Normalize searchable text with NFKC, Persian equivalents for Arabic yeh/kaf, ZWNJ-to-space, collapsed whitespace, and case folding. Search title, provider ID/display name, and instructor names as literal substrings; escape SQL wildcard characters and parameterize queries. No fuzzy ranking or description search is introduced.

Derive categories only from memberships in currently public-eligible groups, using the existing publication/minimum-member rule. Ungrouped courses stay visible without a selected category. Category results can be empty until editorial curation exists; do not reuse frontend ID overrides or infer categories from titles/provider tags. This is a documented conservative default, not a new grouping feature.

### 3. Make offer selection explicit

Preserve public offers with their type, terms, status, available normalized toman amounts, and billing periods. Prefer an explicitly free one-time offer; otherwise select the lowest known positive one-time toman offer, breaking ties by stable offer ID. Label a paid summary as a starting price when multiple one-time purchase options exist. If there is no known one-time offer, represent subscription access explicitly when available; otherwise return unknown with an unavailable reason. Never convert an unknown zero to free or guess currencies. Only display a discount when the selected offer has a valid greater original price in the same normalized unit. Free filtering requires explicit free evidence, not numeric zero alone.

Use a scoped real-course price renderer or optional additive card presentation inputs, rather than changing `CoursePrice` behavior for sample pages. The real detail dialog displays all available offer terms instead of hiding purchase alternatives.

### 4. Use the Next.js server as the web-facing boundary

Centralize upstream access in a server-only web module with validated `DOROB_API_URL`, defaulting locally to `http://127.0.0.1:3001`. Require an HTTP(S) origin without credentials, query, or fragment. Use explicit `cache: 'no-store'`, a five-second request deadline, safe status mapping, and runtime response validation. The server-rendered homepage calls this module directly, not its own route handler; pass a serializable initial result/error into the scoped course UI. Keep a loading boundary/error handling local enough that an API outage does not replace the whole page.

Provide fixed same-origin GET handlers for subsequent course lists, encoded course details, and thumbnail asset UUIDs. Handlers accept only supported queries/IDs and build fixed upstream paths. They do not forward cookies, authorization, arbitrary paths, or upstream internal error bodies. Map upstream unavailability/timeouts to safe retryable failures. Thumbnail handling forwards WebP bytes, ETag, immutable caching, and conditional 304 semantics, with a deadline and byte bound consistent with the backend thumbnail profile. Rewrite asset references to these web paths for browser rendering; JSON stays uncached.

Alternative: direct browser-to-API calls plus CORS. Rejected for this first slice because browsers on another device cannot use the server's loopback address and every deployment would need a second public origin. Fixed handlers also let the API remain locally bound. Update `run.sh` to propagate its resolved API host/port into the web process, mapping wildcard bind addresses to a reachable local origin. Document standalone web configuration in an example file and README; no public environment variable or secret is necessary.

### 5. Isolate real course UI from fixture consumers

Add an opt-in API course-section input only for `/`; group routes continue their current fixture path. Keep the `#courses` anchor and existing grid/classes, and add results/paging/status UI inside that section. Existing header search, category selection, and free toggles feed the real section through minimal wiring; do not move controls or change their copy/styles elsewhere. Filter changes reset offset, abort previous requests, and use request identity checks against stale completions. Retry repeats the current query. Failed refreshes must not mislabel old results as the new selection.

Use separate real-detail state/component, leaving the existing sample dialog and hero callback untouched. Fetch public detail when a real card opens, with independent loading/error/404 handling and cancellation on close/change. Display the returned snapshot's own date, and indicate refreshed facts if it differs from the card. Return focus to the card trigger. No need to replace the existing global sample provenance labels: this remains a mixed local prototype, with real-data wording confined to the course results/details.

Reuse card styling; any shared component edits must be optional and preserve fixture defaults. Use semantic tokens, logical CSS, Persian digits/Jalali dates, `dir="auto"`/`bdi` for source text, and text rendering rather than inserting source HTML. New/changed UI files must pass the RTL detector and keyboard/mobile review.

## Risks / Trade-offs

- Automatic exposure includes all ready ingested courses -> accepted for this local slice; a future publication workflow requires a separate change.
- Ready courses may have unknown prices or incomplete facts -> explicit statuses and missing-field presentation, with no historical blending.
- Most current courses may be ungrouped -> category selection honestly returns no matches; editorial curation remains separate.
- Offset pages can shift during ingestion -> deterministic ordering per read; test paging against unchanged data and document this limit.
- Missing image files can disagree with DB metadata -> share existing availability inspection, reconcile before paging, and retain a browser placeholder for races.
- Shared homepage components could leak changes into fixtures -> opt-in API path, separate detail state, and final diff review of preserved regions. Per the owner’s October 11 instruction, browser acceptance is limited to the homepage course section; broader frontend review is deferred.
- Production web build has a recorded Bun runtime limitation -> attempt documented production checks and report actual results; do not silently call the integration production-ready.

## Migration Plan

Add contracts, public API projections/routes, and tests first; then fixed web handlers and the homepage-only opt-in. No schema migration, import, scraping, or editing of existing course/group data is expected. Validate against isolated test records and the current local catalog without changing owner data. Update setup/status documentation during implementation. Rollback disables the homepage opt-in and removes additive handlers/routes; observations, assets, memberships, and fixtures remain intact. This plan does not deploy or change API network exposure.
