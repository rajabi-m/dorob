# Dorob — Project Plan

Created: September 30, 2026

Status: Project initialized with a working Persian RTL hello-world frontend. Phase 1 remains incomplete; the owner selected سنجش with the لاجورد palette and the supplied ring-and-cap logo as the direction for continued component development. Phases 2 and 3 have not started.

## Product vision

Dorob is a Persian course discovery and comparison product for anyone learning a new skill. It gathers courses from Iranian education providers and organizes comparable courses into shared topic and level groups.

The experience takes inspiration from Torob: search for something to learn, browse a relevant group, compare available courses, and visit the provider to enroll. Dorob should have a modern, polished identity of its own.

Examples:

- Beginner Python courses appear together, with intermediate and advanced courses distinguished.
- n8n courses share a topic destination, with level and scope differences visible.
- Courses from different providers remain distinct offerings; shared topics do not imply identical content.

AI supports course grouping and factual content comparison. Dorob is not a personal learning agent.

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
| AI scope | Grouping and comparison, without a personal agent |

## Proposed technical defaults

These defaults make the implementation plan concrete. They are proposals, not additional confirmed requirements. Select package versions when implementation begins.

- Use TypeScript across frontend, backend, and shared packages. It runs in the JavaScript ecosystem and supports shared typed contracts.
- Use Next.js App Router for the web application and Tailwind CSS for styling, with semantic CSS custom properties as the source of design tokens.
- Use a Bun workspace so the web app, future Node.js API, ingestion worker, and shared packages live in one repository. Bun replaces the originally proposed pnpm default for the initial implementation because it is available locally and the machine's Homebrew Node binary cannot start. The backend remains in the JavaScript/TypeScript ecosystem; its runtime decision is deferred to phase 3.
- Build the design-system showcase at `/design-system` in the web app. A separate Storybook setup is not required initially.
- Keep reusable UI in `packages/ui` and public domain types and validation schemas in `packages/core`.
- Select the Node.js API framework, database, background-job tools, and AI provider during phase 3 planning. PostgreSQL is a candidate, not a committed dependency.
- Start with a light theme. Use semantic tokens so another theme can be added later without redesigning components.

Proposed eventual structure:

```text
apps/
  web/                 Next.js frontend and component showcase
  api/                 Node.js backend, introduced in phase 3
  worker/              Provider ingestion and AI jobs, introduced in phase 3
packages/
  ui/                  Design tokens and reusable components
  core/                Shared domain types and validation schemas
Plan.md
```

Create only the packages needed by the active phase. Shared browser-safe code must not expose provider credentials, scraping logic, or server-only dependencies.

## Phase 1 — Design system

Status: Visual direction selected; component development and validation remain incomplete. The exploration showcase is preserved in commit `f56b49f`; the working page now shows only سنجش / لاجورد / the supplied logo. This selection does not complete phase 1.

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

### Step 3: Grouping and AI comparison

- Define a topic and level taxonomy, including groups such as beginner Python.
- Combine deterministic normalization with AI-assisted grouping based on available course content.
- Keep topic membership distinct from an equivalence claim: two Python courses may cover different levels or outcomes.
- Generate structured comparisons grounded in collected syllabi and metadata.
- Keep prices and other factual fields tied to source data rather than AI guesses.
- Track model/prompt versions and source inputs so comparisons can be refreshed and audited.
- Route uncertain group assignments for review and support manual corrections.
- Evaluate grouping and comparison quality against a small human-reviewed set before expanding coverage.

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
- Course grouping and AI comparisons pass review on a representative evaluation set.
- Source attribution, refresh jobs, error reporting, and correction paths work.
- The agreed discovery-to-provider journey passes end-to-end validation.

## Decisions to revisit

| Decision | When to resolve |
| --- | --- |
| Final brand color, logo, and Persian font | Phase 1 foundations |
| TypeScript, styling tools, and workspace defaults | Phase 1 setup |
| Toman and Persian numeral presentation | Phase 1 price and text components |
| Exact initial pages and filters | Start of phase 2 |
| Accounts, favorites, alerts, and reviews | Future scope review; not assumed for the initial release |
| Providers after Maktabkhooneh | Before additional phase 3 adapters |
| Subscription and access-plan treatment | Phase 3 source-data review |
| API framework, database, hosting, and budget | Start of phase 3 |
| AI provider, evaluation criteria, and review workflow | Before live AI integration |

## Immediate next step

Expand components using the selected سنجش / لاجورد / supplied-logo direction. Do not start phase 2 until the design system meets its completion criteria and is approved.

