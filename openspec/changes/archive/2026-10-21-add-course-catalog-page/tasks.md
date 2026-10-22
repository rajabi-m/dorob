# Tasks

## 1. Public course query and filter support

- [x] 1.1 Add browser-safe provider choices and optional provider/priceStatus/duration query fields with validation; extend core tests to verify valid values, duplicates, unsupported values, old defaults and freeOnly conflicts using `bun test packages/core/tests/public-courses.test.ts`.
- [x] 1.2 Extend repository filtering and public route/OpenAPI schemas; verify provider/status intersections, unknown pricing, multiple offers, fractional duration boundaries/nulls, filtering before totals/pagination, stable order and unchanged eligibility/category/free-only behavior with focused API tests and isolated PostgreSQL integration fixtures.
- [x] 1.3 Thread new fields through server/browser course serialization and same-origin list handling; extend `apps/web/tests/course-api.test.ts` to verify conditions survive both boundaries and invalid input remains safe without exposing API origins.
- [x] 1.4 Document new query values, duration boundaries, summary-price semantics and compatibility in `docs/catalog.md`; verify examples agree with route schemas and the focused API/core checks.

## 2. Dedicated course catalogue

- [x] 2.1 Add URL state parsing/building and page-to-offset conversion for q/provider/priceStatus/duration/page; verify canonical omissions, whitespace-only search, repeated/invalid inputs, unrelated category/level handling, and representable page bounds with focused URL-helper tests.
- [x] 2.2 Add server-rendered `/courses`, metadata, loading and invalid states, eighteen-item requests and out-of-range page correction; verify initial rendered course facts, empty catalogue versus no matches, full matching totals, safe upstream failure and canonical recovery URLs with route-level tests.
- [x] 2.3 Build the catalogue using existing cards/details and tokens, desktop filters, search, chips, clear-all and paging; verify combined conditions, filter/search page resets, independent chip removal, retry preservation, price provenance and details focus return with component interaction tests.
- [x] 2.4 Add URL-driven transitions and mobile filter modal covering all real focusable controls; verify Back/Forward restores conditions/results, obsolete navigation cannot replace new results, and keyboard containment/Escape/selection dismissal return focus correctly.
- [x] 2.5 Add isolated examples of any new reusable filter controls to `/design-system` and describe the catalogue's URL/control behavior in `docs/frontend.md`; verify examples remain independent of live data and no category/level controls or unsupported ranking claims appear in product screens.

## 3. Group-first homepage and connected navigation

- [x] 3.1 Replace the public homepage course catalogue with an unfiltered three-item shelf, existing real details and scoped retry; verify no course filters, full total or paging remain, fewer-than-three/zero/error states are honest, `#courses` still resolves and the all-courses link opens `/courses`.
- [x] 3.2 Route homepage header search to `/groups` with its current submitted q and a group-search accessible name; verify nonempty Persian/Latin input, whitespace-only input, encoding and typing without course fetches while preserving hero/category/group-showcase behavior.
- [x] 3.3 Share only the needed catalogue shell/navigation, add «همه دوره‌ها» links and correct current-page state, and replace the group no-groups course fallback with `/courses`; verify cross-catalogue links carry no conditions and `/groups` category/search/pagination and group comparison destinations still work.
- [x] 3.4 Update homepage/navigation regression tests and `Plan.md`, `README.md` and `docs/frontend.md` to describe the group-first search, bounded shelf and dedicated course destination; verify documentation matches delivered routes and retained real-group hero behavior.

## 4. Integrated validation

- [x] 4.1 Exercise homepage search -> group catalogue -> comparison and homepage/group links -> course catalogue -> combined filters -> paging -> details -> Back/Forward in the browser; verify real retained data, refresh restoration and distinct empty/failure/retry states without any ingestion, publication or inference.
- [x] 4.2 Check 320px, 390px and desktop layouts with long mixed Persian/Latin titles, Persian digits/Jalali provenance, keyboard-only navigation, mobile filters and details focus; run the RTL detector on touched UI files and resolve findings, recording evidence in `docs/validation.md`.
- [x] 4.3 Run focused core/API/web regression suites, `bun run lint`, `bun run typecheck`, `bun run build:api` and `bun run build`; record exact results and any environment/build blockers in `docs/validation.md`, without marking unavailable checks as passed.
- [x] 4.4 Review the final implementation diff and validate this OpenSpec change strictly; verify only intended files changed, all three deltas are satisfied, documentation is accurate, no dependency/lockfile churn occurred and the independent scraper change is untouched.

## 5. Owner follow-up: direct provider navigation

These follow-up decisions supersede the earlier modal-specific implementation and validation references in sections 1–4.

- [x] 5.1 Replace public card title/action callbacks with exact provider source links, new-tab safety and accessible notices; remove the retired dialog and selection wiring from every public card consumer. Verify focused card/catalogue tests show provider links without detail requests or course modals.
- [x] 5.2 Align the change specs/design and current product documentation with provider navigation; verify strict OpenSpec validation and preserve the public detail API and independent fixture previews.
- [x] 5.3 Verify lint, types, production build attempt, RTL/focus/mobile presentation and the rendered live provider links; record results and remaining environment limitations.
