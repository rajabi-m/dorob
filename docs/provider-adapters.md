# Provider adapters

Four standalone adapters are implemented in `apps/utils`: Maktabkhooneh, TopLearn, Sabzlearn, and Roocket. All emit the [version-2 course contract](course-data-format.md). They remain owner-authorized ingestion groundwork; production backend integration and scheduling belong to phase 3. Use [the utility README](../apps/utils/README.md) for commands and the local dashboard. Historical implementation instructions below record the original version-1 work; current output is version 2. See [current validation](validation.md).

## Provider selection and implementation groundwork

The owner explicitly authorized three parallel agents to add standalone provider adapters modeled on the Maktabkhooneh utility. This is a bounded extension of ingestion groundwork, not activation of phase 3 or frontend integration.

### Provider selection

- TopLearn: programming/web courses, free and paid offerings, overlap with existing comparison topics. https://toplearn.com/
- Sabzlearn: programming/web courses with overlapping comparison topics; inspect consistency across course pages before implementing. https://sabzlearn.ir/
- Roocket: programming/web courses overlapping MVP comparison topics. https://roocket.ir/

These are an editorial MVP shortlist based on the providers' public catalogs, not a market-share ranking. Check each provider's current robots rules and public-page availability before collection.

Quera is excluded at the owner's request because its varying course landing pages are unsuitable for the desired initial adapter workflow. Existing frontend samples are outside this task.

Faradars was assessed and deferred: fetched course-detail pages exposed client-rendered shells rather than extractable course facts; its published product sitemap covered public `/videos/` entries and robots disallowed `/product/`. A partial video-only feed would not meet the intended full-course adapter scope. Browser rendering or a verified permitted course feed can be evaluated later.

### Shared agent instructions

Read AGENTS.md, Plan.md, apps/utils/README.md, docs/course-data-format.md, and the existing Maktabkhooneh scraper/CLI/tests. Preserve other contributors' uncommitted changes. No commits, branches, pushes, frontend edits, dependencies, credentials, scheduling, or database integration.

Each agent owns only its provider scraper, CLI, fixtures, tests, and provider documentation. Root owns shared utilities/contracts, package exports/scripts, and top-level documentation. Use the shared public-provider transport and course contract; report needed changes rather than editing shared files.

1. Inspect robots, sitemap/catalog, and several actual public course pages. Prefer embedded JSON or explicit labeled HTML. Do not guess undocumented API endpoints or execute source scripts. No access-control bypasses; pause on 401/403 and respect robots and Retry-After.
2. Implement pure parseCoursePage and canonicalCourseUrl functions plus a provider scraper exposing initialize, discoverCourses, fetchCoursePage, scrapeCourse, and streaming scrapeCourses. Use shared transport with bounded sequential requests, timeout/size limits, retries, cancellation, strict HTTPS host validation, and safe redirects.
3. Return the complete version-1 course shape in docs/course-data-format.md. Unknown fields are null; free requires explicit evidence; preserve source currency and separate duration meanings. Keep source facts, field provenance, warnings, deterministic fact hashes, and derived:null. Reject identity/layout drift rather than fabricate records.
4. Provide a CLI with explicit URLs, limited/default collection, full catalog where supported, atomic JSON checkpoints, resumable runs, and failure exit status. Default outputs go in ignored apps/utils/output. Reuse the shared export CLI if available.
5. Save reduced, attributed public-page fixtures excluding reviews/identities/media. Test real-page facts, unknown/free/discount cases, drift, canonical URLs, discovery, access denial, and CLI partial/resume behavior. Synthetic cases must be labeled. Perform a small live discovery/detail smoke check, never a full catalog scrape during implementation.
6. Document field mappings, verified price units, public source URLs/date, discovery limitations, usage/backend import examples, and actual validation results. If access prevents a live check, state it clearly and do not claim live success.

### Acceptance and integration review

Root reviews all three adapters, common contract compliance, provenance and price semantics, safe request behavior, exports, CLI help, and offline tests. Run workspace lint, type checking, utility tests, and production build; record any environment/runtime blockers. Keep the frontend fixture and existing Maktabkhooneh output unchanged. Catalog coverage and ongoing suitability require further sampling before production deployment.

## Maktabkhooneh

