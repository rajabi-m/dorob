# Provider snapshots and collection provenance

These are dated, browser-safe fixtures for the completed phase 2 milestone, separate from the scraper contract. Public pages use the retained API catalogue and judgments. The maintained design-system cards use selected records from the 18-course provider fixture. The retired eight-course Python prototype and its separate JSON fixture were removed by the [frontend refactor](frontend-refactor.md). Most design-system samples remain fictional. Collection checks below are historical, not fresh provider verification.

## Snapshot fields and source assets

`apps/web/src/data/provider-courses.json` contains 18 real course samples: six each from [Maktabkhooneh](https://maktabkhooneh.org/), [TopLearn](https://toplearn.com/), and [Quera College](https://quera.org/college). Collected on October 1, 2026 from public listings and course-page HTML, including embedded page data. This is a one-time fixture for phase 2, with no runtime collection, refresh job, or live integration. Independent design-system cards consume this snapshot through the explicit `provider-homepage-data.ts` fixture adapter; public routes do not import it. Most design-system examples remain fictional.

Import the JSON when needed:

```ts
import snapshot from "@/data/provider-courses.json";

const courses = snapshot.courses;
const python = courses.find((course) => course.id === "quera-12547");
```

### Field conventions

- `providers`: provider IDs, Persian names, and website URLs.
- `courses`: stable IDs, Persian titles, provider IDs, course source URLs, actual cover image URLs and alt text, provider level labels, instructor names and roles, prices, duration, and available counts and ratings.
- `price.amount` and `originalAmount`: numeric **toman** amounts. Zero means explicitly free; null means unavailable. `originalAmount` is null when no distinct original price is supplied. Maktabkhooneh's `offerType` identifies the full/content offer displayed on its listing; other offers are omitted.
- `duration.contentMinutes`: provider content duration; `effortHours`: total study effort, including project work where specified; `completionWindowDays`: Quera's supplied completion window. These are different measurements. Null means unavailable; Quera's zero source window is kept as a note rather than represented as zero-day course length.
- `level`, `instructors[].role`, and `status`: provider labels, without inferred level equivalence. Quera's course team includes designers and coaches, whose roles are preserved.
- `rating`: provider rating, scale, and rating count when available. It does not invent ratings for other providers.
- `features`: Quera's published feature labels and values, such as `105+` exercises, kept as strings rather than exact counts.
- `summary`: a short **AI-derived paraphrase** of source content, labeled `ai-derived-source-summary`; it is not a provider quotation or an independent quality assessment.
- `source`: listing URL, collection timestamp, field provenance, image verification status, and provider-specific interpretation notes. TopLearn IDs use a hash of the source URL; the other providers use the course identifier from their URL.

Display the dataset's Persian sample label and the collection date when using these fixtures. Label summaries as AI-derived. Do not present snapshot prices or enrollment counts as live information. Missing values should display as unavailable.

### Limitations and verification

All 18 selected course pages were fetched successfully. All 18 image URLs returned HTTP 200; TopLearn and Quera supplied image content types, and Maktabkhooneh's generic CDN content type was additionally checked against WebP file signatures. The fixture stores remote image links, not image files. Signed CDN parameters are retained because removing them could break URLs; URLs can expire or change, so consumers should provide a missing-image fallback.

Prices were checked against visible listing or course-page amounts. Quera's JSON-LD incorrectly labels the same displayed toman amounts as `IRR`; the fixture follows the visible toman label, with the discrepancy recorded per course. TopLearn courses still in progress report the currently published lesson count and duration. The sample covers Python, HTML/CSS, n8n, AI agents, Git, Excel, networking, and secure coding; it is not an exhaustive catalog or an assertion that courses are equivalent.

JSON parsing, required fields, unique IDs/source URLs, provider counts, HTTPS URLs, price consistency, and duration values were checked. No application code or dependency files changed, so application lint, type checks, and build were not run for this data-only addition.


### Thumbnail measurement and provider marks — October 1, 2026

Downloaded the 18 exact cover URLs in this snapshot and inspected intrinsic pixel dimensions with macOS `sips`. These are observations of the selected fixtures, not claims about every image on each provider.

| Provider | Dimensions | Count | Width/height |
| --- | --- | --- | --- |
| Maktabkhooneh | 267 × 150 | 6 | 1.780 |
| Quera | 380 × 217 | 6 | 1.751 |
| TopLearn | 400 × 286 | 4 | 1.399 |
| TopLearn | 1517 × 1037 | 2 | 1.463 |

Twelve of 18 images are close to 16:9 (1.778); none are exactly 16:10 (1.600). The new card uses a uniform 16:9 frame with `object-fit: contain` to avoid cropping source artwork. Maktabkhooneh's supplied covers are small and can soften at larger display sizes.

Provider marks are local, unmodified copies of assets linked by the official sites. They identify source attribution and are not Dorob branding.

- [Maktabkhooneh mark](https://statics.maktabkhooneh.org/front/images/maktabkhooneh/new-logo-mobile.svg) → `apps/web/public/providers/maktabkhooneh.svg`
- [TopLearn mark](https://toplearn.com/Site/images/logo.svg?v=2) → `apps/web/public/providers/toplearn.svg`
- [Quera mark](https://quera.org/static/images/logo/logo-q.svg) → `apps/web/public/providers/quera.svg`
- [Sabzlearn mark](https://sabzlearn.ir/logo.svg) → `apps/web/public/providers/sabzlearn.svg` (public homepage header; October 12, 2026)
- [Roocket mark](https://roocket.ir/img/logo-mark.svg) → `apps/web/public/providers/roocket.svg` (public homepage header; October 12, 2026)

Provider names remain visible if a logo fails. Remote course covers fall back to decorative artwork. The design-system examples use the same component as the homepage; snapshot dates and AI-summary labels remain visible.

## Collection report — October 1, 2026

### Result and scope

On October 1, 2026, I collected a one-time sample of public course information from Maktabkhooneh, TopLearn, and Quera College for Dorob's phase 2 mock data. The result is [provider-courses.json](../apps/web/src/data/provider-courses.json): 18 courses, six per provider, including four explicitly free courses. The recorded snapshot timestamp is `2026-10-01T08:40:07Z`.

The sample contains course titles, provider IDs, source links, cover-image links, instructor names, provider level labels, prices, available duration information, and available ratings or counts. Each record includes field provenance and interpretation notes. Short summaries are AI-derived paraphrases and are labeled separately from provider facts.

The collection did not change the frontend's existing fictional fixtures or introduce a running scraper, backend service, scheduled refresh, or live integration.

### How I accessed the sources

I first read `Plan.md`, `README.md`, and the existing frontend fixtures to understand the active phase and data conventions. The existing course model did not include the provenance and duration distinctions needed for this snapshot, so I saved a separate JSON fixture rather than replacing those fixtures.

I used web search and opened the providers' public home/listing pages for initial discovery. Direct `curl` access initially failed with a DNS resolution error inside the sandbox. After an approved network-access escalation, the provider pages were accessible.

The user offered Firefox access during collection. Direct HTTP requests were already working, so Firefox was not used. No login, account credentials, browser cookies, or private provider endpoints were needed.

The listing pages were:

| Provider | Public listing |
| --- | --- |
| Maktabkhooneh | <https://maktabkhooneh.org/> |
| TopLearn | <https://toplearn.com/> |
| Quera College | <https://quera.org/college> |

I downloaded these HTML pages into temporary files under `/tmp`, following redirects and applying request timeouts. I then downloaded the 18 selected public course pages. Course-page requests ran in batches of up to three concurrent requests; this was a bounded collection, not a recursive catalog crawl.

For example, the listing download used this form:

```sh
curl -L --fail --silent --show-error --max-time 40 \
  'https://quera.org/college' -o /tmp/dorob-quera.html
```

### Selecting courses

I deliberately selected a small mix useful for course-discovery mockups, rather than attempting a representative ranking or complete provider catalog:

| Provider | Selected subjects |
| --- | --- |
| Maktabkhooneh | Python, n8n AI agents, Excel, machine learning with Python, Git/GitHub, HTML/CSS/JavaScript |
| TopLearn | Free Python, Python projects, free HTML/CSS, Tailwind 4, MikroTik networking, secure coding |
| Quera | Beginner Python, n8n, introductory programming, Agentic AI, HTML/CSS, Python design patterns |

This includes shared subjects across providers, plus free, paid, discounted, and ongoing offerings. Shared subjects do not imply equivalent syllabi or levels. Course names and URLs came from actual listing cards.

### Extraction methods

I wrote temporary Python scripts using the standard library: `html.parser.HTMLParser`, `json`, `re`, `urllib.parse`, and `pathlib`. No scraping package or project dependency was installed. The parser built a small HTML tree, traversed course cards, and excluded script/style text when reading visible labels.

#### Maktabkhooneh

The public listing supplied course links, cover images, titles, and displayed prices. Course details were available in the HTML's `__NUXT_DATA__` JSON script, even though the course body did not provide those details as ordinary rendered text in the downloaded response.

Nuxt stored its payload as an indexed array with references. I decoded those references, including reactive wrappers, then selected the `course-page-*` entry. Its `courseDetails` object supplied levels, teachers, content hours, required study hours, prices, rating averages, and student counts. `courseReviewsCount.overall_count` supplied the rating count; review text was not included in the fixture.

I matched the visible listing price against the `price` and `discounted_price` offer maps. The fixture retains the matching `FULL` or `CONTENT` offer as `price.offerType`; it does not treat a zero in an unused offer slot as proof that a course is free.

#### TopLearn

I located listing containers with the `course-col` class. Their course links and image `alt` attributes supplied URLs and titles. Cover URLs came from the image's `data-src`, because `src` initially pointed to `LazyLoad.png`.

The public course pages contained ordinary text labels for instructor, video count, duration, level, status, and price. I extracted values next to labels such as `مدرس دوره`, `تعداد ویدیوها`, `مدت زمان دوره`, `سطح دوره`, and `قیمت این دوره`.

Durations in `hours:minutes:seconds` format were converted to minutes. Explicit free labels became a zero price. Paid courses retained the current displayed price and a distinct original price when shown.

#### Quera College

Listing cards supplied course links, cover URLs, provider level badges, and visible prices. Detail-page data came from the `__NEXT_DATA__` JSON script at `props.pageProps.college`.

I extracted `price_info`, `days_to_finish`, `participants_count`, `landpage.teachers`, and `landpage.hero_features`. Teacher/team roles were retained from their tags, including designers and coaches. Feature values such as `105+` were preserved as strings rather than converted into exact counts.

Quera's JSON-LD offer labeled its currency `IRR`, while the visible listing displayed the same numeric amount in toman. I followed the visible toman label and checked the embedded price against it. The discrepancy is recorded in each Quera record's notes.

### Normalization and provenance

- Kept Persian titles, names, and provider level labels, including ZWNJ characters.
- Resolved relative course/image URLs against the provider website and percent-encoded non-ASCII URL characters. Existing signed image query parameters were preserved.
- Used `maktabkhooneh-mk…` and `quera-…` IDs from course identifiers in their URLs. TopLearn IDs use the first 12 hexadecimal characters of a SHA-256 hash of the source URL.
- Stored prices as numeric toman amounts. Zero means explicitly free; missing values remain `null`. A distinct original price is recorded only when supplied.
- Separated content duration, total study effort, and completion windows into `contentMinutes`, `effortHours`, and `completionWindowDays`. They must not be compared as interchangeable measurements.
- Quera's introductory-programming source had `days_to_finish: 0`. I recorded that in a note and used `null` for the normalized completion window, since it did not supply a positive window.
- Added the collection timestamp, listing URL, extraction method, field-source map, and provider-specific notes to every record.
- Added short source-grounded summaries with `kind: "ai-derived-source-summary"`. They are generated paraphrases, not scraped provider quotations or independent evaluations.
- Marked the dataset `isLive: false` and included a Persian label identifying it as sample data with non-live information and prices.

### Image verification

I requested all 18 cover URLs; every request returned HTTP 200. TopLearn and Quera returned image content types. Maktabkhooneh's CDN returned `application/octet-stream`, so I also downloaded its six covers to temporary files and checked the `RIFF`/`WEBP` file signatures. All six were valid WebP files.

The repository stores image URLs, not downloaded cover files. This verifies that the links served images at collection time; it does not guarantee future availability or successful rendering inside a future frontend implementation.

### Data checks and outcome

The final JSON passed checks for:

- Valid JSON and exactly 18 records, with six per provider.
- Unique course IDs and source URLs.
- Required titles, image alt text, instructors, provenance, and valid provider references.
- HTTPS course/image URLs without whitespace; course hosts matching their providers.
- Nonnegative prices, free-status consistency, and original prices greater than discounted prices when present.
- Positive supplied duration values, with missing or unspecified values represented as `null`.
- Correct summary labels and matching summary source URLs.
- Parseable collection timestamps and recorded successful image responses.

`git diff --check` also passed. Application lint, type checking, production build, and browser UI checks were not run for this addition because it changed only data and documentation, without wiring the fixture into application code. No commit was made.

### Files and reproducibility limits

The retained deliverables are:

- [provider-courses.json](../apps/web/src/data/provider-courses.json): the fixture.
- [provider-snapshots.md#snapshot-fields-and-source-assets](provider-snapshots.md#snapshot-fields-and-source-assets): field conventions, usage, and limitations.
- Updates to `README.md` and `Plan.md` documenting the phase 2 snapshot.
- This report.

Extraction scripts and downloaded HTML lived under `/tmp`; they were not added to the repository and are not a maintained, reproducible scraper. This report describes the actual procedure, but recollecting the data would require recreating or retaining those scripts and checking current page structures. No automated retry/backoff system, catalog pagination, refresh policy, or provider adapter was implemented. Provider robots/access-policy review was not performed as part of this collection; phase 3 ingestion planning still requires that review.

Prices, discounts, counts, ongoing-course lengths, and remote images can change. Signed CDN links can expire. Consumers should show the snapshot date, identify generated summaries, handle missing information and images, and avoid presenting the data as live provider information. Full descriptions, full syllabi, student profiles, reviews, and course media were not included in the JSON.
