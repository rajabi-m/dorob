# Design

## Context

See `proposal.md` for the motivation and the three delta specs for behavior. This crosses the browser-safe core, API query boundary, web proxy and public UI, so a design is required.

Observed implementation:

- `apps/web/src/app/page.tsx` requests default course pages (18 items), three judged groups and the real featured Python group. `Homepage` holds course search/free-only state and passes it into `PublicCourseSection`.
- `PublicCourseSection` owns browser requests, paging, retry and selection for `PublicCourseDialog`. `PublicCourseCard` already supplies compact instructors, current price/provenance and details actions. These remain the presentation source.
- `/groups` already server-renders catalogue requests with URL-backed state, safe invalid states, out-of-range redirects, chips, sidebar and mobile modal. Its shell marks groups active unconditionally; its course navigation and no-groups fallback point at `/#courses`.
- `CourseQuery`, `parseCourseQuery` and query serialization currently support q/category/freeOnly/limit/offset. Both direct and same-origin boundaries validate inputs. `createPublicCourseRepository` reads presentation-ready current observations and filters projected courses before slicing. Level is raw provider text; content minutes and price summary are already public.
- `Plan.md` and current homepage code establish a real-group hero, despite stale sample-hero wording in the main homepage spec. The delta reconciles that preservation clause with existing behavior; it does not redesign the hero.
- The active scraper extraction change does not refresh retained data. This feature must work with currently retained nullable facts, independently of that change.

## Goals / Non-Goals

**Goals:** Keep one catalogue query meaning from URL through public API, isolate the bounded homepage shelf from catalogue state, and reuse real cards/details and established design tokens.

**Non-Goals:** No data model changes, catalogue writes, new ranking system, inferred levels/categories, arbitrary numeric price filters, live facet-count service, new details route or unrelated cleanup of legacy fixture paths.

## Decisions

### 1. Separate the homepage shelf from catalogue browsing

Request courses with limit 3 and offset 0, without filtering. Use a small shelf component that owns only same-query retry/refresh; remove public-homepage course query/free-only/paging wiring. Keep `#courses` as the shelf anchor for existing inbound links. A factual heading such as «تازه‌های فهرست دوره‌ها» refers to catalogue acceptance, not course release or popularity. Do not show the global total on the shelf. Preserve the real-group hero, category presentation and existing three-group showcase order.

Homepage header search becomes group navigation using the existing group URL builder/normalization, with an accessible group-search label and a 200-character input bound. Empty normalized input opens `/groups`. Native form semantics should remain useful without client interception. This avoids an ambiguous search that targets a secondary shelf; a combined group/course search is outside scope.

### 2. Follow the existing server-rendered catalogue pattern

Introduce `apps/web/src/app/courses/page.tsx`, loading UI, course catalogue component and a browser-safe URL-state helper analogous to the group catalogue. Use 18 items per page and public API acceptance-time/ID ordering. Parse committed URL state on the server, fetch once for that state and resolve representable positive out-of-range pages to the last page. Invalid conditions produce a separate safe state; unrelated URL fields are ignored, including category and level, and never forwarded.

The public URL recognizes q/provider/priceStatus/duration/page only. It omits empty search, unrestricted filters and page 1. Search submits; each filter changes immediately, retaining submitted search and other filters while returning to page 1. Chips use the same URL builder. Back/Forward and refresh restore committed state. Use router transitions and server results instead of a second independent client result store; pending presentation must identify in-flight navigation and must not present old results as satisfying new controls.

Client-side filtering of loaded cards was rejected because it cannot produce catalogue-wide matches/counts. Fetching the entire catalogue in the browser was rejected because it duplicates eligibility/filter logic and bypasses bounded paging.

### 3. Define bounded filters on already-public facts

Initial choices are planning defaults from the exploration:

| Control | URL/API value | Meaning |
| --- | --- | --- |
| Provider | provider | One of the five existing provider IDs; omitted means all |
| Pricing | priceStatus | free, paid, subscription or unknown; omitted means all |
| Content duration | duration=under-3h | contentMinutes < 180 |
| Content duration | duration=3-to-10h | 180 <= contentMinutes < 600 |
| Content duration | duration=10h-plus | contentMinutes >= 600 |

Filter duration before card rounding, so 179.5 minutes remains in under-3h even if its display rounds to three hours. Null duration matches only unrestricted browsing. Price status matches the existing selected summary, not any detail offer; this keeps filtering consistent with what the card displays. Paid includes a paid starting-price summary, subscription stays separate, and unknown never becomes zero/free. No amount comparisons mix subscriptions with one-time purchases.

