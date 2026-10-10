# Tasks

## 1. Shared public presentation contracts

- [x] 1.1 Add browser-safe public course list/detail, offer/price summary, and query contracts with runtime validators in `packages/core`; verify valid sparse/rich responses and reject malformed identity, pricing, paging, and thumbnail paths in focused Bun tests.
- [x] 1.2 Implement deterministic current-fact presentation and offer selection without raw ingestion metadata or fixture fallbacks; verify free/paid/multi-offer/subscription/unknown/discount cases and whole-snapshot missing-field behavior with focused projection tests.
- [x] 1.3 Document the public presentation fields, price selection rules, and source-time semantics in `docs/catalog.md`; verify examples agree with the exported contracts and explicitly distinguish backend reads from fresh provider collection.

## 2. Backend public course catalog

- [x] 2.1 Add repository reads using current observations and hosted-thumbnail readiness, including availability reconciliation before totals/paging; verify ready ungrouped courses, minimal references, pending/failed refreshes, missing asset files, and unknown-price eligibility in isolated database/storage integration tests.
- [x] 2.2 Add normalized literal search, explicit-free filtering, public-group-derived categories, matching counts, and stable ordering with bounded pagination; verify a match beyond page one, Persian/Arabic/ZWNJ equivalents, literal wildcard input, tied timestamps, duplicate category memberships, and unassigned courses in integration tests.
- [x] 2.3 Add GET `/api/v1/courses` and encoded-ID GET `/api/v1/courses/:courseId` with OpenAPI schemas and safe 422/404/503 errors; verify offline route/schema tests and existing management/group contract tests pass without exposing evidence or diagnostics.
- [x] 2.4 Document public API examples, automatic readiness eligibility, query limits/order, and conservative editorial category semantics in `docs/catalog.md`; verify the examples through local Swagger against isolated data.

## 3. Web API access and local configuration

- [x] 3.1 Add the server-only API module with validated `DOROB_API_URL`, five-second deadlines, explicit uncached JSON fetches, response validation, and safe error mapping; verify malformed responses, wrong content, timeouts, and backend failures using controlled upstream tests and confirm server modules cannot enter browser imports.
- [x] 3.2 Add fixed same-origin list/detail handlers and a UUID-only hosted-thumbnail handler with bounded bytes/deadline, ETag/cache forwarding and 304 support; verify encoded IDs, allowed query forwarding, rejected arbitrary upstream selection, safe failures, image bytes, and conditional requests with controlled upstream tests.
- [x] 3.3 Supply initial server-rendered course results/error to the homepage through the shared server module with a scoped loading boundary; verify rendered initial cards and an unavailable backend leave surrounding content usable without calling the web's own handlers from the server.
- [x] 3.4 Propagate the resolved API origin from `run.sh` to the web process and document standalone configuration in a web env example and `README.md`; verify default/custom API ports, frontend-only error behavior, and `bash -n run.sh`, without exposing database configuration to the browser.

## 4. Homepage-only course presentation and interactions

- [x] 4.1 Add the opt-in real course section for `/`, reusing current card/grid styles with scoped pricing and source-date rendering; verify real/free/discounted/subscription/unknown/sparse cards and confirm fixture card defaults and group-route data remain unchanged.
- [x] 4.2 Wire existing search/category/free controls to public catalog requests and add paging inside `#courses`; verify counts, filter resets, a match beyond the initial page, request cancellation/stale-response protection, and honest empty results without modifying control layout or surrounding copy.
- [x] 4.3 Add scoped loading/error/retry/image-placeholder behavior with no fixture fallback; verify initial failure, subsequent query failure, retry recovery, and invalid-response handling using controlled responses.
- [x] 4.4 Add a separate real-course detail dialog with public facts, offers, source link, missing-field states, cancellation, and observation-date handling; verify 404/error/retry, a refresh between card and detail, dialog keyboard/focus return, and untouched hero sample-detail behavior.
- [x] 4.5 Review changed UI with the RTL detector and browser checks at mobile/desktop widths; verify long Persian/Latin titles, Jalali dates/Persian digits, live status announcements, visible focus, and no unintended overflow. Record evidence in `docs/validation.md`.
- [x] 4.6 Update `docs/frontend.md`, `README.md`, and `Plan.md` with the integrated course-only scope and remaining fixture regions; verify descriptions match observed behavior, including empty editorial category results and offset-paging limits.

## 5. Integration and regression acceptance

- [x] 5.1 Exercise the existing local catalog through the homepage without modifying owner records; verify course list, hosted image, public detail, source navigation, pagination, and scoped backend outage/recovery. Record results and any environment limitations in `docs/validation.md`.
- [x] 5.2 Review the final diff for changes outside the authorized homepage course integration; keep other frontend regions unchanged. Per the owner’s October 11 instruction, browser acceptance covers only the homepage course section; broader frontend review is deferred.
- [x] 5.3 Run documented `bun run lint`, `bun run typecheck`, `bun run test:api`, applicable web/core tests, `API_INTEGRATION=1 bun run test:api` with a healthy isolated test database, `bun run build:api`, and `bun run build`; record actual outcomes and any existing build/runtime or unavailable-environment blockers without claiming unrun checks passed.

## Workflow follow-up

- Review implementation before requesting spec synchronization/archive.
- Commit only after explicit confirmation for the completed changes; do not push or create branches without authorization.
