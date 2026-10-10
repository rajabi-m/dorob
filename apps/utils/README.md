# Dorob utilities

Reusable server-side TypeScript tools, run locally with Bun. Standalone adapters collect Maktabkhooneh, TopLearn, Sabzlearn, and Roocket into JSON. They do not update the frontend fixture or run a scheduled backend.

Browse the [documentation hub](../../docs/index.md) and [current validation](../../docs/validation.md). Phase 2 is complete for now; these utilities remain standalone groundwork.

Read [how the scraper works](../../docs/provider-adapters.md#maktabkhooneh) for a short overview.

[Course data format](../../docs/course-data-format.md) defines the common output. All four adapters emit the version-2 contract, adding anonymous public feedback, syllabus coverage, and richer educational evidence. Version-1 checkpoints cannot be resumed; freshly export without `--resume` and choose a new output path to retain old files.

## Additional provider adapters

```sh
bun run scrape:toplearn --limit 2
bun run scrape:sabzlearn --limit 2
bun run scrape:roocket --limit 2
# Each supports --url URL (repeatable), --all, --resume, --output PATH and --help.
```

Default exports are ignored `apps/utils/output/<provider>.json` files. Requests obey current robots rules, safe same-host redirects, bounded response sizes/timeouts, cancellation, sequential rate limits and retries. The shared CLI atomically checkpoints results and reports failures with a nonzero status. It records requested URLs separately from canonical course URLs so aliases resume correctly. An invalid resume does not overwrite the existing checkpoint. `fullCatalog` means every URL in successfully traversed advertised course maps was exported, not that unlisted offerings were discovered.

```ts
import { SabzlearnScraper } from "@dorob/utils/sabzlearn";
import type { ProviderCourse } from "@dorob/utils/course";
const scraper = new SabzlearnScraper({ signal: abortController.signal });
for await (const result of scraper.scrapeCourses(await scraper.discoverCourses())) {
  if (result.course) await saveCourse(result.course as ProviderCourse);
  else await recordFailure(result.sourceUrl, result.error);
}
```

`ToplearnScraper` and `RoocketScraper` are available through their corresponding package exports. These are server-side source exports intended for a TypeScript/Bun backend; do not import the adapters or raw source evidence into browser code. No credentials, database, LLM, scheduling, or frontend integration is introduced.

Provider-specific mappings, observations, and limitations: [TopLearn](../../docs/provider-adapters.md#toplearn), [Sabzlearn](../../docs/provider-adapters.md#sabzlearn), [Roocket](../../docs/provider-adapters.md#roocket). The [implementation plan](../../docs/provider-adapters.md#provider-selection-and-implementation-groundwork) records the selection and agent rules. Quera was excluded at the owner's request; Faradars was deferred after public access/detail-page assessment. Unknown price units or conflicting purchase amounts leave normalized amounts null. Explicit matching purchase labels can outweigh generic SEO currency; course-scoped structured currency can establish the display unit when amounts match. Raw observations and discrepancy warnings remain available. These adapters need broader sampling before deployment.

## Run the scraper

From the repository root:

```sh
# Discover the catalog, then fetch ten courses.
bun run scrape:maktabkhooneh

# A smaller test run.
bun run scrape:maktabkhooneh --limit 2

# Export the full catalog; this can take hours at the default request rate.
bun run scrape:maktabkhooneh --all

# Continue the same interrupted run, skipping already saved courses.
bun run scrape:maktabkhooneh --all --resume

# Choose an output file or a specific public course (repeat --url as needed).
bun run scrape:maktabkhooneh --url 'https://maktabkhooneh.org/course/آموزش-برنامه-نویسی-با-پایتون-مقدماتی-mk346/' --output /tmp/course.json

bun run --cwd apps/utils lint
bun run test:utils
bun run typecheck:utils
```

The default output is `apps/utils/output/maktabkhooneh.json`, ignored by Git. Each course is saved immediately through an atomic file replacement. The file includes run status, selected URLs, successful courses, and errors. Exit code 1 means a partial export or a fatal error. Ctrl+C saves progress once discovery has finished. Resume requires the same selected URLs and output path; omit `--resume` to refresh previously collected facts. Use separate output paths for concurrent runs.

## Use from the backend

```ts
import { MaktabkhoonehScraper } from "@dorob/utils/maktabkhooneh";

const scraper = new MaktabkhoonehScraper();
const urls = await scraper.discoverCourses();
for await (const result of scraper.scrapeCourses(urls)) {
  // Save result.course, or record result.error for retry.
}
```

Methods: `initialize()` loads robots rules; `discoverCourses()` reads course sitemaps; `fetchCoursePage(url)` fetches public HTML; `scrapeCourse(url)` extracts one course; `scrapeCourses(urls)` streams successes and failures. Pure `parseCoursePage`, `decodeNuxtPayload`, `parseSitemap`, and `parseRobots` functions support offline testing. Options include request delay, timeout, response-size limit, up to three retries, cancellation, and an injectable HTTP client.

## Extraction and limits

- Discovery uses the published sitemap, avoiding disallowed search pages. Requests are sequential with at least 1.5 seconds between starts, or a longer robots crawl delay. Transient errors retry with increasing delays and respect `Retry-After`; 401/403 stops collection.
- The parser reads `__NUXT_DATA__` JSON without executing JavaScript. It extracts descriptions, prerequisites, teachers, offers, ratings/counts, and ordered chapter/lesson titles. Anonymous public course feedback is retained when identifiable; source-labeled reviews and unverified comments remain distinct. Reviewer identities, video files, and private endpoints are excluded.
- Only enabled full/content offers are included. Disabled zero slots and upgrade-only offers are excluded. The provider’s `FREE` type explicitly identifies free access. Prices use the toman convention verified during the mock collection; enabled zero amounts require the provider FREE type before being treated as free; original source amounts are retained. Currency/display drift still needs operator review.
- Content duration and study effort remain separate; missing fields are null. Source HTML for descriptions and chapter/lesson effort labels are retained under `raw` for evidence; render the plain-text fields, not untrusted source HTML. Signed image links are preserved but not downloaded or checked for expiry.
- Unknown Nuxt wrappers, missing required fields, and invalid prices fail extraction rather than inventing data. Source timestamps, field paths, adapter version, and a fact hash accompany each course.
- This is an ingestion building block. Scheduling, database upserts, stale-data presentation, alerts, backup/recovery, and course-removal decisions belong to the backend. The CLI only checkpoints collection; it does not delete courses or claim failed data is current. A full export does not start scheduled refreshes.

Tests use a reduced public-page fixture collected October 1, 2026, with no reviewer data. The fixture retains selected metadata, short description excerpts, and two chapters. Additional synthetic cases exercise price handling and failures. Provider access terms and ongoing operational suitability must be reviewed before deploying scheduled ingestion.

## Historical checkpoint validation — October 3, 2026

All 40 offline tests, utility lint/type checking, and the four CLI help commands pass. The package exports TypeScript source and has no separate build step. No fresh live collection was performed for this checkpoint. Those checkpoint limitations were subsequently addressed in bounded samples below; deployment still requires broader provider-template sampling.

## Version-2 assessment evidence — October 3, 2026

The shortened [golden format](../../docs/course-data-format.md) defines reviews/comments with anonymous text, individual ratings/dates when explicit, exact source locators, sample coverage/selection, and syllabus completeness. Additional nullable fields preserve published audience, technologies, educational practice/feedback/support, chapter/lesson descriptions, and offer access/support. Scrapers still return `derived: null`; ranking and AI assessment are separate later work.

Feedback is an initial public-page sample, not a full review crawl. A course comment does not establish enrollment or satisfaction. Questions/replies are excluded when identifiable, identities/contact details are redacted, and unverified totals remain unknown. Missing fields and unavailable feedback stay null. The source hash includes substantive feedback and evidence coverage changes, while routine timestamps and collection progress are excluded.

| Provider | Feedback available in inspected public page |
| --- | --- |
| Maktabkhooneh | Six anonymous source-labeled reviews in the verified Python sample; published text-review total and more-page indicator preserved. |
| Sabzlearn | Four anonymous top-level comments retained from 12 candidates in the Python sample; explicitly unverified comments, further pages available, total scope unknown. |
| TopLearn | Inspected feedback loads separately; the script-disclosed comments route returns provider 404 pages, so items remain unknown. Course-attached JSON-LD review support is tested synthetically. |
| Roocket | A bounded first-page sample from the script-disclosed public comments API; anonymous unverified comments, with questions/replies/known staff excluded and pagination coverage preserved. |

Final migration checks: all **62 utility tests**, workspace lint/type checking, and whitespace checks pass. Production compilation/types pass, but page-data collection still fails with the existing Bun CommonJS runtime bug. No full-catalog crawl or commit was performed.

## Local data dashboard

Run `bun run dashboard:aggregate` to combine the four `output/dashboard-<provider>.json` exports into ignored `output/course-dashboard.json`, then `bun run dashboard:data` to browse at http://127.0.0.1:8787. Use `--file PATH --port N` for another snapshot/port. Aggregation accepts repeatable `--input PATH` and `--output PATH`. The read-only local dashboard supports search, provider/data filters, syllabus, anonymous feedback, warnings, provenance and JSON download. Raw HTML evidence stays in the local file and is omitted from browser responses. Refresh rereads the snapshot; it does not scrape.

October 3 sample: 10 selections per provider, 39 successful courses, 84 feedback items and one recorded TopLearn canonical-identity failure. This is a bounded sample, not full-catalog collection. Workspace lint/type checking pass; Firefox desktop and 320px layout and RTL keyboard tabs were reviewed.

Provider repairs supersede the initial sample's missing prices and identity failure: TopLearn verifies legacy aliases and purchase units; Roocket verifies structured currency and reads public comments; Maktabkhooneh handles numeric and H:MM durations; Sabzlearn retains explicit FAQ educational/access evidence. The public transport accepts a missing robots resource (404), consistent with [RFC 9309 §2.3.1.3](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.3); denied or unreachable robots and ordinary course 404 responses still fail. Feedback remains a bounded sample.

Refreshed October 3 snapshot: **40 courses, zero errors, 118 feedback items** (36 Maktabkhooneh reviews, 48 Sabzlearn comments, 34 Roocket comments). All 40 have content duration; 39 have explicit free/paid prices and one TopLearn course is subscription-only. TopLearn comments remain unknown because its disclosed public route returns 404. All **72 utility tests**, workspace lint/type checking and whitespace checks pass; the dashboard response serves the refreshed aggregate without raw source evidence. No separate utility build step exists; the previously documented web build runtime limitation remains unchanged.

## Explicit saved-v2 ingestion conversion

`bun run convert:courses --input SAVED_V2.json --output NEW_V3.json` reads a saved
export and writes validated v3 `submissions`; `--help` prints usage. It makes no
network requests and never submits or imports records automatically. Existing
outputs and the input path cannot be overwritten. Nullable facts, source
locators, selected raw evidence and unknown coverage survive conversion;
missing or ambiguous evidence requires review. See the [v3 mapping and
contract](../../docs/course-data-format.md#additive-v3-ingestion-mapping).
