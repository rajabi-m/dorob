# Dorob utilities

Reusable server-side TypeScript tools, run locally with Bun. Standalone adapters collect Maktabkhooneh, TopLearn, Sabzlearn, and Roocket into JSON. They do not update the frontend fixture or run a scheduled backend.

Read [how the scraper works](../../docs/maktabkhooneh-scraper.md) for a short overview.

[Course data format](../../docs/course-data-format.md) defines the common output. All four adapters follow the complete version-1 contract. Maktabkhooneh parser version 2.0.0 replaces its older output; old checkpoints cannot be resumed and must be freshly exported without --resume (use a new output path to retain the old file).

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

Provider-specific mappings, observations, and limitations: [TopLearn](../../docs/toplearn-scraper.md), [Sabzlearn](../../docs/sabzlearn-scraper.md), [Roocket](../../docs/roocket-scraper.md). The [implementation plan](../../docs/provider-adapter-plan.md) records the selection and agent rules. Quera was excluded at the owner's request; Faradars was deferred after public access/detail-page assessment. Unknown price units or conflicting source currencies leave normalized amounts null, with raw observations and warnings preserved. These adapters need broader sampling before deployment.

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
- The parser reads `__NUXT_DATA__` JSON without executing JavaScript. It extracts descriptions, prerequisites, teachers, offers, ratings/counts, and ordered chapter/lesson titles. Review authors/text, video files, and private endpoints are excluded.
- Only enabled full/content offers are included. Disabled zero slots and upgrade-only offers are excluded. The provider’s `FREE` type explicitly identifies free access. Prices use the toman convention verified during the mock collection; enabled zero amounts require the provider FREE type before being treated as free; original source amounts are retained. Currency/display drift still needs operator review.
- Content duration and study effort remain separate; missing fields are null. Source HTML for descriptions and chapter/lesson effort labels are retained under `raw` for evidence; render the plain-text fields, not untrusted source HTML. Signed image links are preserved but not downloaded or checked for expiry.
- Unknown Nuxt wrappers, missing required fields, and invalid prices fail extraction rather than inventing data. Source timestamps, field paths, adapter version, and a fact hash accompany each course.
- This is an ingestion building block. Scheduling, database upserts, stale-data presentation, alerts, backup/recovery, and course-removal decisions belong to the backend. The CLI only checkpoints collection; it does not delete courses or claim failed data is current. A full export does not start scheduled refreshes.

Tests use a reduced public-page fixture collected October 1, 2026, with no reviewer data. The fixture retains selected metadata, short description excerpts, and two chapters. Additional synthetic cases exercise price handling and failures. Provider access terms and ongoing operational suitability must be reviewed before deploying scheduled ingestion.

## Checkpoint validation — October 3, 2026

All 40 offline tests, utility lint/type checking, and the four CLI help commands pass. The package exports TypeScript source and has no separate build step. No fresh live collection was performed for this checkpoint. Deployment still requires broader provider-template sampling and resolution of the documented source-currency and Roocket DNS limitations.