The scraper downloads public course pages and exports their information to JSON. It runs manually for now; automatic refreshes will be added in the backend.

Parser version **3.1.1** emits the same complete [golden course structure](course-data-format.md) as the other three adapters. Course IDs are now `maktabkhooneh:<courseDetails.id>`; the old `mk` slug identifier remains in `raw.slugId`. Covers use `image: {url, alt}`, provider labels use `providerLevel`/`providerStatus`, and source metadata includes `parser`, `parserVersion`, `warnings`, and the shared fact hash. All required nullable fields and `derived: null` are present. Offers have stable IDs, original source price evidence and explicit free status. The current public `type=MAKTAB` identifies free enrollment, alongside legacy `type=FREE`; a numeric zero without either type remains an unknown normalized price. The provider-linked LPIC-1 URL is now `/course/آموزش-رایگان-آزمون-lpic1-1555-mk711/`; its former slug returns HTTP 500. Type mapping was verified against the provider’s public course template and Chrome’s free enrollment display on October 10, 2026.

Chapter/lesson IDs are strings. Provider lesson labels remain in `providerType`; unverified labels such as `lecture` map to `unknown`. Chapter and lesson effort labels remain under `raw.syllabusEffort` and never become video duration. Missing instructor/lesson lists remain null. Rating counts come from `rating_count`, not substituted review totals; ambiguous provider update dates stay raw. Signed cover expiry parameters do not change the fact hash.

The CLI now uses the shared validated export/checkpoint implementation. **Version-1 exports cannot be resumed.** Run again without `--resume`, preferably with a new `--output` path to preserve an old file. Failed old-checkpoint validation does not overwrite it. No existing export, frontend fixture, or database was migrated.

### Version 2 educational evidence and reviews

The adapter now emits schema version 2: chapter/lesson descriptions when published, explicit `learning_goals`, selected `course_features`, and practice/assessment/support claims matched by their published feature titles. These remain provider claims; course-level feature descriptions do not imply every offer includes mentoring or grading. Audience, technologies and offer-specific access/support stay null when no explicit evidence is available.

Public Nuxt `courseReviews` supply anonymous text, individual five-point ratings, original date evidence and exact field locators. Author objects, profile details and `review_reply` are excluded. Known author names/handles and detectable contact details inside feedback are redacted before retention; IDs hash anonymous content/date/rating. Verified enrollment remains unknown. `confirmed_review_count` counts text reviews; `overall_count` includes rating-only feedback and is never substituted for the review total or aggregate rating votes. Standard course-associated JSON-LD reviews are supported as a fallback; unrelated reviews and replies are excluded.

Initial collection reads the course page's embedded review sample only. A published `courseReviewsNext` marks more feedback available, without requesting guessed endpoints or claiming full coverage. Missing bodies remain null; a published confirmed zero yields an empty list. Conflicting counts stay selected raw evidence with a warning. Syllabus coverage records extracted/published counts but remains unknown even when counts match until full-list traversal semantics are verified.

### Collection flow

1. **Check access rules.** Read `robots.txt` to find the sitemap and avoid disallowed URLs.
2. **Find courses.** Read the course sitemaps and collect unique course URLs. A sitemap is the provider’s published list of pages, so discovery does not need search pages.
3. **Download pages.** Fetch each course’s HTML with a normal HTTP request. No browser or login is needed for the current page format.
4. **Parse embedded data.** Find the `__NUXT_DATA__` JSON inside the HTML and decode its indexed references into ordinary objects. Read course facts from `courseDetails` and chapters/lessons from `chapterData`. Page scripts are never executed.
5. **Validate and export.** Extract titles, descriptions, prerequisites, instructors, levels, images, prices, durations, ratings, and syllabi. Add source links and check timestamps, then save each successful course to the JSON file.

Full-course and content-only offers stay separate. Disabled zero-price offers do not mean free access. Video duration and estimated study effort also stay separate; missing information remains unknown.

### Failures and progress

Requests run sequentially, with a default 1.5-second gap or a longer provider crawl delay. Temporary failures retry up to three times; access denial stops collection. Invalid pages are recorded as errors rather than saved as valid courses.