## Implementation progress — September 30, 2026

- Initialized Git and committed the project plan, `.gitignore`, and `AGENTS.md` as the initial repository setup.
- Added a commit policy requiring explicit user confirmation and documentation updates before each authorized commit.
- Scaffolded `apps/web` with Next.js App Router, React, TypeScript, Tailwind CSS, and a Bun workspace.
- Added a Persian RTL welcome page with a teal-and-ivory palette, an original vector graduation-cap mark, and responsive CSS artwork.
- Added an experimental `/design-system` page covering color tokens, locally bundled Vazirmatn typography, buttons, links, and badges. Its design direction was not approved.
- Added setup and workflow documentation in `README.md`.
- Accepted the working welcome page as the project's initial hello-world frontend, with the Persian name «دورُب» (from «دوره» and «ترب»).
- Lint and type checking pass. Both frontend routes returned HTTP 200 locally. The production build remains blocked by a Turbopack local-port permission error, including after an escalated retry; full visual and accessibility validation remains pending.
- Remaining in phase 1: redesign and approve the visual direction, expand tokens and component states, implement forms and overlays, and build the course-specific showcase.
- The user authorized committing the project initialization and these documentation updates.

## Phase 1 design exploration — September 30, 2026

- Replaced the initial design-system experiment with an interactive review lab at `/design-system`.
- Added three proposed visual directions: سنجش (compact comparison), رویش (spacious discovery), and جهش (bold graphic). Each has three palettes, for nine preview combinations.
- Each direction changes typography weights, spacing, radii, borders, and course-card treatments. All use the existing locally bundled Persian-capable Vazirmatn font.
- Added scoped semantic color and feedback tokens, responsive layouts, button and badge states, sample search, a free filter, course selection, and inline sample comparison. Fictional providers and prices are labeled.
- This is phase 1 component exploration; it does not start phase 2. No final brand, palette, or design-system approval is implied. Full component coverage and shared-package extraction remain pending selection.
- Lint, type checking, and the RTL detector pass. The local preview returns HTTP 200. Browser-based visual, mobile, and keyboard validation remains pending because no browser was available. Production build still fails on the existing Turbopack local-port permission restriction, including an escalated retry.
- Next: review the three directions and nine palettes with the owner, select a direction, and complete its reusable component system and accessibility review. No commit has been authorized for these changes.

### Logo prototype review

- Added five original vector proposals (جوانه، کتاب، هم‌سنج، مسیر، دال) with a persistent session selection across all three directions and nine palettes.
- Selected marks appear in the preview header and hero, alongside wordmark, small-size, and reversed-color specimens. SVG downloads use the selected primary color. Added standalone teal SVGs and a reusable renderer/export helper.
- No logo is approved or applied to the welcome page. Phase 1 remains active.
- Lint, type checking, and the RTL detector pass; the preview route returns HTTP 200. Production build still encounters the Turbopack local-port restriction after an escalated retry. Browser visual, keyboard, and mobile review remain pending. No commit was requested.

### Expanded logo exploration

- Added the user-supplied `logo.svg` as option six, preserving its geometry and viewBox while adapting its ring, cap, and tassel to active semantic palette colors. The source file remains untouched.
- Added four ring-and-cap alternatives: مدار (open orbit), پیوند (paired loops), درگاه (rounded portal), and شکوفه (leaf-like ring). There are exactly ten selectable logos across all nine theme combinations.
- Updated vector rendering and SVG downloads to support per-mark viewBoxes, circles, and multiple semantic colors. Your supplied mark is selected on initial load; all options follow the palette.
- Rendered and visually reviewed all ten vector marks. Lint, type checking, RTL audit, and diff whitespace checks pass; the preview route returns HTTP 200. Full browser interaction/mobile review remains pending. The production build still fails on the existing Turbopack worker-port restriction after an escalated retry.

### Authorized exploration checkpoint

- The owner selected سنجش, the لاجورد palette, and نشان شما (the supplied ring-and-cap SVG) for continued phase 1 work.
- The owner explicitly requested committing the current exploration before removing the alternative options. This checkpoint preserves all three systems, nine palettes, and ten logos.
- After this checkpoint, simplify the design-system page to the selected direction and leave that work uncommitted so more components can be added. Phase 1 remains incomplete; no phase 2 work is authorized.
- Local skill files under `.agents/` are outside this frontend checkpoint and are not staged.

### Selected showcase — component checkpoint

