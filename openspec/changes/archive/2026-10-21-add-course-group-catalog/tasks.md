# Tasks

## 1. Public group list contracts and filtering

- [x] 1.1 Add distinct list-query validation for optional `q` and fixed-registry `category`, preserving detail paging/pinning; verify shared contract tests cover defaults, limits, duplicates, unknown keys, invalid categories, oversized search and rejection of list filters on detail.
- [x] 1.2 Add normalized literal matching against selected hero title/subtitle/description and category matching before list totals/slicing in the judged-group repository; verify focused tests cover Arabic/Persian equivalents, NFKC, ZWNJ, whitespace, case, empty input, literal punctuation and member-only nonmatches.
- [x] 1.3 Extend public judged-group route schemas/OpenAPI with the filters and safe 422 behavior; verify route tests and response examples retain the existing item/page shape and unfiltered defaults.
- [x] 1.4 Extend isolated repository integration tests with more than twelve eligible groups, combined filters and ineligible matches; verify full matching totals, matches beyond the unfiltered first page, stable ties and unchanged freshness/complete-membership behavior without altering retained user groups.
- [x] 1.5 Document the list filters, matching fields and ordering in `docs/catalog.md`; verify request examples agree with route schemas and focused API/core checks pass.

## 2. Web boundary and URL-backed catalogue

- [x] 2.1 Extend group list serialization, server/browser clients and the fixed same-origin bridge with search/category; verify `group-api.test.ts` covers encoded queries, strict validation, limits/deadlines, safe failures and detail compatibility.
- [x] 2.2 Read installed Next.js routing/search-parameter guidance required by `apps/web/AGENTS.md`, then add `/groups` URL parsing/building for `q`, `category` and one-based `page`; verify tests cover omitted defaults, blank search, ignored unrelated parameters, duplicate recognized parameters, invalid selections and safe offset bounds.
- [x] 2.3 Add the server-rendered catalogue route with shared group cards, Persian metadata/headings, matching totals and twelve-item paging; verify initial filtered rendering, correct destinations, boundary controls and last-page recovery after totals shrink through route/UI tests.
- [x] 2.4 Add explicit search submission, single-category selection, removable active chips and clear-all using URL-owned committed state; verify combined conditions, page reset, preserved opposite condition, reload and Back/Forward restore controls/results without stale-response replacement.
- [x] 2.5 Add pending, no eligible groups, no matches, invalid-selection and retry states; verify retries retain the committed URL and failures do not become empty results or fixture fallback.
- [x] 2.6 Add responsive right-side desktop category controls and an accessible mobile filter panel using existing tokens/primitives; verify visible focus, panel containment/Escape/focus return, request announcements, Persian numerals and mixed-direction text in UI checks.
- [x] 2.7 Document `/groups`, URL semantics, filter scope and local-scale limitations in `README.md` and `docs/frontend.md`; verify examples against route tests and preserve the distinct homepage course-search behavior in the documentation.

## 3. Homepage entry points and compact showcase

- [x] 3.1 Refactor the homepage group section to server-fetch/retry three groups, share `PublicGroupCard` with the catalogue, remove homepage group paging and add «مشاهده همه مجموعه‌ها»; verify zero/one/two/three/more-than-three cases, action availability in every state and independent course-section recovery.
- [x] 3.2 Add link-mode support to `CategoryGrid` using the existing `CategoryCard` link variant and wire homepage categories to `/groups?category=<id>`; verify all six hrefs, link semantics, unchanged artwork and callback-driven design-system selection examples.
- [x] 3.3 Remove obsolete homepage category-to-course state wiring while retaining individual-course search/free queries and details; verify existing course/hero tests, comparison links and legacy group redirects remain compatible.
- [x] 3.4 Update `Plan.md`, `README.md` and `docs/frontend.md` for the implemented homepage/category behavior; verify descriptions no longer claim homepage group pagination or category-driven homepage course filtering, and retain accurate phase/implementation status.

## 4. Integrated acceptance

- [x] 4.1 Exercise category entry, combined search/category paging, chip removal, clear-all, browser history, direct URLs and group-detail navigation in a running browser; record results in `docs/validation.md` and verify no provider filter appears.
- [x] 4.2 Check 320px, 390px and desktop layouts with long Persian/Latin content, keyboard-only navigation, mobile panel focus and reduced-motion cycling cards; record screenshots/findings in the validation record and resolve unintended overflow or focus failures.
- [x] 4.3 Run `bun test packages/core/tests apps/web/tests`, `bun run test:api`, enabled isolated API integration checks when PostgreSQL is available, `bun run lint`, `bun run typecheck`, `bun run build` and `bun run build:api`; record actual outcomes and unavailable checks in `docs/validation.md`, including any current production-build failure.
- [x] 4.4 Review the final scoped diff and validate `add-course-group-catalog` with strict OpenSpec validation; verify all specified behaviors have evidence, documentation is coherent, and no migration, retained-data mutation, provider filter or unrelated code is introduced.