The CLI saves progress after every result. `--resume` skips courses already saved in the same export; omit it when refreshing their data. The output contains courses, errors, and whether the selected run completed. A limited run is not a full-catalog export.

### Run it

From the repository root:

```sh
bun run scrape:maktabkhooneh --limit 10
bun run scrape:maktabkhooneh --all
bun run scrape:maktabkhooneh --all --resume
```

Default output: `apps/utils/output/maktabkhooneh.json` (ignored by Git).

The reusable logic lives in [the scraper module](../apps/utils/scrapers/maktabkhooneh.ts); [the CLI](../apps/utils/scrape-maktabkhooneh.ts) handles arguments and file saving. See [utility usage](../apps/utils/README.md) for backend methods and more options.

Validation (October 3, 2026): 15 adapter tests pass, covering retained anonymous public Nuxt review evidence, synthetic privacy/deduplication/classification cases, null versus empty, coverage, provenance and fact-hash changes. Utility lint passes. Final integration: all 62 utility tests and workspace lint/type checking pass.

A bounded live check read robots and one public Python course, following its disclosed same-provider canonical redirect. The page exposed six text reviews, 6,175 confirmed text reviews in total, four learning goals and 19 chapters. A reduced fixture retains educational facts and anonymous review text; no reviewer objects, identities, avatars or replies were saved. Review pagination and the full catalog were not collected. An initial course request returned HTTP 502; the subsequent disclosed redirect succeeded.

### Missing-field audit — October 3, 2026

The bounded dashboard sample exposed published `content_hours` and `required_hours` as both numbers and `H:MM` strings. Version 3.1.0 reads both (including Persian digits), validates minute ranges and keeps content minutes separate from effort hours. It does not substitute rounded `video_hours` or chapter/lesson effort labels. The observed animation course publishes `1:35` and now yields 95 content minutes instead of unknown.

Published `categories.title` / parent chains now populate root-to-leaf provider categories. An explicit «دوبله فارسی» or «زبان فارسی» course feature establishes `language: "fa"`; Persian interface/title text alone does not. Unknown language/format and offer-specific certificate/support/access semantics remain unknown rather than interpreting numeric access codes. Existing anonymous public review samples and partial coverage remain unchanged.

Audit validation: 17 Maktabkhooneh tests plus 11 Sabzlearn tests, utility lint and type checking pass. No full-catalog crawl or commit.

## TopLearn

`apps/utils/scrapers/toplearn.ts` provides server-side `ToplearnScraper`, `canonicalCourseUrl`, and pure `parseCoursePage`. Parser **2.1.0** emits the [golden version-2 format](course-data-format.md), including unknown fields, provenance, fact hash and `derived: null`. Frontend fixtures remain separate.

### Usage

From the repository root:

```sh
bun run apps/utils/scrape-toplearn.ts --url https://toplearn.com/c/6274
bun run apps/utils/scrape-toplearn.ts --limit 10 --output apps/utils/output/toplearn-v2.json
```

`--all` selects the discovered catalog; `--resume` reuses compatible successful checkpoints. Version-1 exports need a new output path without resume. Full discovery proves coverage of the advertised course sitemap only. The shared transport enforces same-origin HTTPS, robots, sequential bounded requests, retries, cancellation, and denial stops. No authentication or browser bypass is used.

### Mapping

| Data | Public source |
| --- | --- |
| Identity, title, source URL | Numeric internal `input#CourseId`, `course-page-header h1`, canonical course link; legacy shortlinks verified against fetched canonical response and ID-bearing `og:url` |
| Description, prerequisites | `course-content-text`, explicit prerequisite heading/list |
| Audience, outcomes, practice/assessment/support | Explicit named educational headings only; otherwise null |
| Cover, instructor, categories | Course article image, `مدرس دوره`, header category breadcrumbs |
| Level/status, ongoing | Published labels; only recognized completion states normalize `ongoing` |
| Offers | `.course-price`, `.price-amount`, struck-through amount, explicit free label |
| Duration/count/format | Video duration HH:MM:SS and published video count |
| Syllabus | Ordered `Ep_*` entries, heading, time and `.video-description-layer` |
| Syllabus coverage | Public list traversal, published count and paging/loading controls |
| Reviews, aggregate ratings | Explicit `Course.review` JSON-LD reviews, `aggregateRating` with explicit scale/count, if present |

