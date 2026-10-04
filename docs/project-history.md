# Project history

Historical checkpoints through October 4, 2026. Earlier scope, validation failures, and “no commit requested” notes describe their original checkpoints; consult [the current plan](../Plan.md) and [validation](validation.md) for current status.

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

## Phase 1 completion — September 30, 2026

- The owner accepted the current design system and requested marking phase 1 complete. This supersedes the earlier incomplete-status entries, which remain as implementation history.
- Approved foundations: سنجش, the لاجورد palette, the supplied ring-and-cap mark with gold wordmark accent, and locally bundled Vazirmatn. The Persian RTL showcase includes interactive search, filters, sorting, pagination, course cards, price states, comparison, dialogs, accordions, and feedback specimens using clearly labeled fictional data.
- Recorded validation: lint, type checking, and the scoped RTL audit pass; Firefox desktop and 393px review covered the main interactions and focus refinements. No new application changes or validation runs were needed for this status update.
- Follow-up limitations: production build remains blocked by the documented Turbopack worker-port restriction and Bun/Webpack fallback error; full screen-reader and all-breakpoint review remain pending. Additional core-component coverage and extraction into a shared UI package can proceed as phase 2 needs arise. The welcome page still uses its initial teal treatment, and its existing RTL audit warnings remain unresolved. Completion records owner acceptance of the current showcase, not exhaustive validation or implementation of every originally proposed component.
- Phase 2 and phase 3 have not started. No commit is authorized by this status update.

## Phase 2 homepage — September 30, 2026

- Replaced the initial welcome page at `/` with a Persian RTL discovery homepage using the approved سنجش / لاجورد foundations, supplied logo, gold wordmark accent, Vazirmatn, and existing course/category artwork.
- Promoted the approved semantic tokens to global defaults and removed the obsolete teal homepage styles. Reused the showcase's sample fixtures, course rows, and price component, with a heading-level option for semantic homepage headings.
- Added submitted search with Persian input normalization, suggested searches, six category choices, a free-course filter, recoverable empty results, sample details dialogs, persistent comparison selection across filters, and a scrollable comparison table. Data remains explicitly fictional; enrollment, live ingestion, and AI are not implemented. Search/filter state is local to the page and is not yet URL-backed.
- Phase 2 remains incomplete: dedicated search, group, detail, and comparison routes and the mock data-service boundary remain future work.

Homepage validation: lint and type checking pass. The full source RTL audit reports zero errors and warnings; replacing the legacy homepage CSS removes the previously recorded 20 warnings. Firefox desktop and 393px responsive review confirmed sample search (including `n8n`), details and Escape/trigger focus restoration, comparison selection/table/heading focus, free-filter empty results, reset, and mobile hero/category/course layouts. Production build still fails on Turbopack worker-port permissions, including the escalated retry. Full screen-reader and all-breakpoint review remain pending. No commit has been made.


### Course group component — September 30, 2026

Added a standalone reusable `CourseGroupCard` in `apps/web/src/components/course-group-card.tsx` with colocated CSS-module styling and shared semantic tokens. It represents a topic/level group, with an owner-supplied image, title, description, level, Persian course count, and a full-card navigation target. It accepts a destination link or a preview callback. Three clearly labeled mock examples appear at `/design-system#course-groups`; existing SVG covers are temporary placeholders. Preview clicks open a native dialog; a real group route is still pending. Individual courses will use the existing small-card direction, whose markup currently remains inline in the showcase. The rejected homepage layout remains unapproved; this change only adds the requested component preview.

Lint, type checking, RTL audit, and whitespace checks pass. Desktop and 393px mobile previews were inspected; the native dialog opens, Escape closes it, and focus returns to the triggering card. Production build remains blocked by the existing Turbopack worker-port permission error, including an escalated retry. No commit was requested.


Mobile course group spacing refinement: grouped the level badge and title beside an 88px thumbnail, used consistent 12px grid gaps, and removed the duplicate footer margin. Description and footer span the card width; a subtle divider separates the action row. Verified the updated cards in Firefox responsive mode at 393 × 852, including Persian and n8n titles. Lint, type checking, RTL audit, and whitespace checks pass. The production build still encounters the documented Turbopack port restriction.


