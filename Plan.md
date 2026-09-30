# Dorob — Project Plan

Created: September 30, 2026

Status: Planning complete; phase 1 implementation has not started.

## Product vision

Dorob is a Persian course discovery and comparison product for anyone learning a new skill. It gathers courses from Iranian education providers and organizes comparable courses into shared topic and level groups.

The experience takes inspiration from Torob: search for something to learn, browse a relevant group, compare available courses, and visit the provider to enroll. Dorob should have a modern, polished identity of its own.

Examples:

- Beginner Python courses appear together, with intermediate and advanced courses distinguished.
- n8n courses share a topic destination, with level and scope differences visible.
- Courses from different providers remain distinct offerings; shared topics do not imply identical content.

AI supports course grouping and factual content comparison. Dorob is not a personal learning agent.

## Confirmed decisions

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
- Use a pnpm workspace so the web app, Node.js API, ingestion worker, and shared packages live in one repository.
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

Begin phase 1 with the Next.js workspace, initial brand tokens, and the `/design-system` page. Present the first visual direction for review before expanding the component library.
