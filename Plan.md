# Dorob — Project Plan

Created: September 30, 2026

October 22, 2026 — The standalone [AI group reviewer](docs/ai-group-reviewer.md)
guide delegates review of the top n pending/current discovered collections in a
selected saved run. It covers evidence-supported group definitions, outlier
rejection/removal, explicit draft promotion/delivery and retained-member approval,
with version checks, recovery and readback. New groups remain unpublished;
original discovered membership and scores stay frozen. This documentation adds
no executable agent, API, inference, collection or working-catalog mutation.
Contract review and non-mutating walkthroughs are recorded in the change's
implementation notes; no live editorial quality acceptance is claimed.
All 11 tasks are complete and strict validation passed. The documentation-only
change was [archived](openspec/changes/archive/2026-10-22-add-ai-group-reviewer-guide/)
on October 22, 2026; no delta specs required syncing.

October 18, 2026 — The Python group mock now demonstrates a fixed four-tag
registry: project-based, practice-based, popular and expensive. Popular uses a rose
heart; expensive uses an amber wallet. Assignments are presentation fixtures,
without automatic eligibility or pricing/popularity calculations.

October 18, 2026 — Owner-approved Python group page refinement: compact course
metadata and offers, full-width balanced strengths/weaknesses, final-product copy,
and a five-second slideshow with overlaid dots and hover/focus navigation.
The intro action, redundant notices/labels, and expandable syllabus are removed.
The eight saved courses, prices and fixed editorial ordering remain fixtures;
AI-facing copy does not introduce live analysis or value-for-price computation.
Contributor rules now require final-product UI copy and course-focused drawbacks.
See [frontend behavior](docs/frontend.md) and [validation](docs/validation.md).

October 17, 2026 — `add-discovered-group-review` implements the Persian
`/admin/discoveries` review desk for saved runs, with retained/suppressed queues,
current course inspection, frozen evidence and versioned editorial decisions.
Candidate approval, empty unpublished draft creation, explicit suggestion delivery,
membership approval and publication remain separate steps. Read-only promotion
lookup recovers the original draft and cumulative delivery counts without a
migration. Uncertain promotion stores its exact request/payload in browser session
storage and allows identical replay only. The browser does not start inference,
invent group titles or alter the existing course-to-group inbox. New shared
components are showcased with isolated samples. The extension adds run-wide sorting
by experimental mean similarity or course count before pagination, preserving URL
state and stable ties without migration or inference. All 23 implementation tasks and
isolated integration acceptance are complete; exact checks are recorded in
`docs/validation.md`. On October 18, 2026, its ten added requirements were
synced to the two existing main specs and the change was
[archived](openspec/changes/archive/2026-10-18-add-discovered-group-review/).
All 16 main specs and the change passed strict validation.
Trusted loopback-only administration and the existing production-build limitation
remain; storage availability is required for safe new browser promotion.

Current checks and build limitations are maintained in [validation](docs/validation.md).

Status: Phase 1 — Design system is complete and accepted by the owner. The approved direction is سنجش with the لاجورد palette, locally bundled Vazirmatn, and the supplied ring-and-cap logo. Phase 2 is complete for now by owner decision on October 4, 2026, covering the snapshot-backed homepage, group destinations, and selected Python topic prototype. Remaining frontend work is recorded as follow-up scope. Phase 3 has begun with the owner-selected local backend foundation; the homepage course section is connected to the local public catalog. Homepage group cards and group destinations now use retained comparison editions and their evaluated provider facts; other integrations remain deferred.

October 20, 2026 — `add-course-group-catalog` adds `/groups` with server-rendered
judged groups, normalized text search, a single category filter and twelve results
per page. `q`, `category` and one-based `page` survive refresh and browser history;
chips, clear-all, safe invalid-selection recovery and a mobile category modal use
the shared design system. Homepage categories link to the filtered catalogue;
the homepage group section requests only three groups and links to all groups.
Homepage individual-course search/free controls remain separate. No provider,
price, level or sort filters, migration, publication or new inference are added.
Validation and production-build limitations are recorded in `docs/validation.md`.
On October 21, 2026, all 20 tasks were verified complete, the four delta
capabilities were synced to main specs, and the change was
[archived](openspec/changes/archive/2026-10-21-add-course-group-catalog/).
At archive time, the hero retained its original saved samples by owner decision.

October 21, 2026 — The owner subsequently restored the real-group hero shelf.
The homepage selects `python-starting-programming` from the read-only public
judgment API, displays its first three courses in judgment order, and links each
to its comparison row. Featured groups must contain at least three ready courses;
missing/ineligible groups show an honest unavailable state, not saved samples.
Prices, provider logos, durations and source dates use current retained facts.
The five-provider desktop strip is preserved; mobile uses the provider wheel described below.

October 21, 2026 — Frontend detail refinements add shared Persian breadcrumbs
with catalogue/category parent links, five provider identities, and a mobile
vertical logo/name wheel with reduced-motion handling. The hero action jumps to
homepage `#groups` through a native anchor; provider animations have no pause
button or hover pause. The restored real-group shelf described above supersedes the earlier static
«پایتون مقدماتی» samples and is included in this checkpoint. `/design-system` remains the maintained component reference;
frontend cleanup is implemented by the October 21 refactor recorded below.

October 21, 2026 — `add-course-catalog-page` moves full individual-course browsing
onto `/courses` with normalized search, provider, pricing-status and exact content-
duration filters, eighteen results per page and URL-backed controls/paging.
No category/level filters, ranking, migrations or source refresh are introduced.
Homepage search now targets `/groups`, while `#courses` is a three-course shelf
with an all-courses link and direct provider course links. Both catalogues expose direct navigation;
the group catalogue's course fallback opens `/courses`. The real-group hero and
category/group presentation remain unchanged. See `docs/frontend.md` for behavior
and `docs/validation.md` for verification and environment limits.

