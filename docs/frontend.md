# Frontend: homepage and course groups

Phase 2 was closed by the owner on October 4, 2026. The three-course homepage shelf and dedicated `/courses` catalogue use the public course API; group cards and group destinations now use real published groups with current judgments and complete presentation-ready membership. The selected Python layout is shared across categories, with source facts separate from generated content. The homepage hero uses a selected real group; design-system fixtures remain isolated. The dated design history below includes superseded fixture behavior and layouts; [validation](validation.md) records current checks.

## Homepage design and implementation history

The homepage should put visitors straight into discovering and comparing courses. Keep the explanation short, show what Dorob does, and quickly give people useful things to browse. Avoid a long marketing introduction or sections that add scroll without helping users choose a course.

The entire page is Persian and RTL, using the confirmed design system: سنجش, the لاجورد palette, Vazirmatn, the approved logo, and shared responsive components.

### Header

Move the main search bar into the header so visitors can immediately search for a topic or course. Search should remain easy to access on mobile as well.

### Section order

#### 1. A clear hero

Start with a hero that explains what the website does: Dorob helps people discover courses and compare the available choices. Keep the message direct and concise, then lead visitors into the browsing experience.

The exact headline, supporting copy, and hero visual treatment are still to be decided.

#### 2. Persian testimonials from X — deferred

Deferred by the owner for the current implementation. When this section is resumed, below the hero, feature tweets from Persian users describing how Dorob helped them. This section should give visitors concrete evidence of the product’s value.

Use real, attributable testimonials when available. During the mock-data phase, clearly label placeholders as sample content; do not present invented endorsements as real tweets.

#### 3. Compact course categories

Show the existing mini category layout, keeping its vertical footprint small. Each card contains artwork, a category name, a short description, and a directional arrow.

The six existing categories are:

- برنامه‌نویسی
- طراحی
- داده و هوش مصنوعی
- کسب‌وکار
- زبان‌های خارجی
- ابزار و بهره‌وری

Reuse the shared `CategoryCard` and `CategoryGrid` components showcased at `/design-system#compact-categories`.

#### 4. Popular course groups — مجموعه دوره‌ها

Feature the most popular course groups. A group represents a learning topic and level, gathering comparable individual courses in one place. Examples include beginner Python, intermediate Python, and n8n.

Use the larger `CourseGroupCard` with the selected cycling treatment: up to three original course thumbnails, four-second countdown overlay flush to the top edge, 600 ms crossfades, and names/logos of all providers in the group. The cards have no visible slideshow controls. Cycling pauses offscreen, in hidden tabs, during hover/focus, and with reduced motion. The cover showcase route has been removed after owner selection.

Each card should communicate the group’s topic, level, learning goal, and course count. Use the count-based comparison action agreed during refinement, such as «۹ دوره رو مقایسه کن», with the actual number for that group.

Clicking a group takes the visitor to its dedicated page. That page contains information about the group, all courses belonging to it, and a comparison between those courses.

Whether the comparison is static or dynamic remains undecided. The larger desktop card direction is the current choice, but its size can be reconsidered if it makes the layout less effective.

#### 5. Trending individual courses

Below popular groups, show the courses that are currently trending. These are individual course offerings, each associated with its provider, rather than course groups.

Use the existing small course-card design for this section. Keep the distinction between a topic/level group and an individual course clear throughout the page.

The definition of “trending” and the ranking method have not yet been decided. Phase 2 uses clearly labeled mock data.

### Open decisions

- Final hero copy and visual treatment.
- Which real X testimonials to feature and how to display them.
- Static versus dynamic comparisons on course-group pages.
- How popularity and trending are measured, and how many cards each section shows.
- Any additional sections: they may be added if they help visitors discover or choose courses without diluting this direct experience.

This document records the owner’s intended homepage. The earlier homepage implementation was rejected and should not be treated as the approved layout. Live provider ingestion, AI integration, and backend work remain phase 3 tasks.


### Current mock implementation — October 1, 2026