Prices on inspected paid pages explicitly display تومان in both course purchase panels while generic Open Graph metadata declares IRR. Matching purchase panels determine normalized toman amounts and paid status; original displayed amounts and generic metadata remain in source evidence with a discrepancy warning. Missing units/amounts or disagreement between purchase panels keep normalized amounts unknown. Explicit free access remains zero. An explicit members-only label with the course purchase link to `BecomeVip` identifies subscription access; no standalone course price or plan amount is invented. Unknown certificate, offer access/support, technologies, language, availability, student count and updates are not inferred.

The flat video list becomes one section with null chapter description. Complete coverage requires traversing the inspected fully rendered list, no paging controls, and a consistent published count. Missing/unrecognized lists are unknown; count mismatches are partial. Lesson descriptions retain published text, even when they repeat the title.

### Feedback and privacy

On October 3, 2026, the public N8N page (`https://toplearn.com/c/6274`) had an empty dynamically populated `CommentList` and a hidden comment-loading control. The page-disclosed `site.SingleCourse.min.js` calls `/courses/{CourseId}/Comments?pageId=1` initially and `/courses/{CourseId}/Comments` from `GetComments`. Direct public inspection of the initial route for internal IDs 6274 and 37, the alternative route for 6274, and the initial route with the normal AJAX header all returned the provider's branded 404 document (`404.css`), with no `CommentPageState` or comment records. This is **unknown feedback**, not zero reviews. No replacement endpoint is guessed; the adapter continues to read embedded feedback only until the public comments route supplies verifiable data. General discussions must remain source-labeled comments rather than student reviews, with known questions, replies and staff entries excluded if this route becomes usable.

If public JSON-LD supplies reviews explicitly attached to the matching Course, the adapter retains anonymous text, individual rating only with explicit scale, original date text, UTC timestamps only with explicit timezone, and course/source locator. Source author names/alternate names and detectable contact information are redacted before export. Author objects, profiles and raw review objects are never retained. Questions, replies, and reviews explicitly referring to another course are omitted. Anonymous content hashes deduplicate repeated items.

Embedded ordering is recorded as a public-page sample. Equal total/sample counts alone do not establish full collection. Only an explicit empty array plus published review total zero confirms an empty complete collection. Missing sections/candidates remain null; source counts, omitted count and stop reason explain limits. Ratings vote counts stay distinct from review counts.

### Verification and limits

Thirteen offline tests cover four reduced real pages, v2 field presence, live lesson-description evidence, syllabus unknown/partial/complete states, explicit educational labels, synthetic review classification/redaction/deduplication, multi-author/duplicate Course nodes, ratings versus reviews, coverage hashes, identity/currency safeguards, conflicting purchase panels, verified numeric legacy shortlinks, bounded transport and CLI resume. Synthetic feedback uses fictional identities only; reduced fixtures contain no student identities or feedback.

October 2 discovery smoke checks found 1,242 sitemap URLs and successfully read N8N, Xamarin installation and Kotlin/WhatsApp detail pages. October 3 bounded N8N public HTML inspection confirmed lesson descriptions and the dynamic feedback limitation; no full catalog was collected. The small non-executing HTML reader depends on inspected markup. The disclosed public feedback route currently returns branded 404 markup; wider provider templates remain unverified; schema completeness does not imply all nullable data is obtainable.


October 3 repair: the sample Xamarin course has internal ID 37 but canonical legacy shortlink `/c/41`. Both the sitemap detail page and a separately fetched shortlink publish internal ID 37, the same title, canonical URL, and ID-bearing `og:url`. The adapter validates this tuple before accepting the alias; a mismatched internal ID, title, canonical or OG identity still fails. Pure parsing without separately supplied canonical evidence remains strict.

## Sabzlearn

`apps/utils/scrapers/sabzlearn.ts` emits the [version-2 golden contract](course-data-format.md), parser `2.1.0`. It decodes public Nuxt data without executing scripts; no frontend integration, private endpoints, or media downloads.

### Extraction