October 21, 2026 — `add-course-catalog-page` is archived with all 20 tasks
complete, including direct provider links and the owner-reviewed catalogue polish.
Its three capability deltas are synced to main specs; all 20 main specs pass
strict validation. The compact result count remains visible, duplicate course
heading stays hidden, and both catalogue searches use explicit RTL direction.
The existing Bun production-build limitation remains documented in
`docs/validation.md`. No commit or push is included in archival.

October 21, 2026 — Owner-authorized commit review confirms the completed course
catalogue scope and documentation. Final checks pass for workspace lint/types,
83 isolated core/web tests, focused database-backed course API tests, API build,
RTL audit and all 20 main specs. Frontend compilation/types pass; production
page-data collection remains blocked by the known Bun CommonJS-wrapper error.

October 21, 2026 — `refactor-frontend-components` extracts maintained frontend
primitives and transport mechanics, removes unreachable prototype branches/assets,
and separates shared product styles from reference layout. The apply-time
six-course horizontal shelf and existing product edits are preserved; no backend
contracts, mutations, deployment, commit or archival are included. Shared reference
examples remain independent. See [ownership/removals](docs/frontend-refactor.md)
and [validation](docs/validation.md#frontend-refactor--october-21-2026).


October 22, 2026 — `refactor-frontend-components` is [archived](openspec/changes/archive/2026-10-22-refactor-frontend-components/) with all 17 tasks and planning artifacts complete. Its homepage-preservation delta is synced to the main spec; all 20 main specs pass strict validation. The category artwork, business-chart arrow and hero logo-framing follow-up fixes are included in the documented implementation. The existing Bun production-build limitation remains. Archival includes no commit, push or working-catalogue operation.

October 22, 2026 — Owner-authorized frontend commit review includes the archived refactor, preserved shelf/category/favicon refinements, illustration/logo fixes and removal of the visible redundant group-catalogue results heading. The accessible section label and paging focus target remain. Workspace lint/types, 89 tests in 23 isolated suites, RTL audit, strict main-spec validation and browser review pass; production compilation/types retain the documented Bun page-data blocker. Unrelated scraper, curation and active OpenSpec work are excluded.

October 22, 2026 — `unify-public-catalog-controls` implements shared public
catalogue layout, count/filter toolbar and component-owned responsive styles.
Both pages use common transition navigation and pagination focus/scroll behavior,
retain committed cards while pending, and preserve their existing domain filters,
URLs, cards and page sizes. Independent design-system examples and shared
interaction tests are added. All ten implementation tasks are verified; see
`docs/frontend.md` for behavior and `docs/validation.md` for acceptance evidence.
Workspace lint/types, 98 tests and RTL checks pass; the known Bun production
page-data collection blocker remains.
No commit, branch or archival is included.

October 22, 2026 — `unify-public-catalog-controls` is [archived](openspec/changes/archive/2026-10-22-unify-public-catalog-controls/)
with all four artifacts and ten implementation tasks complete. Its five added
requirements are synced to the new `public-catalog-controls` main specification;
all 21 main specs pass strict validation. The documented Bun production page-data
blocker remains. No commit, push or branch is included in sync or archival.

October 22, 2026 — Owner-authorized commit review covers only the unified public
catalogue components, shared styles/interactions, reference examples, tests,
frontend documentation and archived/synced OpenSpec artifacts. README now records
the shared ownership and completed change. Unrelated scraper edits, curation
notes and other active OpenSpec changes are excluded. The existing production
build limitation remains recorded in `docs/validation.md`.

October 22, 2026 — `retain-published-group-comparisons` separates working-group
freshness from public comparison editions. Additions and source/reference/definition
refreshes preserve the selected judgment with its exact evaluated immutable course
snapshots, category, prices, images, dates, counts and order. Approved additions
wait for a complete ready replacement; list/detail/homepage surfaces switch together.
Existing current-only wording above describes the superseded behavior. Unpublishing
and assessed-member withdrawal still hide an edition; selected asset loss cannot
borrow facts or trigger historical fallback. Authoring revision checks and private
`isCurrent` remain strict. No migration, source collection, inference, manual edition
publication or duplicate course-data store is introduced. Verification is recorded
in `docs/validation.md`; individual-course APIs continue exposing latest observations.

## Product vision

October 12, 2026 — `migrate-remaining-providers-v3` implementation and acceptance are complete. TopLearn, Sabzlearn and Roocket collect native v3 observations through the controlled shared base and explicitly invoked ingestion CLI, with persisted feedback bounds and immutable recovery. Real paid/free ingestion, hosted WebP images, public identity, replay and desktop/mobile keyboard checks passed for each provider. The standalone dashboard and aggregation CLI are retired; the owner approved retaining the pure aggregation helper for the unchanged Maktabkhooneh test. Protected Maktabkhooneh files and existing local outputs remain unchanged. Frontend changes add authentic Sabzlearn/Roocket logos and the owner-requested nearest-whole-minute duration display in cards/details, preserving source precision. Source limitations and the existing Bun web build error remain recorded in [validation](docs/validation.md). Both behavior contracts are synced to main specs and strictly validated; the change is [archived](openspec/changes/archive/2026-10-12-migrate-remaining-providers-v3/). No scheduled collection is included.

Restart checkpoint — October 9, 2026: `backend-restart` begins at frontend completion commit `22931f2`, before the earlier backend handoff and implementation. The previous backend remains on `main` at `a95f83f`; the owner found that its milestone-based implementation did not fit the product and requested a restart. [Lessons from the previous backend](old-backend.md) preserves useful product decisions, evidence rules, reliability patterns and validation limits. The phase 3 roadmap below is historical planning to revisit through small OpenSpec changes; it does not mandate rebuilding the old pipeline. OpenSpec CLI 1.14.1 is installed globally and initialized at the repository root for Codex, with the `spec-driven` schema and project-local skills. The `introduce-backend-project` OpenSpec change introduces an independent Bun 1.3.8 / TypeScript / Elysia API and local PostgreSQL foundation; all 12 tasks are complete, its behavior contracts are synced to main specs, and the change is archived under `openspec/changes/archive/2026-10-09-introduce-backend-project/`. See [OpenSpec workflow](README.md#openspec-workflow) for invocation.

Dorob is a Persian course discovery and comparison product for anyone learning a new skill. It gathers courses from Iranian education providers and organizes comparable courses into shared topic and level groups.

The experience takes inspiration from Torob: search for something to learn, browse a relevant group, compare available courses, and visit the provider to enroll. Dorob should have a modern, polished identity of its own.

Examples:

- Beginner Python courses appear together, with intermediate and advanced courses distinguished.
- n8n courses share a topic destination, with level and scope differences visible.
- Courses from different providers remain distinct offerings; shared topics do not imply identical content.

Groups are defined and assigned manually by the editor. Fixed categories are owned by the shared code registry; AI comparison remains independently deferred. Dorob is not a personal learning agent.

## Confirmed decisions

The Persian project name is «دورُب», combining «دوره» and «ترب».

| Area | Decision |
| --- | --- |
| Audience | Anyone learning a new skill |
| Language | Persian only, with RTL layouts for the initial release |
| Frontend | Next.js |
| Visual style | Modern and polished, with recognizable inspiration from Torob |
| Brand | A different primary color from Torob; explore an original mark with a graduation cap and a familiar visual feel |
| Design-system deliverable | A working webpage showcasing components in code |
| Course coverage | Both free and paid courses |
| First provider | Maktabkhooneh; additional Iranian providers to be selected |
| Backend | JavaScript ecosystem, colocated with the frontend and able to share core code |
| Phase order | Design system → frontend with mock data → backend and integration |
| Grouping | Editor-defined groups and explicit many-to-many course assignments; fixed six-category registry |
| AI scope | Factual comparison remains deferred, without a personal agent |

## Proposed technical defaults

These defaults make the implementation plan concrete. They are proposals, not additional confirmed requirements. Select package versions when implementation begins.

- Use TypeScript across frontend, backend, and shared packages. It runs in the JavaScript ecosystem and supports shared typed contracts.
- Use Next.js App Router for the web application and Tailwind CSS for styling, with semantic CSS custom properties as the source of design tokens.
- Use a Bun workspace so the web app, Bun API, ingestion worker, and shared packages live in one repository. Bun replaces the originally proposed pnpm default for the initial implementation because it is available locally and the machine's Homebrew Node binary cannot start. The backend remains in the JavaScript/TypeScript ecosystem; the bootstrap uses Bun 1.3.8.
- Build the design-system showcase at `/design-system` in the web app. A separate Storybook setup is not required initially.
- Keep reusable UI in `packages/ui` and public domain types and validation schemas in `packages/core`.
- The bootstrap selects Elysia and native Bun SQL with PostgreSQL 17. Background-job tools, hosting, and AI provider remain undecided.
- Start with a light theme. Use semantic tokens so another theme can be added later without redesigning components.

Proposed eventual structure:

```text
apps/
  web/                 Next.js frontend and component showcase
  api/                 Bun/Elysia backend, introduced in phase 3
  worker/              Provider ingestion and AI jobs, introduced in phase 3
packages/
  ui/                  Design tokens and reusable components
  core/                Shared domain types and validation schemas
Plan.md
```

Create only the packages needed by the active phase. Shared browser-safe code must not expose provider credentials, scraping logic, or server-only dependencies.

## Phase 1 — Design system

Status: Complete — accepted by the owner on September 30, 2026. The working showcase uses سنجش / لاجورد / the supplied logo, with interactive core and discovery components reviewed on desktop and mobile. The exploration showcase is preserved in commit `f56b49f`. Remaining validation and component-library work are recorded below as follow-up work.

### Objective

Establish Dorob's visual identity and build an interactive RTL component showcase before developing product pages.

### Step 1: Brand and foundations

- Explore an original Dorob logo using a graduation-cap motif and visual inspiration from Torob, without copying its exact mark.
- Explore a deep teal primary palette as an initial direction; review the color and logo before treating them as final.
- Choose a Persian-capable font; Vazirmatn is an initial candidate, subject to font and license review.
- Define semantic color tokens for surfaces, text, borders, actions, and feedback.
- Define typography, spacing, radii, shadows, container sizes, breakpoints, motion, and layering tokens.
- Establish Persian numeral, price, date, and text-formatting conventions. Confirm toman presentation before finalizing price components.
- Apply Persian language and RTL direction at the document level; handle mixed Persian and Latin strings, URLs, and names such as Python and n8n.
- Design responsive behavior for mobile, tablet, and desktop.

### Step 2: Core components

- Buttons, links, icon buttons, badges, and chips.
- Text inputs, search fields, selects, checkboxes, radios, and switches.
- Cards, tabs, accordions, tooltips, dialogs, and drawers.
- Pagination, breadcrumbs, notices, and loading skeletons.
- Empty, error, disabled, hover, focus, loading, and selected states where applicable.

### Step 3: Course discovery components

- Search bar and search suggestions.
- Topic or course-group card and individual provider course card.
- Provider identity, course level, duration, and format indicators.
- Price display covering free, paid, discounted, and unavailable prices.
- Filter controls, active-filter chips, and sort controls.
- Comparison rows and tables, with a usable mobile layout.
- Source attribution, last-updated metadata, and labels distinguishing AI summaries from provider facts.

### Step 4: Showcase and review

- Build `/design-system` with sections for foundations, core components, and course-specific components.
- Include realistic Persian sample content and mixed-direction examples.
- Demonstrate component variants and interactive states, including opening dialogs, changing tabs, and toggling filters.
- Document component usage and token names alongside examples.
- Check keyboard navigation, visible focus, contrast, accessible labels, reduced-motion behavior, and responsive layouts.

### Completion criteria

- The showcase runs locally and presents the implemented tokens and components in Persian RTL.
- Components share consistent foundations and work at mobile and desktop widths.
- Interactive examples and their relevant states are usable.
- Logo, primary palette, typography, and component direction have been reviewed with the product owner before phase 2 begins.
- No scraping, production backend, or live AI integration is needed in this phase.

## Phase 2 — Frontend with mock data

Status: Complete for now — closed by the owner on October 4, 2026. The delivered milestone includes the snapshot-backed homepage, reusable course/category/group cards, group destinations, and the selected eight-course Python prototype. The proposed minimum scope and completion criteria below remain the original roadmap; dedicated results/detail/comparison routes and comprehensive accessibility coverage were not completed and are carried forward, rather than prerequisites for this owner-accepted closure.

### Objective

Build a fully navigable product experience using the approved design system and mock data only.

### Proposed minimum scope

The feature list is provisional because the initial release scope is not yet confirmed. Review it at the start of this phase.

1. Home page with prominent search and topic discovery.
2. Search results with topic or level grouping, filters, and sorting.
3. Topic/group page listing comparable courses, such as beginner Python courses.
4. Course detail view with provider information, syllabus, price, duration, level, and an outbound provider link.
5. Comparison view showing meaningful differences across selected courses, with illustrative AI summaries clearly treated as mock content.

Suggested first filters are provider, free/paid, price, and level. Add others only when the sample data and product review justify them.

### Implementation approach

- Owner-requested one-time provider snapshot: `apps/web/src/data/provider-courses.json` holds six real course samples each from Maktabkhooneh, TopLearn, and Quera, collected October 1, 2026 for phase 2 mock use. Includes source/cover URLs, available metadata, dated toman prices, and labeled AI-derived paraphrases. The homepage uses all 18 snapshots for individual cards, search/filtering, and details; group pages use editorial subsets of the same snapshots (at least two courses per group), except the Python prototype which includes two additional legacy-export offerings; the design-system showcase retains fictional fixtures. No production ingestion or live integration is added. Field conventions and limitations are in [snapshot provenance](docs/provider-snapshots.md).
- Define shared domain models for providers, topics, groups, courses, offers, syllabus sections, and comparison results.
- Put mock access behind a data-service boundary so phase 3 can replace it with API requests.
- Include realistic fixtures for free courses, discounts, missing information, long Persian titles, mixed-direction text, and multiple providers.
- Implement search, filtering, sorting, course selection, navigation, and URL state against mock data.
- Include loading, empty, and error states even before a backend exists.
- Present unavailable information explicitly rather than inventing values.
- Include responsive layouts, semantic page structure, and initial page metadata.

### Deferred unless explicitly selected

- User accounts and authentication.
- Saved courses and favorites.
- Price alerts and notification delivery.
- User-written reviews and ratings.
- Subscriptions and complex access-plan comparisons.
- Personalized learning recommendations or agents.
- Enrollment, payments, and course hosting within Dorob.

### Completion criteria

- A visitor can search, browse a course group, inspect a course, compare options, and follow a provider link using mock data.
- The agreed product pages work on mobile and desktop in Persian RTL.
- The agreed scope has been reviewed and frontend contracts are ready for backend integration.
- Automated checks cover the important interactions, alongside accessibility and responsive review.
- No live scraping, real accounts, or live AI requests are required.

## Phase 3 — Backend, ingestion, AI, and integration

Status: Local bootstrap implemented and all 12 tracked tasks verified through `introduce-backend-project`. `apps/api` supplies the Persian hello-world, process liveness, bounded real database readiness, locally served Swagger, validated environment configuration, and bounded shutdown. Root Compose supplies persistent loopback-only PostgreSQL; native Bun SQL uses a five-connection pool and server-side query timeout. The `add-curated-course-groups` change adds fixed shared categories, explicit SQL migrations, minimal provider-course references, and editorial management/public group APIs. Public eligibility requires publication and at least two members. The `add-course-ingestion-history` change adds v3 observation ingestion/history, explicit thumbnail URL/upload processing and local WebP hosting. Source facts remain separate from editorial references and operational image state. Standard HTTPS retains TLS verification and DNS/redirect preflight; the owner temporarily accepts SSRF/DNS rebinding risk without IP pinning for internal-crawler URLs. TODO: restore verified pinning later. No ORM, automatic provider pipeline, AI or deployment is included. Homepage course API integration is implemented by `connect-homepage-courses`. Check results and any unfinished verification are recorded in [validation](docs/validation.md).

### Objective

Replace mock data with traceable provider data and connect the existing frontend to a JavaScript/TypeScript backend.

### Step 1: Architecture and contracts

- Confirm API framework, database, hosting location, AI provider, and operational budget.
- Implement the shared contracts established during phase 2 and validate API boundaries.
- Model providers, source courses, topics, level groups, offers, syllabus content, source timestamps, and derived comparisons.
- Separate source facts from normalized values and AI-generated output.

### Step 2: First provider ingestion

- Start with Maktabkhooneh; review its access rules and available feeds or APIs before selecting the collection method.
- Implement a provider adapter that extracts available course metadata, syllabus, price, and source URL.
- Normalize Persian text, currencies, free-course status, and available level and duration information.
- Preserve original price units and distinguish free, missing, and subscription-based prices.
- Use stable source identifiers and idempotent ingestion to avoid duplicate courses.
- Add bounded request rates, retries, failure reporting, and a configurable refresh schedule.
- Retain source and collection timestamps so stale information can be identified in the UI.

### Step 3: Manual grouping and independently deferred AI comparison

- Use the six fixed code-owned categories and editor-defined topic groups with optional target levels, including beginner Python.
- Register minimal course references and assign them explicitly to editor-defined groups; no automated placement or AI grouping.
- Keep topic membership distinct from an equivalence claim: two Python courses may cover different levels or outcomes.
- Generate structured comparisons grounded in collected syllabi and metadata.
- Keep prices and other factual fields tied to source data rather than AI guesses.
- If AI comparison is later selected, track model/prompt versions and source inputs so comparisons can be refreshed and audited.
- Preserve editorial control over group scope, membership, and publication.
- Review manually curated groups; evaluate any future comparison work independently before expanding coverage.

### Step 4: API and frontend integration

- Implement search, group browsing, course details, filters, sorting, pagination, and comparison endpoints for the agreed scope.
- Replace the mock data service with API-backed access.
- Show source links, freshness indicators, missing data, and partial-failure states.
- Cache expensive comparisons and regenerate them when relevant source content changes.
- Keep ingestion and AI jobs outside the user request path.
- Add health monitoring and error reporting, and verify critical flows end to end.

### Step 5: Expansion and release

- Add a second provider to validate cross-provider grouping and comparison before calling the core comparison experience complete.
- Add further providers through the same adapter contract.
- Verify real-data quality, accessibility, mobile usability, search behavior, and operating costs.
- Document local development, deployment, refresh jobs, and recovery procedures.

### Completion criteria

- Live course information from at least two providers is searchable and comparable through the frontend.
- Free and paid courses are represented correctly, including explicit missing-data states.
- Editorial groups pass owner review; any separately selected AI comparisons pass evaluation on a representative set.
- Source attribution, refresh jobs, error reporting, and correction paths work.
- The agreed discovery-to-provider journey passes end-to-end validation.

## Decisions to revisit

| Decision | When to resolve |
| --- | --- |
| Brand color, logo, and Persian font | Resolved in phase 1: لاجورد, supplied ring-and-cap mark, and Vazirmatn |
| TypeScript, styling tools, and workspace defaults | Phase 1 setup |
| Toman and Persian numeral presentation | Phase 1 price and text components |
| Exact initial pages and filters | Start of phase 2 |
| Accounts, favorites, alerts, and reviews | Future scope review; not assumed for the initial release |
| Providers after Maktabkhooneh | Before additional phase 3 adapters |
| Subscription and access-plan treatment | Phase 3 source-data review |
| API framework, database, hosting, and budget | Start of phase 3 |
| AI provider, evaluation criteria, and review workflow | Before live AI integration |

## Next steps and remaining work

- October 12 initial course-group curation: all 1,495 existing references/current
  observations were inventoried after a complete database backup was created and
  restore-tested in isolation. Seven draft groups and 17 explicit memberships
  cover all six fixed categories; exact fields/members and idempotent assignment
  replay are verified. Python, visualization and n8n have cross-provider members;
  Photoshop, negotiation, A1 conversation and Excel have single-provider coverage
  gaps. See the [evidence and persistence report](docs/curation/initial-course-groups.md).
  Owner review/publication, real group frontend integration and automatic
  assignment remain separate follow-ups; drafts do not fill public category
  filters. No new collection or backend AI was added.

- Completed — Live free-course acceptance on October 10: Chrome revealed the current LPIC-1 URL is `/course/آموزش-رایگان-آزمون-lpic1-1555-mk711/`; the previously selected stale slug still returns HTTP 500. Parser 3.1.1 recognizes the provider’s `MAKTAB` free type as well as legacy `FREE`, while ambiguous zeros remain unknown. Paid Python and free LPIC-1 passed ingestion, hosted-thumbnail retrieval and duplicate-free checkpoint resume in an isolated temporary backend/database. See `docs/validation.md` for evidence.

Owner-requested October 10 dev sampling subsequently accepted ten initial courses, then 99 of 100 explicit selections: 89 new records and ten refreshes, all with verified hosted thumbnails. The known free LPIC-1 selection again returned HTTP 500 before extraction; 95 accepted courses were paid and four had unknown pricing. The dev database now contains 99 Maktabkhooneh courses and 109 retained snapshots. These bounded samples did not establish free-course acceptance; the later isolated paid/free check above resolves that gap but does not establish full-catalog validation; private reports/checkpoints stay ignored.

`redesign-scraper-pipeline` adds the explicitly invoked Maktabkhooneh v3 collector and durable local worker using existing ingestion/thumbnail APIs. Shared robots transport and abstract collection hooks support future migrations. All `scrape:*` commands remain export-only v2 through an explicit Maktabkhooneh compatibility adapter; other providers, frontend integration, AI and scheduling are deferred. Atomic private journals preserve retry identity and image-only resume, with a per-checkpoint lock and one-active-run-per-provider/backend operational limit. All 21 tracked tasks are complete under the owner-revised acceptance scope: paid-course live ingestion, hosted thumbnail and same-checkpoint resume passed; live free LPIC-1 acceptance was deferred at archival and subsequently passed after the focused bug fix above. Verification evidence and the existing frontend build limitation are in `docs/validation.md`. Both behavior contracts are synced to main specs and strictly validated; the change is [archived](openspec/changes/archive/2026-10-10-redesign-scraper-pipeline/).

Local development uses `./run.sh` to start the Compose dev database, apply migrations and launch both frontend and API watchers, with app/Swagger links and configurable ports. Shutdown preserves database data and leaves a previously running database available. The launcher supplies the server-only API origin to the homepage course integration.

- `add-course-ingestion-history` implements browser-safe v3 contracts, explicit saved-v2 conversion, additive retained snapshots, whole-snapshot current detail and local URL/upload/WebP lifecycle. The built service verifies URL/upload reuse, rich/sparse observations, changed prices/images, replay, safe partial failures and historical access after migration rerun/API restart. The owner resolved Bun 1.3.8's pinned TLS blocker by temporarily deferring IP pinning; all other checks and TLS verification remain, with SSRF/DNS rebinding risk documented and a TODO for a later fix. No automatic provider collection, AI or frontend integration is enabled. All 22 tasks are complete; both behavior contracts are synced to main specs and strictly validated, and the change is [archived](openspec/changes/archive/2026-10-10-add-course-ingestion-history/). See [validation](docs/validation.md#course-ingestion-history--october-10-2026).

- The completed `add-curated-course-groups` change is [archived](openspec/changes/archive/2026-10-10-add-curated-course-groups/), with its category and curation contracts synced to main specs. Manual catalog curation is available locally; frontend integration remains a separate next step.
- Build on the archived local API foundation by agreeing product contracts, hosting, refresh operations, and AI evaluation through further small changes. No production backend, scheduled scraping, or live AI is active.
- TopLearn, Sabzlearn and Roocket are migrated through `migrate-remaining-providers-v3`; Maktabkhooneh v2 compatibility is retained. The standalone dashboard/aggregation commands are retired, with only the pure aggregation helper retained for the protected regression test. Frontend fixtures remain separate from current scraper exports.
- Resolve the production build runtime blocker and finish screen-reader, keyboard, and mobile review. Previously reviewed layouts/interactions are recorded in the frontend documentation and history.
- Reconcile the homepage's three-course beginner Python group with the eight-course broad Python prototype, extract its page-local components when scope is agreed, and decide whether dedicated results/detail/comparison routes are needed.
- Review analyzer ranking weights, badge rules, and evidence coverage before any production assessment.

## Phase 2 closure — October 4, 2026

The owner requested committing all current work, updating and merging related documentation, creating a documentation hub, and calling this the end of stage 2 for now. This closes the accepted milestone without starting phase 3. Related frontend, snapshot, and provider-adapter documents are consolidated; [docs/index.md](docs/index.md) is the navigation hub. Dated checkpoint notes are preserved in [project history](docs/project-history.md). See [validation](docs/validation.md) for current check results and limitations.

## Homepage public catalog — October 11, 2026

All 20 tasks are complete. The change is [archived](openspec/changes/archive/2026-10-11-connect-homepage-courses/), with its homepage and public catalog contracts synced to main specs. All ten main specs pass strict validation.

`connect-homepage-courses` connects only `/`’s course results and their separate detail dialog to eligible current observations with available hosted thumbnails. Search includes title/provider/instructors; explicit free access, published editorial categories, matching totals and stable offset pagination are supported. Unassigned courses remain visible without category filters; categories can honestly be empty. Reads do not collect provider facts. Prices/source dates represent retained observations. Offsets may shift during concurrent ingestion; search currently scans the small eligible catalog in memory.

Hero samples/provider strip, topics, sample groups, all group destinations and `/design-system` retain their existing fixtures and interactions. No fixture fallback fills a failed catalog request. Independent AI, group integration, scheduling and deployment remain later scope. Browser acceptance progress and the existing production runtime limitation are recorded in [validation](docs/validation.md).

## Ingestion CLI reporting — October 11, 2026

The default `ingest:maktabkhooneh` output is a bounded human summary with progress and safe stage diagnostics on stderr. `--json` preserves the existing full machine report as one stdout document; fatal startup errors use a safe JSON error document. Retryable saved work receives a quoted resume command with its backend destination. This reporting change does not establish success for the owner's pending live run; its journal remains the source of saved progress.

All ten `improve-ingestion-cli-output` implementation tasks are verified with offline fixtures, including the 1,000-selection delivery-stop/resume case. Utility tests (112), workspace lint and type checking pass. The production build retains the documented Bun CommonJS page-data limitation. Its four CLI behavior requirements are synced to the main `scraper-worker` spec, all ten main specs pass strict OpenSpec validation, and the change is archived under `openspec/changes/archive/2026-10-11-improve-ingestion-cli-output/`. No new live catalog run was performed.

## Homepage card refinement — October 11, 2026

`refine-homepage-course-cards` implements compact source instructor summaries, scoped secondary details actions and price-associated Jalali observation-date tooltips for real homepage cards. The existing details destination and sample experiences are preserved. Automated tests, lint, types, RTL audit and strict change validation pass; production building retains the Bun CommonJS runtime blocker. All nine tasks are verified, including Chrome browser acceptance at 320px, 390px and 1280px; see [validation](docs/validation.md#homepage-card-refinement--october-11-2026). The change is [archived](openspec/changes/archive/2026-10-11-refine-homepage-course-cards/), its five requirement blocks are synced to the main homepage catalog spec, and all ten main specs pass strict validation. The owner authorized committing this change on `backend-restart`; no merge or push is requested.

The completed `curate-initial-course-groups` change is [archived](openspec/changes/archive/2026-10-16-curate-initial-course-groups/) on October 16, 2026. All 18 tasks are complete; its curation requirements are synced to main specs and all ten main specs pass strict validation. The seven groups remain drafts awaiting owner review and a separate publication instruction.

## Local group administration — October 16, 2026

`add-course-group-admin` has all 27 tracked tasks complete under the documented
local development acceptance scope and is [archived](openspec/changes/archive/2026-10-16-add-course-group-admin/).
Its three behavior contracts are synced to main specs; all 12 main specs pass strict
validation. Product owner review remains separate. It adds
`/admin/groups`, draft creation/editing, explicit
publication, searchable manual curation, retained-course inspection and a
confidence-ordered suggestion review inbox. Suggestions are immutable and attributed
to caller-supplied system names/IDs. Versioned pair decisions and atomic memberships
retain history, selected approval provenance and safe replay. Rejection persists
until explicit reopening; the owner approved this policy at implementation start.
Legacy/manual assignments have no invented confidence. Shared components also appear
in the labelled `/design-system` showcase without management writes.

The additive migration preserves existing groups, memberships, publication and
observations. Acceptance uses temporary records and does not publish the seven
existing drafts. The whole-app launcher now binds the web listener to loopback;
standalone admin startup and API examples are documented in README/catalog docs.
Authentication, AI judging (visibly disabled), public fixture-group integration and
production deployment remain deferred. Focused automated/database/browser checks
pass; the known Bun production page-data build error remains unresolved. Actual
validation and remaining limits are in [validation](docs/validation.md#course-group-administration--october-16-2026).

## Empty group drafts — October 16, 2026

At the owner's explicit request, a one-time agent-assisted pass created 12 empty
draft groups, two per fixed category, for future course suggestions. This extends
the earlier member-backed curation workflow with intentional unpublished matching
destinations. All eight existing groups, their publication flags and 17 memberships
were preserved. The local catalog now has 20 groups; the 12 new groups have no
members. A complete pre-work database snapshot passed isolated restoration with
schema and full-row fingerprint comparisons before writes. Definitions, persisted
IDs, verification and recovery instructions are in the [draft curation report](docs/curation/empty-course-group-drafts.md).
This is explicit editorial assistance, not runtime AI integration or automatic
assignment; suggestion production, membership review and publication remain separate.

## Independent embedding experiments — October 16, 2026

`add-local-embedding-suggestions` implements an independent local Bun/React
laboratory under `apps/embedding-lab`. This is phase 3 evaluation work: existing
catalog/admin/public behavior, schema and launcher remain separate. It captures
frozen facts through existing GET routes, uses verified installed local BGE-M3,
retains versioned file caches and immutable experiments, supports independent
multi-group matching and overlapping coherent discovery, and provides a Persian
RTL inspection/comparison/local-feedback/evidence workbench.

The real capture retained 1,495 courses and 19 groups, explicitly excluding the
owner's test group. Actual local vectors for a biased bounded 51-course/19-group
sample produced one matching and two discovery runs; useful candidates and clear
scope failures are preserved together. Two uncertain agent demonstration reviews
verify persistence, not owner quality approval. A separate synthetic 10,000-vector
benchmark measured capacity, without claiming real-data quality at that scale.
See [results, limitations and review walkthrough](docs/embedding-lab.md),
[commands/storage/recovery](apps/embedding-lab/README.md) and
[validation](docs/validation.md#embedding-laboratory--october-16-2026).

Owner review, calibrated quality evaluation, alternative representations/models,
generative judging/naming and scheduling remain separate work. Application
pgvector storage, score contracts and inbox submission are delivered by the
separate catalog embedding integration below; membership approval remains editorial. The lab never writes catalog records or publishes groups.
Local evidence is ignored outside Git and must be backed up separately. No commit,
branch or push is implied by completing this implementation.

## Catalog embedding integration — October 17, 2026

`integrate-catalog-embedding-workflow` is implemented and verified (24/24 tasks).
The application-owned engine, additive browser-safe contracts, pgvector persistence,
local backend APIs and finite HTTP-only CLI support explicit generation/reuse/force,
matching/discovery, persisted progress, cancellation and frozen-input recovery.
Matching feeds the unchanged suggestion ledger; reviewed discoveries can explicitly
create empty unpublished drafts plus all-member suggestions. Individual membership
approval and publication remain separate editorial decisions.

Migrations 004–006 are active. Full original-data fingerprints still match the
restore-tested backup: 1,495 courses, 20 groups, 17 memberships and the protected
group are unchanged. Real inference/review demonstrations used an isolated restored
database; the separate 10,000-course preferred-policy capacity run passed. The lab
and frontend source are unchanged. See the [workflow guide](docs/catalog-embeddings.md),
[results and limitations](docs/embedding-results.md) and [validation](docs/validation.md).
The earlier missing-clang build attempt was superseded by the pinned bundled image.
The owner authorized archival and a commit on October 17, 2026. Deployment,
automatic placement and publication remain deferred.


## Bundled pgvector migration — October 17, 2026

At the owner's explicit request, the local database now uses digest-pinned upstream
`pgvector/pgvector:0.8.7-pg17-bookworm`: PostgreSQL 17.11 with pgvector 0.8.7.
The custom-build path is retired. Complete backups passed isolated restoration,
schema comparison and all 19 user-table fingerprints before cutover. A new
`postgres_vector_data` volume holds the restored active database; the original
`dorob_postgres_data` volume remains retained. Migration 004 enables the extension;
all 18 data-table fingerprints remain unchanged and the ledger has one new entry.
The 1,495 courses, 20 groups, 17 memberships, protected test group and review history
are preserved. All 55 API tests with PostgreSQL, API lint/types/build, API reads,
vector(1024)/cosine and normal restart checks pass. No inference or publication
was introduced. See [migration, backup and recovery](docs/pgvector-migration.md).

October 17, 2026 — Both embedding changes are archived:
[`add-local-embedding-suggestions`](openspec/changes/archive/2026-10-17-add-local-embedding-suggestions/)
(20/20 tasks) and
[`integrate-catalog-embedding-workflow`](openspec/changes/archive/2026-10-17-integrate-catalog-embedding-workflow/)
(24/24 tasks). Their seven capability deltas are synced to main specs; all 16
main specs pass strict validation. This checkpoint predates the completed
`add-course-group-judgments` change below.


## Course-group judgment backend — October 18, 2026

`add-course-group-judgments` has all 20 tracked tasks complete and verified. It
implements the phase-3 backend standard for future
judges: browser-safe versioned contracts, all-member revision-bound educational
and commercial evidence, complete retained comment/review paging, and immutable
attributed submission/history. The AI owns hero text, four permitted tags,
course-focused strengths/weaknesses and exact recommendation-array order under
«اولویت با دوره‌هایی است که ارزش یادگیری بیشتر و قیمت کمتری دارند».
There is no numerical ranking, price sort or expensive-tag demotion.

An additive migration 007 retains group context, complete input manifest and
content. Repeatable-read consistency, global submission-key replay and computed
freshness preserve history without modifying provider facts, editorial membership,
suggestions, publication or public responses. The prior assessment draft's ranking,
badges and output proposals are explicitly superseded; compatible evidence/privacy
advice remains historical context. Backend acceptance is not model quality review.

The seven private management operations are documented in Swagger and the
[catalog guide](docs/catalog.md#course-group-judge-evidence-and-judgments).
Model execution, frontend rendering, judgment approval/publication, authentication
and public judgment APIs remain separate follow-ups. Working-catalog migration is
an explicit operational step, not an implementation/test side effect. Validation
results and environmental limits are recorded in [validation](docs/validation.md).

October 19, 2026 — All 14 judgment requirements are synced to the new
[main spec](openspec/specs/course-group-judgments/spec.md). All 17 main specs and
the completed change passed strict validation. The spec-driven change is
[archived](openspec/changes/archive/2026-10-19-add-course-group-judgments/) with
all artifacts and 20/20 tasks complete. Migration 007 remains an explicit
working-catalog operation; archival does not apply it or publish judgments.

The October 19 commit review retains the implemented backend-only scope and
explicit migration boundary. See the [pre-commit checks](docs/validation.md#judgment-pre-commit-verification--october-19-2026).

## Manual AI judge role guide — October 19, 2026

`add-ai-judge-guide` delivers the standalone [judge instructions](docs/ai-judge.md)
for an HTTP-capable agent. The operator supplies the trusted local API origin
and selected group; the guide covers full revision-bound evidence/feedback
traversal, qualitative value/price ordering, supported tags, natural SEO-friendly
Persian hero writing and safe immutable submission/recovery/readback.
Assessments target two or three distinct useful points when supported, without
forced criticism, padding or missing-data commentary in page text. A course may
have no weaknesses after thorough review.

This is a manually supplied Markdown role prompt, not an automatic runner or
an installed skill. The synthetic request is checked offline against the shared
validator; no working-catalog judgment submission, migration or publication is
part of this documentation change. Automated model execution, frontend hero/SEO
integration, judgment rendering/approval/public selection and authentication
remain separate follow-ups. API behavior and its main specification are unchanged.

October 19, 2026 — Owner-authorized working-database operation applied additive
migration 007 using `bun run db:migrate`. A full custom-format backup and
verification records are retained locally under the ignored
`apps/api/storage/backups/judgments-20261019/` directory. All 30 pre-existing data
table fingerprints matched before/after; the new empty judgment table, history
index and immutability trigger were verified. The judgment history API returned
successfully with zero records. No pending judge request was replayed or submitted.

The guide change is [archived](openspec/changes/archive/2026-10-19-add-ai-judge-guide/)
with all 11 tasks complete. As a documentation-only change with `skip_specs: true`,
it has no delta specs to sync; all 17 existing main specs pass strict validation.
The guide's request example passes the shared validator and all seven judge
operations match the route definitions. Link and whitespace checks pass. See
[validation and migration results](docs/validation.md#ai-judge-guide-and-local-migration--october-19-2026).


## Public judged groups — October 19, 2026

The additive `GET /api/v1/judged-groups?limit=12&offset=0` and
`GET /api/v1/judged-groups/<slug>?limit=20&offset=0` project published
groups with at least two members, a current judgment and ready current observations
for every member. Publication is the editorial gate; the newest matching judgment
is selected automatically (received time descending, ID ascending for ties).
Existing public group-reference and course APIs retain their eligibility rules.

Publish before judging. Publication, definition, membership/reference or snapshot
changes can invalidate judgments; reads never regenerate them. All courses remain
in judge order, including expensive-first choices and empty assessments. Group
publication does not certify the quality of generated prose.

List limits default to 12, detail to 20; both cap at 100. Use `judgmentId` from
detail for later course pages; 409 means restart from the unpinned first page.
Missing/ineligible unpinned detail is 404; unavailable dependencies are 503.
Public responses omit manifests, submission attribution and raw feedback.
Read-only asset checks never invalidate associations. Candidate eligibility scans
use batched source reads and at most four concurrent asset checks, before pagination;
this is designed for the local catalog rather than unbounded production scale.
No migration, startup inference or working-catalog mutation is required.

### Public group frontend integration — October 19, 2026

`connect-public-group-judgments` replaces the public fixture group cards/routes
with retained current judgments and source facts. The selected Python layout is
reusable across categories; real slugs, counts, providers, hosted galleries,
AI ordering/tags/bullets and source offers are wired without model execution.
Legacy Python/n8n links redirect; unrelated fixture destinations are retired.
Independent course discovery, hero samples and design-system fixtures remain.
Detailed verification and remaining limitations are recorded in `docs/validation.md`.

October 20, 2026 — `connect-public-group-judgments` is
[archived](openspec/changes/archive/2026-10-20-connect-public-group-judgments/)
with all planning artifacts and 21/21 tasks complete. Its ten public judged-group
requirements are synced to the new main spec, and the existing homepage
preservation requirement now covers real group navigation. All 18 main specs and
the completed change pass strict OpenSpec validation. Archival does not publish
groups, run inference or modify the working catalog.

October 20, 2026 — The owner authorized committing the public judged-group
integration and archive. README setup/status and affected documentation were
reviewed and reconciled. [Pre-commit verification](docs/validation.md#public-judged-group-pre-commit-verification--october-20-2026)
records passing checks and the unchanged Bun production-build limitation.

October 21, 2026 — Owner follow-up: public course titles and «مشاهده دوره»
open the course's retained provider page directly in a new tab. The early-stage
local details dialog has been removed from public course browsing; price-date
tooltips remain. Public course detail APIs and independent design-system fixture
previews retain their separate contracts.

October 22, 2026 — `retain-published-group-comparisons` is archived with all
13 tasks complete. Its seven modified and two added requirements are synced to
`public-group-judgments`; strict validation passes. The immutable source/edition
behavior and known Bun production-build limitation are recorded in
`docs/validation.md`. This checkpoint includes only retained comparison scope;
earlier scraper changes and other active proposals remain separate.