Use existing provider identities and labels through a narrowly shared browser-safe definition, with query validation and UI choices consuming the same allowlist. Avoid introducing a second provider-name source or a general facet API. Static choices remain selectable even when a provider currently has zero eligible matches; the honest zero-result state handles that. Level normalization, category assignment and rating reliability are separate concerns.

### 4. Extend the existing public query without breaking clients

Add optional provider/priceStatus/duration fields to `CourseQuery`, core parsing, web serialization, API route schemas/OpenAPI and repository predicates. Keep q/category/freeOnly and defaults intact. Preserve API rejection of unknown/repeated fields. freeOnly=true remains compatible with absent/free priceStatus and returns 422 with any other status. freeOnly=false adds no constraint. Existing category semantics remain an API compatibility behavior, not a course-page control.

Filter all new conditions in the existing repository path before computing totals and slicing. The current implementation already performs bounded-concurrency image availability checks over current ready observations; this change does not replace that eligibility model or introduce an index/search service. Reuse the projection's existing normalized text search. Never derive filter meanings from fixtures or management-only evidence.

Thread conditions through `courseQueryString`, `createCourseClient`, `courseListHandler` and browser client behavior while preserving response validation, finite deadlines, same-origin access and server-only API configuration. No response-shape change is required.

### 5. Reuse presentation with a small shared shell boundary

Reuse `PublicCourseCard` on shelf and catalogue. The owner follow-up replaces the early-stage dialog with native links from the title and «مشاهده دوره» to the exact retained source URL, opening a new tab with noopener/noreferrer and an accessible new-window notice. Remove the retired `PublicCourseDialog` and selection wiring; do not fetch course details on activation. Preserve card price provenance and scoped catalogue retry. Their metadata continues to show content duration only. Do not move sample details into public data paths.

Generalize only the existing catalogue shell's active destination/nav labels for reuse by the new catalogue, or extract that small shell while retaining its current style. Add links to `/groups` and `/courses` with correct current-page state on both catalogues and the homepage; label the latter «همه دوره‌ها». Update the no-eligible-groups fallback copy/link to `/courses`. Explicitly entering another catalogue starts with no inherited search/category/filter parameters. Preserve group catalogue category/search semantics and group detail/judgment order.

Use the current sidebar/card-grid layout and semantic tokens, with provider/pricing/duration sections on the RTL inline-start side. Mobile uses the existing modal visual language, labelled «فیلتر دوره‌ها». Keyboard containment must include the actual input/select/radio/link controls rather than copying the group modal's button/link-only selector. Close/Escape restores trigger focus; changing a committed filter closes the panel. Use Persian digits, logical CSS, mixed-text isolation and meaningful live result/loading status. Show loading, no courses, no matches, invalid conditions and list failure separately. No unavailable data becomes a product-process label. Showcase any new reusable controls in `/design-system` with isolated fixtures.

## Risks / Trade-offs

- Current list reads inspect image readiness across the catalogue on every request -> preserve existing bounded concurrency and validate representative filter requests; optimize separately if observed latency requires it.
- Duration/provider completeness varies -> keep unrestricted discovery inclusive and explicitly document unknown handling; no source refresh is required or implied.
- A summary selects only one of several offers -> match the displayed summary and keep all detail offers accessible rather than silently changing pricing projection.
- Shared shell changes can regress `/groups` -> cover active navigation, category URLs, no-groups fallback and unchanged category filtering in regression checks.
- Main homepage spec contains stale hero fixture claims -> narrowly update the preservation block to the already-shipped real hero, retaining design-system fixture isolation.
- Existing environment has a documented frontend production-build limitation -> attempt the documented build and record actual failures without treating a skipped/failed build as passed or broadening scope into tooling repairs.

## Migration Plan

Implement additive core/API/proxy support before wiring the new route and homepage. No database migration, ingestion, publication or inference. Existing API callers and `/#courses` links remain valid. Roll back by reverting the frontend and additive query changes together; retained observations and group judgments are unchanged. During implementation update `Plan.md`, `README.md`, `docs/frontend.md`, `docs/catalog.md` and `docs/validation.md` with actual behavior, checks and limits. Commit/push remain separate user-authorized actions.

Owner follow-up: provider pages own individual course details. Public course detail APIs remain compatible, while the public frontend no longer opens the retired modal. Independent fixture previews remain isolated.