Course group emphasis refinement: replaced the separate count and generic action with a primary-blue «۸ دوره رو مقایسه کن» action derived from each group’s count. Added a concise comparison-fields preview, shorter learning-goal descriptions, and distinct temporary Python/automation artwork treatments. Desktop examples are constrained to 800px to reduce empty space; mobile actions fill the card width. Entire cards remain single navigation targets, with stronger hover, keyboard-focus, and pressed states. Reviewed desktop and 393px mobile previews. Lint, types, RTL audit, and whitespace checks pass; production-build validation remains affected by the documented Turbopack port restriction. No commit was requested.

Desktop review correction: removed the course-group preview’s 800px width cap after owner feedback about unused space on the left. Cards now fill the section width; the mobile layout is unchanged. This supersedes the width constraint above.


### Large course group cards — desktop refinement

Retained the owner’s larger group-card direction and iterated through desktop screenshots. Cards now use three aligned areas: a 260px cover, a prominent 23px title with level badge and concise description, and a softly tinted comparison panel containing the fields preview and count-based action. Desktop padding is 24px; tablet covers and typography scale down. Mobile keeps the compact heading/cover arrangement and full-width action. Replaced the intermediate Python analytics placeholder with a reusable programming-module illustration in `course-group-artwork.tsx`; all covers remain temporary and explicitly labeled. The component accepts owner-created image files.

Visually reviewed desktop, 820px tablet, and 393px/320px mobile layouts. Verified mouse and Enter activation, Escape dismissal, and return of focus to the card. Lint, type checking, RTL audit (zero findings), and whitespace checks pass. The production build remains blocked by the previously documented Turbopack worker-port permission restriction. No commit was authorized.


### Reusable compact category cards — September 30, 2026

Extracted the homepage’s six compact category cards into shared `CategoryCard` and `CategoryGrid` components with colocated CSS-module styling. The homepage now consumes the same components shown at `/design-system#compact-categories`, preserving its filtering behavior, artwork, desktop three-column layout, and responsive layout. The independent showcase demonstrates selection and reset; individual cards support either navigation links or selection buttons with pressed and keyboard-focus states.

Reviewed desktop and 320px mobile previews and keyboard activation. Lint, type checking, RTL audit, and whitespace checks pass. Production build remains blocked by the documented Turbopack worker-port permission error, including an escalated retry. No commit was authorized.


## Homepage reimagining — October 1, 2026

- Rebuilt the homepage around the owner's `docs/frontend.md#homepage-design-and-implementation-history` layout: header search, concise discovery/comparison hero, six compact categories, popular group cards, and small individual-course cards. X testimonials are explicitly deferred.
- Reused the approved semantic tokens, Vazirmatn, logo, category cards, group cards, illustrations, and small-card styling. Search text and placeholder are explicitly RTL.
- Added three mock group destinations with two fictional offerings each and fixture-derived counts. Selection comparisons include syllabus, provider, level, duration, price, and explicit missing prerequisites. Popularity/trending ordering is illustrative; artwork remains temporary.
- Firefox desktop and 320px responsive checks covered Persian search, group navigation, and comparisons with heading focus. Lint, types, and the touched-file RTL audit pass. Production build remains blocked by Turbopack worker-port permissions after an escalated retry. Full screen-reader and all-breakpoint review remain pending. No commit was authorized.


### Individual course review cards — October 1, 2026

Added `CourseCard` with official local provider logos, a measured 16:9 thumbnail frame, content-preserving image fit, and «مشاهده و بررسی» to open details. The homepage uses it for all 18 provider snapshots and removes individual comparison actions; group comparisons retain the existing component. `/design-system#course-cards` demonstrates all three providers and the review dialog. Following owner feedback, reduced body spacing, moved level to the thumbnail, combined provider/duration metadata, and put price beside the button. No live integration or new backend scope is introduced.


## Homepage hero review — October 1, 2026