| Facts | Public evidence |
| --- | --- |
| Identity/display | Matching `data.course-<slug>.id/slug/title`, thumbnail, teacher name, category |
| Content | `full_content` / `description`, `course_prerequisites` |
| Educational evidence | Explicit full-content headings for outcome lists, audience, projects; course-support FAQ answers |
| Price/access | `is_free`, sale status, numeric prices verified against rendered purchase currency; `course_watch_type` |
| Syllabus | Ordered chapters/episodes, optional descriptions, mm:ss video durations, published chapter counts |
| State | Student count, explicit sale/completion status; selected original Jalali update date |
| Feedback | Embedded `courses-<slug>-comments.items` top-level comments, separately labeled `sourceType: "comment"` |

Missing labels remain null. No inferred technology versions, level, learning outcomes, assessment terms, or offer-specific support promises. Outcome extraction requires a list under an explicit outcomes heading. Global support statements remain course-level. Paid currency must match the current amount inside the purchase row; unrelated prose/navigation prices are ignored. Verified rial divides by ten; missing/conflicting units keep paid normalized amounts null. Zero without explicit free evidence is unknown. Disabled offers are excluded.

Syllabus coverage is partial when published chapter counts differ from embedded episode lists, otherwise unknown: matching counts alone do not prove full traversal. Reduced fixtures retain only selected chapters/episodes and their reduced counts. Aggregate rating stays null because its scale/vote count are unverified; comment counts are never rating counts.

### Anonymous feedback

Observed top-level comments self-reference `reply_id === id`; nested replies point to the root. The adapter retains eligible root comments, excludes staff/replies and explicit question markers, strips author names/handles/contact details, and deduplicates. This conservative question filter can omit rhetorical criticism; its limitations and omitted count are recorded. «دانشجو» is a platform role, not verified enrollment in this course. Jalali comment dates remain original text. No identities, profiles, avatars, replies, or entire comment objects are retained.

Only the embedded page is collected. Source order is preserved; pinned/selection policy is unknown. `has_more_pages` records partial coverage. Pagination totals describe mixed comments/replies and remain excluded from `publishedCount`. All candidates excluded means unknown items, not a claim of no feedback. Explicit zero/empty pagination can establish an empty source. Standards-based, course-attached JSON-LD `Review` records are supported separately with `sourceType: "review"`; the inspected Python page had none. Mismatched-course records and replies are excluded.

### Access, run, validation

Robots inspected October 3, 2026 allow public course pages and advertise the sitemap; account, lesson, lab, and admin paths are excluded. Discovery traverses course maps only. The October 2 discovery smoke check found 89 published URLs; this is sitemap coverage, not proof every course is indexed. Existing sequential transport enforces robots, delay, timeouts, bounded retries/size, cancellation, and 401/403 stops.

```sh
bun apps/utils/scrape-sabzlearn.ts --url 'https://sabzlearn.ir/course/python/' --output apps/utils/output/sabzlearn-v2.json
bun apps/utils/scrape-sabzlearn.ts --limit 2
bun apps/utils/scrape-sabzlearn.ts --help
```

Version-1 outputs require a fresh export to a new path, without resume. The shared CLI defaults to ten courses and an ignored output; `--all` means published sitemap URLs. Import `SabzlearnScraper` from `@dorob/utils/sabzlearn` for later ingestion.

October 3 bounded public Python smoke check: ID `25`, 246 published/extracted lessons (coverage unknown), explicit audience/project/support evidence, and four anonymous top-level comments retained from 12 embedded candidates; eight excluded, more pages available, total scope unknown. No full-catalog collection or comment endpoint requests. Live HTML was inspected in memory; feedback/identities were not saved as fixtures or logged. Initial sandbox DNS failure required an authorized network retry.

Ten offline tests cover three reduced public fixtures, synthetic educational claims/descriptions, privacy/redaction, review classification and course identity, comment/reply/question filtering, partial coverage, hashes, conservative prices, URL/layout drift, discovery/access denial, and CLI repair/resume. Provider tests and scoped lint pass; final integration also passes all 62 utility tests and workspace lint/type checking. Wider sampling and access-term review remain necessary before scheduled production collection.

### Missing-field audit — October 3, 2026

Version 2.1.0 also retains explicit FAQ outcome answers when an outcome heading/list is absent. The answer remains provider prose in one outcome entry; the scraper does not invent individual skills or split claims. Explicit course-video access questions/answers join the single full-course offer's published watch type, with exact FAQ provenance. The offer's support description remains unknown; general course support stays course-level.