The homepage now follows this section order with the X section omitted. Header search is explicitly RTL and moves to its own row on mobile. The hero uses concise discovery/comparison copy and existing decorative artwork. Shared compact categories precede three large group cards and the small individual-course grid.

Each group opens `/groups/[id]`, showing matching offerings from the same dated provider snapshots as the homepage, with details and selectable comparison. Current editorial groups are beginner Python (three courses), HTML/CSS web development (three), and n8n automation (two). Groups with fewer than two available courses are omitted; other courses remain individually discoverable. Provider-reported levels remain visible, and shared topics do not imply identical scope. Comparisons explicitly identify missing syllabi and prerequisites. Popularity and trending remain illustrative ordering, with no live ranking. Existing artwork remains temporary pending owner-created images.

Hero artwork refinement: the homepage now uses a minimal abstract illustration: three smooth blue/gold routes connect a starting point to one learning goal. It has no people or detailed objects. The journey reads right to left and supports «یک مهارت، چند مسیر یادگیری». Group pages retain their topic-specific covers.

Reviewed the simplified hero in Firefox against the frontend-design and RTL guidance: clear right-to-left start/goal, three distinct routes, shared semantic colors, restrained visual weight, and no human figures. Lint, types, and RTL audit pass; the production build retains the existing Turbopack worker-port restriction.


### Homepage provider snapshot — October 1, 2026

The individual-course section uses all 18 entries from `apps/web/src/data/provider-courses.json`. Search includes provider and instructor names; category assignments are editorial browsing aids, not claims of equivalence. Actual remote covers have decorative artwork as a failure fallback. Details expose the provider source link and label AI-derived summaries. The collection date and price freshness note appear in course details; the homepage has no collection notice banner. Content duration is separate from study effort and completion windows; unavailable duration, level, syllabi, and prerequisites remain marked as unrecorded. Group cards and their destinations retain clearly labeled fictional fixtures. Ordering remains illustrative.

Validation: lint, type checking, and the touched-file RTL audit pass. Verified the running Firefox preview: all 18 entries, n8n search, four free offerings, two-provider comparison with missing-field labels, detail source links and AI labels, Escape dismissal, and the 320px mobile card layout. Production build remains blocked by the existing Turbopack worker-port permission error, including an escalated retry.


### Compact individual course review card

Individual homepage offerings now use the shared `CourseCard` shown at `/design-system#course-cards`. Provider logos and names identify the source immediately. «مشاهده و بررسی» opens the course details; comparison stays in the group experience. The level badge sits on the thumbnail, provider and duration share a wrapping row, and the price sits beside the review action. Full titles can wrap, including long Persian and mixed Latin text. The measured covers favor a 16:9 frame; `contain` preserves covers with taller proportions.

Validation for the review card: lint, type checking, touched-file RTL audit, and whitespace checks pass. Reviewed all three official provider marks and contained thumbnail proportions on desktop; verified details opening, Escape dismissal, keyboard focus, and the final compact card at 320px. Production build remains blocked by the existing Turbopack worker-port permission error after an escalated retry.


### Homepage simplification — October 1, 2026

Removed the suggested-topic buttons beneath the hero and the homepage data-collection notice at the owner’s request. Categories now follow the hero directly. The group-page fictional-data notice and course-detail source/date disclosures remain.

Validation for this simplification: lint, type checking, and both touched-file RTL audits pass. Firefox desktop and 320px previews confirm the hero flows directly into categories. Production build still fails with the existing Turbopack worker-port permission error, including an escalated retry.


### Hero alternatives — October 1, 2026

Two owner-requested hero alternatives are available at `/hero-preview`, with buttons to switch while retaining the full homepage context. “مقایسه در یک نگاه” pairs a large Persian headline with a semantic two-course comparison table using the existing fictional beginner-Python fixtures. “ویترین دوره‌ها” uses the approved blue with three dated Python course samples and provider marks; clicking an offering opens existing course details. Main homepage selection remains pending owner review. Removed suggested-topic buttons and the collection banner are absent from both alternatives.