At the owner’s request, added two fuller hero variants at `/hero-preview`: comparison in one glance, and a blue course showcase. These use existing phase 2 fictional comparisons and dated provider samples. They are proposals for owner selection; the main homepage retains its current hero until a variant is chosen. No phase 3 work is introduced. See `docs/frontend.md#homepage-design-and-implementation-history` for design and validation details.


The owner selected the blue course-showcase hero for the homepage. Mobile shows text and the primary button only. Desktop includes the requested «و ۹ وبسایت دیگر» mock placeholder after the three sample-provider identities; it does not represent current integration coverage. This supersedes the pending hero-selection note above.


The additional-provider count was subsequently replaced with the owner-requested auto-scrolling mock strip of ten repeated provider identities. The owner also requested removing `/hero-preview`; its route, chooser, and preview-only styles have been removed. The selected hero remains on `/`, with the compact mobile behavior retained.


### Snapshot-backed homepage groups — October 1, 2026

Replaced the homepage’s separate fictional group offerings with editorial subsets of the same provider snapshots: «پایتون مقدماتی» (three courses), HTML/CSS web development (three), and n8n automation (two). Counts derive from destination membership, and groups with fewer than two available courses are omitted. Courses without a matching group remain available individually. Provider levels and scope differences are retained; absent syllabi and prerequisites stay explicit. The design-system Python example uses the same revised title.

Lint, the component RTL audit (zero findings), whitespace checks, and group membership/count checks pass. Firefox accessibility inspection confirms all three homepage titles and counts. Type checking is blocked by the existing nullable `course.hours` error in `home-hero-variants.tsx:39`. Production build still fails on Turbopack worker-port permissions, including the escalated retry. Mobile and group-page keyboard checks were not completed for this update. No commit was requested.


### Course-group cover showcase — October 1, 2026

Added `/group-cover-showcase` as an isolated phase 2 design preview. It compares a main-cover collage, overlapping stack, equal cover strip, and a four-second cycling cover using up to three original course thumbnails. A shared group selector supports the existing three snapshot groups; two-course groups use two images. Every preview card includes deduplicated provider names and locally bundled logos through optional shared `CourseGroupCard` metadata. The cycling cover was subsequently selected for the homepage and this preview route was removed (see the update below).

Cycling has pause/resume and manual selection, pauses during hover or keyboard focus, and removes its timer offscreen, in hidden tabs, and with reduced motion. Image failures fall back to course titles. Qualitative efficiency notes explain static rendering, cycling overhead, shared source-image download/decode costs, and the absence of device benchmarks, with MDN references. Fixed the hero comparison’s nullable duration rendering using the shared formatter and updated its snapshot caption.

Lint, workspace type checking, component RTL audit, whitespace checks, and route HTTP 200 verification pass. Firefox desktop and 320px mobile layouts were inspected; provider names are included in accessible card names, and manual image selection and pause/resume controls were verified. Production build remains blocked by Turbopack worker-port permissions after an escalated retry. Full screen-reader and device performance benchmarking remain pending. No commit was requested.


Cycling-cover refinement: added a four-second remaining-time bar above the thumbnail and a 600 ms opacity crossfade. A browser-managed animation drives both countdown and slide advancement; pausing preserves elapsed time, and manual selection resets the countdown. Offscreen, hidden-tab, interaction, and reduced-motion pauses remain. Updated the qualitative efficiency copy for the continuous bar and brief fades. Lint, workspace types, RTL audit, and whitespace checks pass. Build still fails on worker-port permissions after escalation. Fresh browser verification was blocked by the unavailable preview connection; restarting the server reported ports already in use, including the escalated attempt. No commit was requested.


Countdown overlay refinement: cycling covers now occupy the entire 16:10 frame on desktop and mobile. The countdown sits above the image with an explicit stacking layer and consumes no image space. Lint, types, RTL audit, and whitespace checks pass; production build remains blocked by the documented Turbopack worker-port error.


Firefox progress-bar review: the owner’s screenshot showed that the inset overlay left a strip of source artwork above the countdown. Moved the bar flush to the frame’s top edge at full width on all breakpoints, retaining full-frame thumbnails. Fading slides now occupy an isolated lower layer and the opaque progress track is a separate upper layer, clipped to the frame with a thin separator below. Firefox desktop and 320px screenshots confirm the top-edge overlay on the reported TopLearn cover; manual selection and pause/resume were reviewed. Lint, workspace types, RTL audit, and whitespace checks pass for the final changes. Production build remains blocked by worker-port permissions after an escalated retry. No commit was requested.


