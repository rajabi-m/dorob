# Tasks

## 1. Shared contracts and public selection

- [x] 1.1 Add browser-safe judged-group list/detail contracts, query parsing and runtime schemas in `packages/core`, including nullable ratings, separate assessments and judgment pins; verify valid fixtures and malformed slug, UUID, paging, duplicate/unknown query and unexpected-field rejection with contract tests.
- [x] 1.2 Implement read-only current-judgment selection using the existing canonical revision and complete-member readiness under a consistent database view; verify isolated repository tests for drafts, small groups, no judgment, stale sources/definitions/references/memberships/publication, unready assets and unchanged management freshness/history.
- [x] 1.3 Implement batched list projections, distinct providers, first-three judge-ordered covers, eligibility-before-pagination and deterministic slug/ID order; verify totals and paging beyond page one with synthetic groups, shared courses and tied judgments, including an older matching revision outside the newest history page.
- [x] 1.4 Implement paginated detail facts/ratings/offers in exact judge order with a pinned selected judgment and 409 on changed selection; verify expensive-first order, complete membership, same-snapshot joins, nullable ratings, free/paid/unknown/subscription pricing and no private manifest/feedback leakage in API tests.
- [x] 1.5 Add documented public routes with schema validation and safe 422/404/409/503 handling; verify HTTP/OpenAPI tests and regression coverage for existing public group/course and management endpoints, including read-only behavior with no inference, image processing or writes.
- [x] 1.6 Update `docs/catalog.md`, `docs/ai-judge.md` and backend status in `Plan.md` for eligibility, publish-before-judge freshness, paging and local-scale limitations; verify documented examples against route schemas without mutating the working catalog.

## 2. Server-only web access

- [x] 2.1 Read the relevant installed Next.js guides and add the server-only judged-group client plus concrete same-origin retry/paging handlers, reusing thumbnail access; verify web boundary tests for custom API origins, allowed paths, redirects, content types, finite deadlines, body caps, response validation and safe error mapping.
- [x] 2.2 Add request-local shared detail loading for metadata/page consistency and dynamic no-store routing without fixture static-param enumeration; verify metadata uses eligible generated title/description and backend outages remain retryable errors rather than false 404s.
- [x] 2.3 Document the public web boundary and retained-data/freshness behavior in `docs/frontend.md` and setup implications in `README.md`; verify existing `DOROB_API_URL` and launcher commands require no new configuration or startup inference.

## 3. Homepage group discovery

- [x] 3.1 Adapt cycling group cards to narrow cover/provider props with fixture adapters for design-system usage; verify UI tests retain cycling pauses, reduced motion and existing showcase behavior while real cards use actual providers/counts and stored-slug links.
- [x] 3.2 Replace homepage fixture group mapping with independently server-rendered judged-group results, bounded pagination and Persian loading/empty/retry states; verify component tests for failed and recovered API requests, stale-response suppression, zero matches and independent existing course search/filter/results.
- [x] 3.3 Remove stale demonstration/group-placeholder labels and homepage sample metadata description from product surfaces while preserving independent hero sample provenance; verify rendered copy and update `docs/frontend.md` plus homepage status in `Plan.md` to match delivered behavior.

## 4. Generic judgment-backed group page

- [x] 4.1 Extract the Python page shell, gallery, course rows, provider/price and assessment components into data-driven reusable components; verify arbitrary registry categories, provider fallback identities, long mixed-direction titles and actual group/provider counts with UI fixtures.
- [x] 4.2 Wire generated hero fields, exact course order, four tag styles and assessment lists to validated public details; verify expensive-first placement, empty strengths/weaknesses/both, safe text rendering, optional ratings and source purchase options without invented claims or lesson/effort metadata.
- [x] 4.3 Add course paging with absolute ranks, page-scoped gallery, judgment-pinned URLs and restart on conflict; verify refresh/back/forward, selection changes and that superseded responses cannot mix course pages or judgments.
- [x] 4.4 Add canonical real-slug destinations and the two documented legacy redirects, replacing public fixture comparisons; verify unknown/ineligible 404s, retryable dependency failures, old Python/n8n redirects and no guessed HTML/CSS redirect.
- [x] 4.5 Preserve five-second gallery controls/keyboard behavior, hover/focus/hidden-tab pauses, reduced motion, honest image fallbacks and localized source dates; verify interaction tests and update `docs/frontend.md` with the final generic page and legacy-route behavior.

## 5. Integration acceptance

- [x] 5.1 Run isolated PostgreSQL-backed public-list/detail acceptance across eligibility transitions, source changes, pinned traversal and storage failures; verify no fixture fallback, no comparison omissions and no changes to source facts, membership, publication or immutable judgment history.
- [x] 5.2 Inspect available live judged groups read-only through homepage cards and their destinations; verify displayed hero, counts, providers, assessment order and source facts against API readback, recording actual coverage rather than asserting a fixed count of eight in `docs/validation.md`.
- [x] 5.3 Review at 320px, 390px and desktop widths with keyboard, mixed Persian/Latin text, long assessments and reduced motion; run the RTL detector on touched UI files and verify focus, labels, dates, gallery pauses and no unintended horizontal overflow, recording evidence in `docs/validation.md`.
- [x] 5.4 Run `bun run lint`, `bun run typecheck`, focused core/web tests, `bun run test:api`, isolated `API_INTEGRATION=1 bun run test:api`, `bun run build:api`, `bun run build` and strict change validation; record results and any environment/build limitations in `docs/validation.md`, and reconcile README/Plan status with actual delivery.