A FAQ explicitly describing educational videos available at the learner's chosen time establishes `format: "recorded-video"`. An «آنلاین» watch type alone does not distinguish live from recorded delivery. Language, rating scale/votes, technology versions and Jalali timestamp normalization remain unknown without sufficient evidence. Existing anonymous comments preserve their unverified source type and partial sampling coverage.

Audit validation: 11 Sabzlearn tests plus 17 Maktabkhooneh tests, utility lint and type checking pass. No full-catalog crawl or commit.

## Roocket

Emits the version-2 [golden contract](course-data-format.md), parser `2.1.0`, with provider facts and `derived: null`. This owner-authorized utility groundwork stays separate from frontend fixtures and production ingestion.

### Public extraction

Public `/series/` pages are allowed by [robots](https://roocket.ir/robots.txt). Discovery traverses the course sitemap, excluding editorial/episode maps. The October 2 sample contained 106 URLs; `fullCatalog` means successful collection of the discovered sitemap catalog, not proof every offering is listed.

Course pages embed React Server Components inside `self.__next_f.push`. The parser decodes JSON without evaluating JavaScript, resolves referenced UTF-8 body text, and validates course ID/slug/URL. It collects:

- Title, description/body, cover, instructor name, state, update date, student count and aggregate rating.
- Sections and ordered video lessons, optional published descriptions, content duration and lesson counts. Flat lists use the course title as a container with a warning.
- Explicit body headings for prerequisites, audience, learning-outcome lists and practice/assessment/support prose. Marketing descriptions are not inferred outcomes, level or technologies.
- Anonymous course-scoped JSON-LD `Review` items if published: text, explicit individual rating/scale, dates and evidence locators. Known author names and contact details are redacted before output; duplicates and explicit questions/non-review objects are omitted.

Syllabus coverage is partial on missing section lists or count mismatches; otherwise unknown until full-list/pagination completeness is independently established. Matching counts alone are insufficient. Review collection records page-only selection, omissions and unknown completeness; aggregate rating votes and mixed comment counts never become review totals.

#### Public comments and prices — October 3 repair

The course page links `/_next/static/chunks/043xf1z0w1ahm.js`; its `fetchSeriesComments` implementation publicly discloses the API base `https://api.roocket.ir/api/v1` and GET `/series/{slug}/comments?page=1`. Unauthenticated collection succeeds at the canonical trailing-slash URL `/api/v1/series/{slug}/comments/?page=1`. A separate same-origin client enforces the same bounds, robots rules, redirects, retries and denial stops. The API's `/robots.txt` returns HTTP 404; shared transport treats unavailable 404 robots as no published rules, while 401/403 still stop collection. No cookies, credentials, subscription/reply endpoints or private routes are used.

Only the first public comment page is read. `data.comments[].body_html` becomes anonymous `sourceType: "comment"`, not a verified student review. Explicit top-level `parent_id=0` is required; replies, known instructor/staff, duplicates and question-mark-bearing text are excluded. This conservative question filter can omit rhetorical feedback and is documented in collection selection/warnings. Published relative date text is preserved without inventing an absolute timestamp. Individual ratings and verified enrollment stay null. Author/profile fields and replies are never exported; known names/usernames (including loaded replies) and contact details are used only for redaction. `data.meta` establishes pages/has-more; its mixed thread total is never a review count. Omitted items keep coverage partial even when no more pages exist. Ordinary API failures retain course facts with a precise warning; denial stops the provider. Successful collection records `public-html-and-public-api` and endpoint/field provenance.

Paid RSC amounts are resolved only when a same-course JSON-LD `Course` Offer explicitly publishes `priceCurrency: "IRR"` and its price equals the RSC original price × 10. For the audited Laravel projects page, JSON-LD original `49000000` IRR matches RSC `4900000`, proving the displayed RSC amounts use toman; discounted RSC `2450000` is therefore retained as 2,450,000 toman. Missing, contradictory or unmatched course currency evidence leaves normalized prices null. A private-class advertisement never establishes course currency. Free still requires both explicit free flag/type and no positive-price conflict. Inactive offers are excluded; coming-soon eligibility remains unknown. Account-specific certificate/cart flags are ignored.

Technologies, language, categories, level and offer support/access terms remain null when not explicitly published. Structured educational evidence comes only from labeled body headings, not inferred marketing statements.

### Usage

```sh
bun run scrape:roocket --limit 2
bun run scrape:roocket --url 'https://roocket.ir/series/learn-python/'
bun run scrape:roocket --help
```

The shared CLI supports `--all`, `--output` and checkpoint `--resume`. Version-1 checkpoints require a fresh export to a new output path. Default sampling selects ten courses; no full-catalog run is needed for development. Transport respects robots, sequential spacing, bounded requests/retries and access-denial stops. Backend exports expose `RoocketScraper` and pure parsing helpers; never import the utility into frontend code.

### Validation and remaining work

Reduced public fixtures preserve free Python/paid Laravel facts, explicit educational headings and UTF-8 RSC body references. New October 3 fixtures retain the actual course-scoped JSON-LD price proof and two anonymized public Laravel comments with first-page metadata; identity/contact/profile data are excluded. Additional cases are explicitly synthetic.

All **18 Roocket tests**, utility lint and type checking pass, covering currency matching/mismatch, v2 fields, anonymous feedback classification/redaction/deduplication, partial coverage, evidence hashing, bounded API transport, robots/denial and checkpoint resume. A bounded live ten-course run exported **10 courses, zero errors, seven paid prices, three explicit free offers and 34 anonymous comments**. All ten courses contain feedback; three have further comment pages. No full-catalog crawl was performed. Source labels, optional missing fields and conservative question filtering still need broader provider-template sampling before production.

## Native v3 collection template

`@dorob/utils/base` exports the server-only abstract `BaseScraper`,
`BaseScraperOptions` and `CollectionResult`. It owns robots initialization,
serialized controlled requests, bounded sitemap discovery (100 maps by default),
canonical deduplication, cancellation and API v3 validation. Discovery defaults
to ten selections; pass `Infinity` only for an explicitly selected full traversal.
Read `discoveryIsComplete` and `discoveryWarnings`; partial traversal retains
available selections and does not establish full provider coverage.

A subclass supplies `providerId`, `extractorVersion`, `canonicalCourseUrl`,
`courseKey`, `relevantSitemap`, and the pure `extract(body, url, checkedAt, id)`
hook. See the executable, typechecked [fixture subclass](../apps/utils/tests/base.test.ts).
Use protected `request` for the main origin or `originClient` for explicitly
configured additional HTTPS origins. Each client has its own robots and spacing;
parsers receive fetched bodies instead of unrestricted network functions.
Inject `fetch`, `sleep`, `clock`, `now`, `id` and `signal` for deterministic tests.
The stream returns `{ sourceUrl, observation, error }`; fresh successful
collection gets a fresh ID. Access denial and cancellation stop the stream.
This abstraction performs no backend writes. Keep it out of browser imports;
`packages/core` remains dependency-free source contracts.


## Maktabkhooneh programmatic v3 migration

`MaktabkhoonehScraper` from `@dorob/utils/maktabkhooneh` now extends
`BaseScraper`: `scrapeCourse(url)` returns `CourseIngestion` v3 and
`scrapeCourses(urls)` yields `{ sourceUrl, observation, error }`.
Native observations have fresh submission IDs, canonical provider identity and
section coverage from embedded source inspection. Pricing/cover/description
can be evidenced complete; educational/curriculum/feedback sections retain
partial or unknown coverage. Invalid optional curriculum records a failed
section; invalid required identity or pricing fails collection. Anonymous
feedback remains a bounded page sample.

`LegacyMaktabkhoonehScraper` is the explicit v2 compatibility adapter over
the same parser and controlled transport. `bun run scrape:maktabkhooneh --help`
and its existing URL/limit/all/output/resume workflow stay export-only,
without backend requests. Saved-v2 conversion still uses
`bun run convert:courses --input SAVED_V2.json --output NEW_V3.json`, with
unknown coverage and deterministic IDs for replay. Aggregation/dashboard and
TopLearn, Sabzlearn and Roocket remain v2. Do not pass worker journals as v2
export checkpoints.
