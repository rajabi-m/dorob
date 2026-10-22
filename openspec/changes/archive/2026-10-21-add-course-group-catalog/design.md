# Design

## Context

See `proposal.md` for motivation and scope. This is phase 3 public-catalog integration using retained judgments and current provider facts, not new collection or model execution.

`apps/web/src/app/page.tsx` requests twelve judged groups. `PublicGroupSection` / `GroupResults` in `public-group-section.tsx` combine the homepage section with local-state paging, abortable same-origin requests and `PublicGroupCard`. `Homepage` category selection currently changes individual-course query state and scrolls to that section. `CategoryCard` already supports links, but `CategoryGrid` currently exposes only selection callbacks.

`GroupPageQuery`, its parser and `groupQueryString` currently cover pagination plus detail judgment pins. Server/browser clients validate bounded no-store responses through the fixed `/api/judged-groups` bridge. The API repository assembles eligible groups before slicing, ordered by slug then ID. Public cards render selected hero text; group definitions are separately revision-bound. Main specs currently mandate homepage group pagination and category-driven course filtering; the deltas explicitly replace those requirements.

Existing contract, route, repository integration and UI coverage lives in `packages/core/tests/public-group-judgments.test.ts`, `apps/api/tests/public-group-judgment-routes.test.ts`, `apps/api/tests/public-group-judgments.integration.test.ts`, and `apps/web/tests/group-api.test.ts` / `group-ui.test.tsx`.

## Goals / Non-Goals

**Goals:** Reuse the public eligibility boundary, card presentation and category registry; make committed catalogue state reproducible from an address; isolate homepage discovery from catalogue traversal; preserve detail query validation.

**Non-Goals:** New editorial featuring, ranking, provider/price/level/sort controls, search across individual member courses, changes to publication/freshness, database migrations, or redirects that reinterpret existing group-detail slugs. Homepage search continues to search individual courses; the catalogue has its own labelled search.

## Decisions

### 1. One catalogue route with URL-owned committed state

Add `apps/web/src/app/groups/page.tsx` beside the existing `[id]` detail route. Its search parameters are `q`, `category`, and one-based `page`; omit defaults in generated URLs. Validate recognized parameters before fetching. A blank normalized search becomes absent, categories come from the shared registry, and page values must map safely to the API's bounded offset. Invalid recognized selections render a Persian recovery state. Ignore unrelated page parameters instead of forwarding them to the strict upstream API.

Use a server-rendered page and normal route navigation for committed search/category/page changes, rather than keeping a second client-owned result cache. Submit search explicitly; input typing is draft state. Category selection preserves the committed search, not unsent input. Both changes and chip removal reset page one. The URL updates through navigation and supports Back/Forward and reload. A pending transition exposes loading and prevents an old response from replacing the current selection. Keep draft input synchronized when history changes the committed search.

Map page to `limit=12, offset=(page-1)*12` only after validation. On a positive page beyond available results, derive the last matching page from the returned total and redirect to its URL, preserving conditions; zero total resolves to page one. Do not redirect on fetch failure. Live eligibility can still change again during navigation; avoid an internal retry loop.

Alternative: separate `/categories/[id]` pages duplicate state and recovery logic. Client-only results leave initial URL restoration and server rendering harder to guarantee.

### 2. Extend the judged-group list boundary, not reference-group APIs

Introduce a distinct list-query type supporting `q` and `category` while retaining the existing detail query semantics. Update parsers, serializers, server/browser clients, same-origin handler, route schemas and OpenAPI examples together. List-only parameters must not become accepted detail parameters accidentally; existing callers without filters remain compatible. Keep page-level `page` out of the API contract, which continues using limit/offset.

Filter eligible selected summaries by assigned category and normalized literal substring in hero title/subtitle/description, before total and slicing. Normalize each search field and query using NFKC, Arabic-to-Persian letters, ZWNJ-to-space, whitespace collapse, trim and case folding. An empty normalized search imposes no restriction. Match fields independently rather than joining text across field boundaries. Match the text visitors see instead of private editorial definition text or every member course. Preserve slug/ID ordering, strict eligibility, complete comparisons and read-only behavior.