- Created exploration checkpoint `f56b49f` before simplifying the page, as explicitly requested.
- Removed all design, palette, and logo selectors and alternative theme styles from `/design-system`. It now always uses سنجش, لاجورد, and the supplied mark. The outer page header also uses the selected mark.
- Retained component demos, semantic swatches, typography, sample comparison, logo-size/reversed specimens, and the palette-colored SVG download. Exploration logo assets remain archived in the repository.
- Updated current documentation. These changes are included in the owner-authorized component checkpoint. Phase 1 remains incomplete; the welcome page is unchanged.

Validation for the selected showcase: lint, type checking, and RTL audit pass; the route responds with HTTP 200. Turbopack remains blocked by worker-port permissions. A Webpack fallback (`bun run --cwd apps/web build --webpack`) compiles and type-checks successfully, then fails during page-data collection with a Bun CommonJS function-wrapper error. Full browser, keyboard, and mobile review remains pending.

- Wordmark exploration: colored only the damma (ُ) in the selected showcase’s brand lockups with the لاجورد gold accent. Added a reusable inline wordmark with its complete accessible Persian name; ordinary text remains unchanged. This preview is included in the component checkpoint.

### Discovery component expansion — component checkpoint

- Added six interactive category cards and full-content-width rectangular course rows with provider, level, duration, format, sample labels, price, details, and comparison actions. Existing compact cards remain as a second variant.
- Added combined sample search/category/level/price filters, removable chips, price/duration sorting, pagination, an independent comparison tray and semantic scrollable table, and a native modal details dialog with sample syllabus.
- Added reusable price presentation (paid, discounted, free, unavailable), source/freshness notices, AI-attribution placeholder, native accordions, and selectable skeleton/empty/error states. No source facts, live provider connections, or AI output are implied.
- Preserved سنجش / لاجورد / selected ring-and-cap mark and gold wordmark accent. Responsive rules reflow course actions and allow comparison-table scrolling.
- Lint, type checking, and RTL detector pass. Route returns HTTP 200; production build remains affected by the existing worker-port restriction. Firefox Computer Use permission was unavailable, so full visual/mobile and keyboard/dialog validation remain pending.
- Phase 1 continues; no commit, phase 2 pages, or backend integration was added.

### Card imagery preview

Phase 1 now includes three illustrated categories (programming, design, data) and three sample course covers (Python, UX, automation). Reusable decorative SVG artwork lives in `apps/web/src/components/course-artwork.tsx`, uses the selected brand colors with muted secondary tones, and contains no provider claims or embedded text. Other course rows demonstrate a missing-image fallback. Desktop thumbnails use a 16:10 aspect ratio and reflow alongside course text on mobile. These examples are included in the component checkpoint.

Lint, type checking, and RTL audit pass. Production build still fails on the existing Turbopack worker-port permission restriction after an escalated retry. Firefox accessibility output confirmed the updated page content, but subsequent Computer Use actions were denied; screenshot, mobile, and keyboard validation remain pending.

### Component checkpoint before interaction refinements

The owner authorized a checkpoint of the selected system, wordmark accent, expanded discovery components, card artwork, discounted-price treatment, and Bash launcher before applying the Firefox review improvements. Desktop and 393px Firefox review exercised search, filters, sorting, pagination, comparison, dialogs, accordions, and state specimens. Observed issues include inner-input focus rings, top-right dialog placement, separate search/selection demos, focus loss after chip removal, and narrow mobile description columns. These refinements are pending at this checkpoint; phase 1 remains incomplete.

### Firefox review refinements — approved commit

- Created authorized checkpoint `0d9f509` before changes. The owner subsequently authorized committing the refinements and current project state.
- Added whole-field search focus, centered scrollable dialogs, shared hero/list search, named removable selections, filtered compact select-all, chip focus restoration, and comparison heading focus/scroll.
- Added artwork for all six categories, full-width mobile descriptions, and tighter discounted-price spacing. Compact cards remain a clearly labeled independent demo.
- Verified interactions in Firefox desktop and 393px responsive mode, including dialog Escape, selection removal, comparison heading focus, chip focus restoration, and mobile layout. Lint, type checking, and RTL audit pass. Full screen-reader and all-breakpoint checks remain pending. Phase 1 remains active.

Final refinement validation: lint, types, and the RTL audit of the design-system/components directories pass. The wider source audit reports 20 existing warnings in the unchanged welcome-page CSS. Production build still fails when Turbopack binds its worker port, including an escalated retry.

Project-local frontend-design and rtl-design skills are included with their supplied license/attribution and audit references so future contributors can use the same guidance.