### Selected cycling group covers — October 1, 2026

Applied the owner-approved cycling covers to all homepage course-group cards through reusable `CyclingCourseGroupCard`. It retains up to three original thumbnails, four-second top-edge countdown, 600 ms crossfade, provider logos/names, manual image selection, and pause/resume. Visibility, hover/focus, and reduced-motion pauses remain. Removed `/group-cover-showcase` and its preview component/styles; no preview-only efficiency copy appears on the homepage. The design-system artwork examples and group-page hero remain separate.

Lint, workspace types, RTL audit, whitespace checks, homepage HTTP 200, and removed-route HTTP 404 checks pass. Firefox desktop and 320px review confirmed the cover overlay, provider rows, and manual selection/pause controls. Production build remains blocked by the documented worker-port error after an escalated retry. No commit was requested.


Owner follow-up: removed all visible slideshow buttons from homepage group cards, including pause/resume and numbered image selectors. Covers cycle automatically and retain hover/focus, offscreen, hidden-tab, and reduced-motion pauses. This supersedes the controls described above.

## Additional MVP adapter groundwork — October 2, 2026

The owner authorized parallel agents to add at least three reusable standalone adapters based on the Maktabkhooneh utility, explicitly requiring the golden contract and excluding Quera. Three agents implemented TopLearn, Sabzlearn, and Roocket in `apps/utils`; the [shared plan](provider-adapters.md#provider-selection-and-implementation-groundwork) records instructions, ownership and selection. Faradars was considered for subject breadth but deferred after robots and public detail-page assessment; Roocket supplies useful programming comparison coverage instead. This extends utility groundwork without starting live frontend integration or the broader phase-3 backend.

All new adapters return the complete version-1 record with nullable unknowns, explicit price evidence, original currency, ordered syllabi, field provenance, parser version, successful-check timestamp, deterministic fact hash, selected raw evidence, and `derived: null`. Shared transport provides robots checks, same-host HTTPS redirects, sequential delays, retries/Retry-After, bounded responses, and cancellation. The export CLI validates records/checkpoints, saves atomically, reports partial failures, and tracks requested URL aliases separately for resume. Root scripts and package exports support CLI use or a future server-side TypeScript backend. Existing Maktabkhooneh records remain their earlier format and require later contract alignment; frontend samples were untouched.

Live samples: TopLearn discovered 1,242 advertised course URLs and parsed three detail pages; Sabzlearn discovered 89 and fetched two details, with a third retained live page also parsed. Roocket's observed catalog contains 106 URLs; two public course pages were fetched with normal TLS via public DNS resolution and parsed. Local Roocket DNS fails, so ordinary network end-to-end collection is not claimed; discovery uses retained-response tests. No complete detail catalog was collected. TopLearn's IRR/toman conflict and Roocket's unverified currency glyph deliberately leave paid normalized amounts null until resolved; original source observations are retained. Broader template sampling and ongoing operational suitability remain follow-up work.

Validation: all 39 utility tests, workspace lint/type checking, CLI help and whitespace checks pass. Production compilation/type checking succeed; page-data collection still encounters the existing Bun CommonJS runtime bug. No dependencies, system runtime changes, commits, branches, or pushes were introduced by this work.

### Maktabkhooneh golden-contract alignment — October 2, 2026

The owner requested bringing the existing adapter into the same golden structure. Parser version 2.0.0 now uses the shared ProviderCourse factory/validator/hash; the CLI uses the shared export implementation. New IDs use the stable provider course ID, old slug identifiers and effort labels remain raw, and offers/source/image/lesson fields follow the contract. All nullable fields and derived:null are included. Ambiguous zero amounts do not imply free access; missing lists remain null; rating counts do not use review totals. This supersedes the earlier note that Maktabkhooneh still needs output alignment.

Old-format checkpoints are deliberately rejected without overwriting them; re-export without --resume, preferably to a new path. Frontend fixtures and existing generated exports are untouched. The existing Nuxt decoder and course collection behavior are retained. Tests cover complete shape, source facts, string IDs, unknown/free-price semantics, signed cover hashes, failure handling and safe legacy-checkpoint rejection. No commit was requested.

Final alignment validation: all 40 utility tests (including 11 Maktabkhooneh tests), workspace lint/type checking, CLI help and whitespace checks pass. No fresh live collection was performed for this shape-only update; validation uses the retained public-page fixture and injected transport cases. Production compilation/types pass; page-data collection still fails with the existing Bun CommonJS runtime error.

## Utility checkpoint — October 3, 2026

The owner authorized committing `apps/utils`, its four provider adapters, shared golden contract and export CLI, retained fixtures and tests, workspace scripts/lockfile, ignored output directory, and utility documentation. The frontend changes and experimental Next.js build configuration remain outside this commit. This is standalone ingestion groundwork authorized as an exception to the phase order; API, database, scheduling, frontend integration, and live AI remain deferred.

Validation: workspace lint and type checking, all 40 offline utility tests, and all four CLI help commands pass. Generated exports remain ignored. The current working-tree frontend compiles and type-checks, but production page-data collection fails with the documented Bun CommonJS runtime error. The utility package has no production build step; TypeScript checks its source exports. No new live collection or full-catalog run is part of this checkpoint.

### Python course group design preview — October 3, 2026

The owner authorized a Python group-page design exploration in phase 2. `/groups/python-beginner` now presents an introductory Python section and three switchable course-card layouts: a sketch-like integrated row, a separate offer column, and a larger analysis area. Each shows illustrative rank, decorative cover, title, instructor, metadata, provider logo/rating, value/popularity tags, price, and separate bulleted strengths/limitations. All course facts, ranks, ratings, tags, and analyzer text on this preview are explicitly fictional; no provider or AI integration is claimed. Native details expand a sample description without an enrollment link.

The new components and fixtures stay local to `apps/web/src/app/groups/[id]/python-group-preview.tsx`, with a colocated CSS module, at the owner's request. Existing homepage components and other group routes are retained. Shared component extraction and selection of one final card design are deferred until review. This preview has three fictional courses rather than the homepage group's dated offerings; membership will need reconciling when the chosen design is integrated.

Validation: workspace lint/type checking and the route RTL audit pass. Firefox review confirmed the three layout controls, Persian/mixed-direction content, visible bullets, a 320px responsive layout, and keyboard activation of native details. Production compilation and its TypeScript step pass; complete production validation remains blocked by the existing Bun CommonJS function-wrapper error during page-data collection. No commit was requested.

### Course group analyzer specification — October 3, 2026

Added the owner-requested [analyzer input/output specification](course-group-ai-assessment.md) to the docs library and linked it from the course contract and README. It covers educational content, prerequisites/audience, practice/feedback, offers/access, anonymous reviews and collection coverage, exact evidence provenance, group context, proposed ranking dimensions, validated badges, and separate course/group assessment records. It maps these records to the group-page fields, preserves provider facts separately from AI judgments, and specifies missing-evidence abstention and refresh/validation rules. Ranking weights and badge policies remain proposals for review; this documentation does not change the version-1 scraper contract or activate phase 3. Relative links and whitespace checks pass. No commit was requested.

### Selected Python course card and real-data gallery — October 3, 2026

The owner selected the second course-card design; removed the other variants and selector. Replaced the hero side card with a manual eight-cover gallery. The prototype now uses all eight Python courses found in the saved frontend snapshot and legacy Maktabkhooneh export, curated into a browser-safe fixture with source URLs and observation times. Actual titles, images, instructors, offers, levels, and available ratings replace fictional facts; analytical tags, analysis, and numbered ordering remain explicitly prototype content. No new scraping or AI calls were added, and components stay page-local. The broader topic scope retains the original route while displaying real individual levels; reconciling homepage beginner-group membership is deferred. See [page documentation](frontend.md#python-course-group-prototype).

Frontend lint/types and RTL audit pass. Workspace lint passes; workspace types are blocked by separate ongoing scraper-schema changes. Build compilation/types pass, then fail at the existing Bun page-data runtime issue. Firefox desktop gallery/card review and 320px hero review completed; further mobile card/focus review was interrupted by browser-window unavailability. No commit was requested.

### Assessment data migration — October 3, 2026

The owner authorized simplifying `docs/course-data-format.md`, implementing the version-2 golden model, and assigning one agent per provider to migrate all four standalone scrapers. The focused contract adds anonymous source-labeled reviews/unverified course comments, sample coverage, syllabus completeness, and available educational/access descriptions. Harder optional metadata is deferred. Shared validation/hashing and export compatibility are updated; old checkpoints require fresh exports. Existing frontend fixtures remain separate. This extends authorized ingestion groundwork, without activating a database, scheduler, ranking, or live AI.

Provider evidence and actual validation results are recorded in the utility/provider documentation. Public-page feedback samples must not imply complete review coverage or verified enrollment. No commit was requested for this migration.

Migration validation: all four adapters emit version 2; all 62 utility tests and workspace lint/type checking pass. Bounded public-page checks verified actual Maktabkhooneh reviews, anonymous Sabzlearn comments, TopLearn lesson descriptions and Roocket educational headings. TopLearn/Roocket feedback remained unavailable in inspected page payloads; no guessed endpoints or full-catalog runs were used. Production compilation/types pass, with the existing Bun CommonJS page-data failure unchanged.

### Local scraper data browser — October 3, 2026

Owner-requested bounded scraper run selected ten courses per provider and saved 39 courses, 84 feedback items and one TopLearn identity failure into an ignored aggregate JSON. Added a standalone read-only Persian RTL dashboard served on loopback, with search/filtering, syllabus, feedback, evidence and record inspection. This local inspection utility does not connect provider data to product pages or add production scheduling/AI. Workspace lint/type checking pass; desktop/320px browser and keyboard-tab review completed. No commit requested.

October 3 provider repairs: owner-requested agents fixed TopLearn purchase units and verified legacy course aliases, Roocket course-scoped currency evidence and script-disclosed public API comments, Maktabkhooneh duration variants/category/language evidence, and Sabzlearn explicit FAQ outcomes/access. The refreshed local aggregate contains 40 courses, zero errors and 118 anonymous feedback items; all courses have content duration, 39 have free/paid prices and one is subscription-only. TopLearn's public comments route returns provider 404 markup, so feedback remains unknown. Bounded first-page comment samples are identified as partial where appropriate. All 72 utility tests, workspace lint/type checking and whitespace checks pass; the running dashboard serves the refreshed aggregate. No commit or production integration requested.


## Phase 3 milestone 1 — October 4, 2026

- The owner requested backend implementation in `apps/backend` and separate backend/worker Docker containers for eventual cloud hosts, superseding the earlier Next.js-only backend boundary.
- Added a Bun HTTP backend and operator CLI, an independent Bun pg-boss worker, browser-safe DTOs and server-only database/domain packages.
- Added PostgreSQL/pgvector Compose setup, reviewed Drizzle SQL migrations with evidence ownership/immutability constraints, a version-2 saved-export importer and revision-bound deterministic factual group workflows.
- Group creation/job insertion and snapshot/follow-up insertion share transactions. Retry/restart, stale-input and publication checks retain valid evidence and prevent duplicate accepted results. Manual factual publication and private draft inspection are available; AI analysis remains null.
- Added a placeholder `.env.example`, separate API/worker image targets, a private compatible Node dashboard, setup/recovery documentation and the five-milestone backend status. Milestone 2 (bounded ingestion/revision handling) is next.
- Workspace lint/type checking, 72 utility tests, 10 offline backend tests, 16 PostgreSQL integration tests, both Bun builds and the API/worker/dashboard container workflow pass. The frontend build still reproduces the existing Bun CommonJS runtime blocker after compilation/types.
- No live collection, model calls, refresh schedules, cloud deployment or frontend database integration were enabled. The owner explicitly requested this documentation update and backend-foundation commit; generated exports, build outputs and real secrets are excluded.