Design uses existing semantic colors (لاجورد #304CB2, soft blue #EAF0FF, page #F5F7FC, ink #202C48, white #FFFFFF), locally bundled Vazirmatn, logical CSS, and responsive stacked layouts. The content panel supplies visual weight and demonstrates discovery/comparison directly. No rankings, endorsements, or new live integrations are implied.

Lint, type checking, component RTL audit, and preview-route RTL audit pass. The preview returns HTTP 200; both desktop layouts and the discovery variant at 320px were visually reviewed. Course details, Escape dismissal, and focus restoration work. Full mobile comparison review remains pending due to intermittent Computer Use window errors. Production build encounters the existing Turbopack worker-port permission restriction.


### Selected homepage hero — October 1, 2026

The owner selected the second variant, “ویترین دوره‌ها”, for `/`. On desktop it retains the blue panel, course samples, and small provider identities, followed by the owner-requested mock copy «و ۹ وبسایت دیگر». This count is a design placeholder, not a connected-provider count. At 700px and below, only the heading, supporting text, and course-list button remain; both the course shelf and provider strip are hidden to keep the hero compact. Hero styling is now shared from `components/home-hero-variants.css`; preview controls keep their own route styles.

Validation for applying the selected hero: lint, type checking, component/page/preview RTL audits, and whitespace checks pass. The homepage returns HTTP 200 with the selected discovery markup and the additional-provider copy. Shared mobile CSS hides the shelf and provider strip at 700px and below. Final browser visual review was blocked by stale Firefox screenshots and inaccessible document content. Production build still fails with the existing Turbopack worker-port permission restriction, including an escalated retry.


### Provider loop and preview removal — October 1, 2026

Replaced the additional-provider text with an infinitely moving provider row: ten mock entries cycle through the three existing logo/name pairs, then a second identical lap provides a seamless RTL loop. Duplicate visuals are hidden from assistive technology, which receives the three unique provider names once. Hover and keyboard focus pause motion; an explicit pause/resume button keeps it paused after focus moves away. Reduced-motion preferences show a static wrapping row. The provider strip remains hidden on mobile, as previously selected.

Removed `/hero-preview`, its chooser component, and its route-only styles at the owner’s request. The selected homepage hero and shared styles remain. Earlier preview-route notes are historical.

Validation: lint, type checking, RTL audit, and whitespace checks pass. The homepage returns HTTP 200 with ten provider entries per loop lap and a pause control; the removed preview route returns HTTP 404. The additional-provider text is absent. Browser animation/focus and reduced-motion visual checks remain pending; production build retains the existing Turbopack port-permission failure after an escalated retry.


Removed the provider-strip pause/resume button and its state at the owner’s request. Automatic looping, hover pause, and reduced-motion handling remain. Lint, type checking, RTL audit, and whitespace checks pass; production build retains the documented Turbopack permission failure.

Removed the course-shelf footnote «گزینه‌ها را بررسی کن؛ دوره‌ها الزاماً محتوای یکسانی ندارند.» and its divider/padding at the owner’s request to shorten the hero. Lint, types, RTL audit, and whitespace checks pass; production build retains the documented Turbopack worker-port restriction.

## Python course group prototype

Updated October 18, 2026 after owner-directed refinements to the selected card design.

Route: `/groups/python-beginner`. The URL is retained, but this prototype now shows all eight Python offerings found in the saved datasets, with their individual levels and purposes. It is a broad Python topic preview, not a claim that advanced design-pattern and data-science courses are equivalent to introductory Python. The homepage's existing three-course beginner group membership remains unchanged; reconciling topic/level navigation is deferred until the prototype scope is finalized.

### Selected layout

The selected layout places the cover, course details and compact price/action area
in the top row, with full-width strengths and weaknesses beneath. Green and red
panels use equal tint/border intensity and identical heading weight. Mobile places
the offer below the analysis. Cards show title, instructors, provider ratings,
level and content duration; lesson counts, study effort, completion deadlines and
expandable summary/syllabus are omitted. Missing duration/rating labels remain.

The gallery is an automatic slideshow with overlaid dots and hover/focus arrows;
its behavior is detailed below. The intro action, caption, sample/design labels,
collection notice and repeated price label are removed. The list is titled
«لیست دوره‌ها» with owner-selected AI/value-for-price copy.

### Saved course facts

`apps/web/src/data/python-course-snapshot.json` is a curated browser-safe fixture; it is not a new scraper schema or live service. It contains all records with Python in their title from these existing sources:

| Source | Python records |
| --- | --- |
| `apps/web/src/data/provider-courses.json` | Six: Maktabkhooneh comprehensive Python and machine learning; TopLearn free Python and five projects; Quera introductory Python and design patterns. |
| `apps/utils/output/maktabkhooneh.json` | Two: ten Python projects for beginners and predictive analytics with Python. This is a saved legacy adapter export, not the current golden-contract format. |

Both sources were collected October 1, 2026 (۹ مهر ۱۴۰۵). Exact per-course observation times and source URLs are retained. No new provider requests or scraping were performed for this change. Quera records are retained historical samples; their presence does not reverse the decision to exclude Quera from new adapter development.

The curated fixture includes display facts and selected plain-text evidence, excluding raw provider HTML and scraper/server code. Source prices, aggregate rating values/scales/counts, instructors, and durations are copied without inventing absent values. Missing normalized duration in the legacy export remains unknown; raw time strings are not silently reinterpreted. Its two offers are explicitly labeled content purchases. Ratings are attributed to the provider, not displayed as Dorob scores; absent ratings are not synthesized.

Remote image URLs are retained and rendered unoptimized, consistent with the existing snapshot cards. This relies on provider image availability and network access; fallback text preserves usable cards and gallery buttons if images fail.

### Prototype assessment boundaries

Numbered positions still follow a fixed editorial order. The AI review heading and
value-for-price subtitle are presentation copy for this mock, not computed ranking
or live analyzer results. Assessments are hand-authored from saved facts and
course-scope tradeoffs; weaknesses no longer describe missing dataset fields.
Negative reviews and unsupported missing-topic claims are not invented. Mock
provenance remains in documentation, following the owner's final-product UI rule.
Project/practice tags are editorial; free access follows saved offer status.

Production assessment, evidence-backed badge validation, comparative ranking, and freshness handling remain governed by the proposed [analyzer specification](course-group-ai-assessment.md).

### Validation

Frontend lint/type checking and the route RTL detector pass. Workspace lint passes; workspace type checking encounters separate in-progress utility schema/adapter mismatches in Roocket and Sabzlearn, outside this page change. Production compilation and the build TypeScript step pass; page-data collection still fails with the documented Bun CommonJS function-wrapper error.

Firefox desktop review confirmed real covers, the selected layout, and gallery selection; 320px hero/gallery layout was inspected. Further mobile card/focus inspection was interrupted when the browser window became unavailable. Native gallery button semantics and global focus styling are present, but full keyboard and screen-reader review remain pending. No commit was requested at that historical checkpoint.

## Fixed category ownership

`packages/core/src/categories.ts`, re-exported by `index.ts`, owns the ordered category IDs and Persian labels. Changing categories requires a code change; the API does not provide category administration. `discovery-showcase.tsx` retains a `Record<CategoryId, CategoryPresentation>` for icons, descriptions, and SVG artwork. Artwork lookup uses IDs, never translated labels (`tools` retains the `workflow` artwork). The frontend consumes the category registry locally. Homepage category cards link to `/groups?category=<id>`; design-system category examples retain isolated selection callbacks. Individual-course API category support remains available independently.

## Homepage public course integration — October 11, 2026

Only `#courses` on `/` opts into the public catalog. Initial results come directly from a server-only module under a scoped Suspense boundary. Browser filtering/paging and details use fixed same-origin handlers; hosted UUID WebP images are proxied with bounded bytes, deadlines and conditional cache support. `DOROB_API_URL` remains server-only.

Cards display actual retained title/provider, known level/duration, selected price and Persian Jalali source date. Missing values remain unknown; failed images show a neutral text/icon placeholder. Free, paid, subscription and unknown summaries are distinct. Real details fetch the latest eligible observation and show missing fields, offers/access terms, syllabus and outbound source links; newer observations are disclosed. Hero samples are a static showcase without a details action. Native modal dismissal restores trigger focus, including React development effect replay.

Homepage search and free selection reset individual-course pagination; homepage categories now navigate to group discovery (see the October 20 update below). Abort signals and active-request guards prevent older responses from replacing a new query. Loading/status/error/retry and empty states affect only the course section. Published backend groups determine category membership; an empty category does not mean no unassigned courses exist. Stable offset paging can still shift if ingestion changes between requests. Reads never scrape or imply fresh provider pricing. The hero/provider strip, topics, group cards/routes, navigation/footer and design-system fixtures retain their prior presentation.

See [validation](validation.md) for measured browser coverage and outstanding checks.

## Homepage card refinement — October 11, 2026

Real catalog cards group natural-height, two-line-clamped titles with instructor summaries immediately below them. The first two source-ordered names are direction-isolated; additional names are counted with Persian digits. Null and empty lists have separate missing-data labels. Flexible space follows this text group, with bottom-aligned provider rows and consistent footers. The pale-blue «مشاهده دوره» button and the title open the existing details dialog; closing returns focus to the activating button. Full titles and instructor lists remain available there. Sample cards and global secondary buttons retain their existing presentation.

The separate card collection-date row is replaced by a dotted-underlined price button. Its uniquely described tooltip exposes the course's own Tehran/Jalali `checkedAt` date through hover, focus or tap, stays open during pointer transfer, and closes on second activation, outside interaction, blur or Escape. Escape retains focus and a new interaction can reopen it. Unknown prices use «اطلاعات گردآوری‌شده در»; known prices use «قیمت ثبت‌شده در». These are retained observations, not current provider quotations. Details keep the visible collection date, noninteractive prices and source caveat. Real cards allow tooltip overflow while thumbnail corners remain clipped. See [validation](validation.md) for actual checks and browser coverage.

### Python group gallery — October 18, 2026

The Python group uses a looping slideshow instead of a thumbnail grid. It advances
at five-second intervals, pauses on hover or keyboard focus, and includes explicit
previous/next arrows, overlaid clickable dots and RTL arrow-key navigation.
There is no caption below the image or playback button. Pagination
shows at most seven dots around the current image, with the counter retaining the
absolute position. Navigation arrows appear on hover/focus and remain visible on
touch devices. Reduced-motion preferences and hidden tabs suspend automatic changes.
Course order and assessments remain page-local fixtures, without runtime AI ranking.

### Course assessment badges — October 18, 2026

The Python mock maps fixed `project_based`, `practice_based`, `popular` and
`expensive` values to Persian labels. `popular` uses a filled rose heart and pale
rose background; `expensive` uses a wallet and amber styling. The comprehensive
Maktabkhooneh Python course demonstrates popularity, while introductory Quera
shows the expensive badge beside its practice badge. These assignments demonstrate
presentation only; no popularity threshold or comparative price rule is implemented.

## Public judged-group frontend — October 19, 2026

The homepage group section now server-renders `/api/v1/judged-groups` data,
independently of the individual-course grid. Cards show generated hero copy,
actual membership counts, distinct providers and up to three hosted covers in judge
order. The October 20 update moves group pagination to `/groups`; homepage loading, empty and retry states never substitute fixture groups.
The static homepage hero showcase and design-system fixtures remain separate.

Every eligible `/groups/<stored-slug>` uses the generalized selected Python layout:
all five hero fields, shared category labels, actual totals, source instructors,
rating scale/count, duration, retained prices/offers/terms and Jalali fact dates.
Course rows follow exact judge order. Empty assessment columns are omitted; no
missing-data complaint or invented weakness is inserted. AI assessment attribution
and judgment date remain separate from provider facts. Source links open safely.

Course pages default to 20 rows (maximum 100). URL paging carries the selected
judgmentId; conflicting selection offers restart. Metadata and page share request-local
loading without cross-request caching. The gallery uses the current course page's
images and local image counter. It retains the five-second slideshow, controls,
keyboard navigation, reduced-motion handling and hover/focus/hidden-tab pauses.
`python-beginner` and `n8n` redirect to their real counterparts; other fixture-only
slugs return 404 unless a matching real group exists. Upstream outages show retry
instead of false 404s. Already rendered data stays visible until navigation/refresh.

Data retry/paging and images use concrete same-origin web handlers; the API origin
remains server-only via existing `DOROB_API_URL`. Deadlines are five seconds, list
responses cap at 2 MiB and detail responses at 8 MiB. No extra setup or migration is
needed. A published group needs current judgments and every member ready; source or
publication changes require explicit rejudging. Visits never run models or collection.


## Shared group catalogue — October 20, 2026

`/groups` shares the existing cycling cards with the homepage and renders real
eligible judged groups on the server. Search submits explicitly against selected
hero title/subtitle/description; category matches the group's single registry ID.
The URL owns committed `q`, `category` and one-based `page`, with twelve items per
page. Search, category changes and individual chip removal reset page one while
preserving the other condition. Clear-all opens `/groups`. Refresh and Back/Forward
restore the committed controls and results; unsent input is only a draft.
Unsupported categories, duplicate recognized parameters, queries over 200 characters
and invalid/unrepresentable page values show a safe recovery state. Unrelated page
parameters are ignored. A positive page beyond the matching last page redirects to
the last page (one for zero matches), preserving conditions; failures do not redirect.

Category controls sit on the right on desktop and use a native modal with explicit
Tab wrap, Escape dismissal and trigger-focus return on mobile. Active conditions
are removable chips. Counts, pending, zero-match, empty-catalogue and retry states
are Persian and distinct. The catalogue offers search/category only: no provider,
price, level or sort controls. Search normalizes Persian/Arabic letters, NFKC,
ZWNJ, whitespace and case without changing retained facts or searching member
courses. Eligibility still uses the existing local-scale batch scan and current
reads can shift between offset pages.

The homepage requests/retries only the first three groups in stable slug/ID order,
shows no group pager and exposes «مشاهده همه مجموعه‌ها» in every group-section
state. Category cards are ordinary links to `/groups?category=<id>`. The homepage
course search, free control, course pager/dialogs and hero remain independent.
No new inference, editorial featuring, fixture fallback, publication or migration
is involved. Existing comparison slugs and legacy redirects remain intact.


Catalogue review refinements retain the full-width search field and the plain
brand-blue «مشاهده همه مجموعه‌ها» link with an RTL arrow and visible focus.
The proposed real-group hero shelf was reverted at the owner's request; the
original saved hero samples/provider strip remain unchanged. The catalogue change
was synced and archived on October 21, 2026 with all twenty tracked tasks complete.


### Initial static homepage showcase — October 21, 2026 (superseded)

Before the real-group restoration below, the saved hero course shelf was titled «پایتون مقدماتی». Its rows are static
content, with no click action, keyboard stop, hover action or navigation arrow.
The sample label is removed. Saved course facts remain independent of the live
catalogue. The provider strip includes all five supported provider identities:
Maktabkhooneh, Toplearn, Quera, Sabzlearn and Roocket, using bundled logos.
Reduced-motion mode shows one wrapping set of all five providers. The existing
mobile rule still hides the shelf and strip at 700px and below.


## Restored real-group hero shelf — October 21, 2026

The owner's latest decision supersedes the earlier hero rollback. `/` passes the
read-only detail request for `python-starting-programming` (limit three, offset
zero) into its own Suspense shelf. The first three members retain judgment order;
heading links to the group and each course links to its encoded comparison-row
fragment. Provider identity, content duration, current retained price semantics
(including free/subscription/unknown), and Persian source dates reuse the existing
public presentation helpers. No provider collection or model execution occurs.

The selected group must have at least three members and return three ready courses.
Missing/ineligible or too-small selections show a compact unavailable state with
a catalogue action; upstream failures additionally offer a same-selection retry.
No dated samples substitute for public data. Existing comparison/design-system
fixtures remain available independently. The five-provider desktop marquee retains its reduced-motion treatment. At
700px and below, the shelf and horizontal strip are hidden; the mobile provider
wheel described below occupies the visual left of the compact hero.


### Shared breadcrumbs — October 21, 2026

Catalogue, public group details and the Python design fixture use the shared
`Breadcrumb` component. Each trail starts with «صفحه‌ی نخست», uses the same
RTL chevron separators, wrapping, link colors and keyboard focus style, and
marks its final item as the current page. Category catalogue trails include
the selected category; group trails link through the catalogue and category.

The hero action «دیدن مجموعه دوره‌ها» uses a native `#groups` anchor so it
scrolls to the homepage group section, including when the hash is already present.


### Mobile provider wheel — October 21, 2026

At 700px and below, the hero shows a vertical wheel of the five bundled provider
logos and their names (to the visual left of each logo) in the visual left column. Logos enter from above, grow at the center and
shrink toward the bottom over an 18-second cycle. The wheel has no visible motion control, at the owner’s request.
Reduced-motion mode displays all five as a still column. Below 420px, description and action span the full width below
the heading/wheel row. The desktop marquee and featured group shelf are preserved.

The horizontal hero provider strip continues animating on hover, at the owner’s
request. Reduced-motion preferences still show a static set.

### Individual courses and group-first discovery — October 21, 2026

Homepage primary search now opens `/groups?q=...` (empty search opens `/groups`).
The real featured-group hero and category links retain their behavior. After group
discovery, `#courses` shows at most three recently accepted eligible courses with
direct provider links and scoped retry; no course filters, global count or pagination.
«مشاهده همه دوره‌ها» and public «همه دوره‌ها» navigation open `/courses`.
The group catalogue's no-groups fallback also opens the course catalogue.

`/courses` server-renders eighteen retained course cards per page with normalized
title/provider/instructor search and single-choice provider, pricing-status and
content-duration filters. No category or level control is exposed. The committed
`q`, `provider`, `priceStatus`, `duration` and one-based `page` live in the URL;
refresh and Back/Forward restore them. Search/filter changes and individual chip
removal return to page one and preserve other conditions. Clear-all opens
`/courses`; out-of-range positive pages redirect to the last matching page.
Unsupported recognized selections produce a safe invalid state. Unrelated query
fields, including category/level, are ignored and never forwarded to the API.

Duration uses exact content minutes: less than 180, 180 to less than 600, or at
least 600. Missing durations remain included only when duration is unrestricted.
Pricing uses the card's selected summary; free, paid, subscription and unknown
stay distinct. No filtering of only the loaded page, guessed source facts or
quality/relevance ranking is introduced. Existing cards preserve instructors and price-date tooltips. Titles and «مشاهده دوره»
open the exact retained provider URL in a new tab with safe opener behavior and an
accessible notice; the retired local detail modal and its fetch are removed. Separate
loading, empty, no-match and retry states never substitute fixture courses.

Desktop controls use the right sidebar; mobile opens «فیلتر دوره‌ها», contains
keyboard focus, closes with Escape/selection, and returns focus to its trigger.
New filter controls have a local-state, backend-independent `/design-system`
example. Public UI uses the existing tokens/Vazirmatn and Persian RTL conventions.

October 21, 2026 — Owner follow-up: public course titles and «مشاهده دوره»
open the course's retained provider page directly in a new tab. The early-stage
local details dialog has been removed from public course browsing; price-date
tooltips remain. Public course detail APIs and independent design-system fixture
previews retain their separate contracts.

October 21 catalogue polish: the course results keep a compact count without a
second visible heading repeating the page title. The result section retains an
accessible heading. Both course and group catalogue search inputs explicitly use
RTL direction, keeping empty Persian placeholders aligned at inline start.

October 21 follow-up: the owner restored the compact visible course result count.
The duplicate result heading remains screen-reader-only; mobile filters and active-
selection chips remain visible.