Use the existing in-memory eligibility assembly for this local-scale catalogue; no search service or index is justified here. Do not broaden the reference-group API or infer categories from courses. Reuse the existing text-normalization helper only if its precise behavior satisfies the group contract; add focused normalization behavior without silently changing individual-course matching semantics.

### 3. Separate homepage showcase from reusable catalogue results

Keep `PublicGroupCard` shared. Refactor the homepage section to fetch/retry `limit=3, offset=0`, render at most three cards and show «مشاهده همه مجموعه‌ها» linking to `/groups`. Keep the action available in loading, empty and failure states. Never imply that the displayed count is the full catalogue count. Preserve the existing stable order instead of inventing popularity or featured selection.

Add a link-capable grid mode using `CategoryCard`'s existing link variant; homepage links use `/groups?category=<registry-id>`. Preserve callback-driven design-system selection examples. Remove homepage category click wiring that mutates individual-course filters; do not modify the public course API's category support. The existing course section, search, free control, hero interactions and group detail links keep their respective behavior.

Alternative: configuring the old local-state homepage pager as both showcase and catalogue retains two competing sources of browsing state and complicates three-card retries.

### 4. Reuse the design system for accessible catalogue composition

Use the existing brand/header/footer presentation and semantic tokens without introducing a visual redesign. Keep the catalogue title, search, count, active chips and group grid in the main region. Category selection uses one optional value from the six-entry registry, with an all-categories option. Show category controls in a right-side desktop region and a labelled filter panel on mobile. Reuse an accessible existing panel/dialog primitive when suitable; provide focus containment, Escape, close control and focus return. No provider control or empty future-filter slots.

Use `lang=fa`, `dir=rtl`, logical spacing, correctly directed paging arrows, Persian numerals and bidi isolation for submitted queries and titles. Preserve cycling-card motion/focus behavior and image fallback. Announce pending/results states without repeatedly moving focus while typing; after paging, make the result heading discoverable and maintain a predictable keyboard path. Preserve full accessible text for visually truncated labels. Check 320px, 390px and desktop widths.

### 5. Preserve bounded failures and test the user journeys

Reuse server-only origin configuration, fixed same-origin paths, five-second deadlines, 2 MiB list bounds, strict payload validation and no-store behavior. Distinguish malformed page selections, valid zero matches, empty eligible catalogue and upstream outage. Retry uses the current URL. No fixture fallback or internal diagnostics reach product screens.

Extend existing tests for normalization, combined filters before pagination, validation/serialization, homepage links and limits, catalogue URL restoration, history, filter reset, boundary pages and mobile panel focus. Add isolated repository acceptance data with more than twelve eligible groups to prove filtering is catalogue-wide; do not publish or modify retained user groups. Verify existing judgment pins, legacy detail redirects, course search and design-system category selection as regressions.

## Risks / Trade-offs

- Catalogue size increases eligibility scanning and thumbnail checks → retain current batching/time bounds, document local-scale limits and avoid presenting offset paging as a frozen snapshot.
- Search covers selected hero prose only → label the search as group search and test that member-only matches do not leak into results.
- URLs and totals can become outdated as eligibility changes → resolve out-of-range pages from current totals; keep read failures distinct from valid empty results.
- Existing query helpers serve both list and detail → separate list filters and test that details still reject them.
- Historical Bun production-build limitation → run the documented current checks and record actual outcomes; previous failures are not evidence for this change.

## Migration Plan

No database migration or data backfill. First add compatible list-query support, then the catalogue route and reusable presentation, then homepage category/showcase wiring. Read installed Next.js guides required by `apps/web/AGENTS.md` before implementation. Update `Plan.md`, `README.md`, `docs/frontend.md`, `docs/catalog.md` and `docs/validation.md` during implementation to distinguish catalogue URL state from homepage local course-search state. Run focused core/web tests, API tests including isolated database acceptance when available, root lint/typecheck, web production build and API build. Record unavailable checks explicitly. Rollback restores the earlier web wiring and removes additive list filters without touching retained data or judgments.
