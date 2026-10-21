# Frontend refactor — October 21, 2026

## Protected apply baseline

Implementation targets `refactor-frontend-components`, with no branch, stash,
commit, backend/data operation or change to the scraper work.

At apply time the working tree already modified README, the app icon, homepage
entry, category/group card styles, featured hero shelf, hero styles, public course
shelf, course catalogue UI tests and frontend notes. The public shelf CSS and
this change's planning directory were untracked. Those product changes are the
baseline, including the six-course horizontal homepage shelf (newer than the
proposal's three-course description) and simplified hero rows.

A binary diff, status, route/asset inventory, consumer scan and pre-refactor
screenshots of `/`, `/groups`, `/groups/python-starting-programming`, `/courses`
and `/design-system` are retained locally in `/tmp/dorob-refactor-baseline/`.
Public conventional route/handler entries, reference examples, tests, runtime
imports and literal asset URLs are dependency roots. Public course detail API
handlers remain in scope for preservation even without a public dialog consumer.

Baseline lint and root type checking pass. Production compilation/types succeed,
then Bun fails collecting page data with `Expected CommonJS module to have a
function wrapper`. Isolated web/core suites have one pre-existing assertion
failure: featured hero expects «اطلاعات», removed by the protected product edits.
The native deadline test initially cannot bind a loopback listener in the sandbox;
all five course transport tests pass outside that restriction.

Browser baseline confirms homepage search targets groups, six-course request,
three judged-group cards, real hero order and comparison anchors, direct provider
course links, catalogue category links and independent design-system fixtures.
Hero failure/retry and provenance behavior are also covered by existing suites.

## Shared ownership

`brand-mark.tsx` owns only the accepted ring-and-cap geometry and SVG serializer;
`brand-lockup.tsx` composes it with the existing Persian wordmark. Callers keep
link destinations, accessible labels and layout. The reference's SVG download
uses the same geometry with explicit palette colors.

`lib/provider-presentation.ts` adds asset paths to core's five provider identities;
`ProviderMark` hides unknown/failed images while callers retain provider text.
`lib/category-presentation.ts` adds artwork/icons/descriptions to core IDs/labels.
Live cards, hero and reference examples import these owners rather than showcases.

`lib/persian-format.ts` owns numbers, rounded content-minute labels and Tehran
Jalali dates. `public-price.tsx` preserves validated public free/paid/subscription/
unknown semantics across cards and comparisons. `fixture-price.tsx` retains the
separate dated fixture contract (including its discount badge and missing-price
copy); snapshot duration labels remain explicit adapters. Admin/discovery import
pure formatting, without importing public cards or request state.

`catalog-shell.tsx` owns the public catalogue frame. `catalog-controls.tsx` owns
search markup, remove chips, clear links and paging links; callers retain query
serialization, labels, counts and twelve/eighteen page sizes. The shared native
`CatalogFilterDialog` contains focus wrapping, backdrop dismissal and trigger
focus restoration. Category links and course radio fieldsets stay separate.
Navigation still closes the modal before transitions; course page changes retain
heading focus and scrolling in both directions. Catalogue UI suites pass.

`public-transport.ts` owns bounded byte reading and public JSON request mechanics;
`api-origin.ts` remains server-only. Domain clients retain validators, fixed paths,
page/identity/revision guards, byte limits and HTTP mappings. Server deadlines
remain configurable; browser public reads use five-second cancellation and a 2 MiB
bound. Group pins/conflicts remain intact. Admin imports the same unchanged byte
reader and origin validator directly; its mutation transport is not generalized.
Transport, admin UI and discovery UI/action/recovery suites pass, including exact
persisted promotion replay. No management/backend contract or request changes.

## Removal inventory

`Homepage` now requires real course/group/featured-group promises. Its unreachable
fixture search/free controls, comparison selection/tray/table, local dialog and
artwork hero are removed. `HomeHero` contains only the selected discovery layout;
unselected comparison hero and saved-course fallback are removed. Native `#groups`
anchor navigation, provider animation and real hero unavailable/retry remain.
Homepage/category/provider-navigation and bounded shelf regression checks pass.

Confirmed removals after import/route/test scan:

- Orphan `python-group-preview.tsx`, old `brand.tsx` and alternate
  `logo-prototypes.tsx`: no app/reference consumer remains. Selected logo moved.
- `public-course-section.tsx`: only its legacy tests remained; paging/filter/error
  coverage lives on current catalogue/shelf suites. Card/provenance tests now mount
  maintained cards directly and retain image failure coverage.
- `homepage-data.ts`, `compact-course-card.tsx`, `learning-paths-artwork.tsx`:
  only retired homepage branches consumed them. Current compact reference examples
  remain independent.
- Public `/api/courses/[courseId]` and thumbnail/list handlers remain.

Removed assets: Python snapshot JSON (only orphan preview consumed it) and ten
`public/logos/*.svg` exploration/duplicate assets (no code or URL consumer; selected
SVG download now uses shared geometry). Retained `provider-courses.json`, provider
logos, fixture artwork and fixture cards: maintained design-system examples still
consume them. Removed unused old homepage/comparison-hero selectors and the unused
comparison module classes `value`, `priceLabel`, `discount`, `amount`; active dynamic
classes and current responsive/provider rules remain. Public route/asset and
conventional handler scans confirm no deleted-file consumer remains.

`styles/product.css` now owns shared controls, brand, grid, price, dialog, skip and
screen-reader primitives. Product pages/admin import it directly. Reference-only
lab/demo layout remains in `design-system/preview.css`, imported after shared
styles by that route alone. The selected comparison's CSS module is now neutral
`components/group-detail.module.css`; selector specificity and media order remain.

The reference now demonstrates the shared brand/download, breadcrumbs, all five
provider marks and the native catalogue filter panel, alongside retained card,
admin and discovery examples. It renders without API access; controls keep local
state and snapshot dates. Desktop before/after reference images retain the
accepted layout; additional primitive examples are inserted below existing cards.

## Acceptance

All 20 route/width combinations were checked in the built-in browser at 1280,
659, 390 and 320 pixels, without document overflow. Intentional local shelf
scrolling remains. Native repeated-hash scrolling, keyboard-visible modal focus
return, mixed Persian/Latin searches/history and local reference panel dismissal
were exercised. Provider reduced-motion rules/handlers and hover behavior retain
the baseline. Current group order remains a domain contract, covered by retained
judgment fixtures and real comparison rendering.

The Python starter group became unavailable in the live API during acceptance
(direct read returned 404), so the homepage correctly shows its unavailable state;
responsive comparison review uses the eligible n8n group instead. No data was
modified by this task. The pre-existing hero text assertion now tests the current
simplified duration/price markup rather than the removed notice. Final checks and
known production-build limitations are recorded in [validation](validation.md#frontend-refactor--october-21-2026).

### Owner-reported artwork correction

The initial style separation missed the category SVG palette/base rules, leaving
them in reference-only CSS. `CourseArtwork` now imports its own colocated
`course-artwork.css`, so homepage, fixture card fallbacks and reference examples
always receive the same complete paint variables. Browser verification checks
actual computed fills for all six palettes, in addition to layout dimensions.
See the [correction verification](validation.md#category-artwork-correction--october-21-2026).

## Archive — October 22, 2026

The [spec-driven change](../openspec/changes/archive/2026-10-22-refactor-frontend-components/)
is archived with all 17 tasks complete. Its one modified homepage-preservation
requirement is synced to the main spec, retaining the four existing scenario
headings and adding provider-navigation/animation and public-course-navigation
coverage. Title, Purpose and unrelated requirements are unchanged. All 20 main
specs pass strict validation. No commit or push is included.

## Shared catalogue controls — October 22, 2026

`CatalogResults` owns the sidebar/results frame, accessible results heading,
count/status toolbar, mobile filter trigger and active-chip placement for both
public catalogues. `components/catalog.css` owns their shared responsive styling
and is imported by the consuming primitives, shell and dialog. Group category
links retain route-specific styling; course filters/grid retain their own styles.
Neither route imports the other route's catalogue stylesheet. The design-system
presentation section includes an API-independent layout example with success,
pending, empty and failure status choices alongside the standalone modal example.
