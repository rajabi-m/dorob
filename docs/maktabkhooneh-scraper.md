# How the Maktabkhooneh scraper works

The scraper downloads public course pages and exports their information to JSON. It runs manually for now; automatic refreshes will be added in the backend.

Parser version **2.0.0** emits the same complete [golden course structure](course-data-format.md) as the other three adapters. Course IDs are now `maktabkhooneh:<courseDetails.id>`; the old `mk` slug identifier remains in `raw.slugId`. Covers use `image: {url, alt}`, provider labels use `providerLevel`/`providerStatus`, and source metadata includes `parser`, `parserVersion`, `warnings`, and the shared fact hash. All required nullable fields and `derived: null` are present. Offers have stable IDs, original source price evidence and explicit free status. A numeric zero without `type=FREE` remains an unknown normalized price.

Chapter/lesson IDs are strings. Provider lesson labels remain in `providerType`; unverified labels such as `lecture` map to `unknown`. Chapter and lesson effort labels remain under `raw.syllabusEffort` and never become video duration. Missing instructor/lesson lists remain null. Rating counts come from `rating_count`, not substituted review totals; ambiguous provider update dates stay raw. Signed cover expiry parameters do not change the fact hash.

The CLI now uses the shared validated export/checkpoint implementation. **Old-format exports cannot be resumed.** Run again without `--resume`, preferably with a new `--output` path to preserve an old file. Failed old-checkpoint validation does not overwrite it. No existing export, frontend fixture, or database was migrated.

## Collection flow

1. **Check access rules.** Read `robots.txt` to find the sitemap and avoid disallowed URLs.
2. **Find courses.** Read the course sitemaps and collect unique course URLs. A sitemap is the provider’s published list of pages, so discovery does not need search pages.
3. **Download pages.** Fetch each course’s HTML with a normal HTTP request. No browser or login is needed for the current page format.
4. **Parse embedded data.** Find the `__NUXT_DATA__` JSON inside the HTML and decode its indexed references into ordinary objects. Read course facts from `courseDetails` and chapters/lessons from `chapterData`. Page scripts are never executed.
5. **Validate and export.** Extract titles, descriptions, prerequisites, instructors, levels, images, prices, durations, ratings, and syllabi. Add source links and check timestamps, then save each successful course to the JSON file.

Full-course and content-only offers stay separate. Disabled zero-price offers do not mean free access. Video duration and estimated study effort also stay separate; missing information remains unknown.

## Failures and progress

Requests run sequentially, with a default 1.5-second gap or a longer provider crawl delay. Temporary failures retry up to three times; access denial stops collection. Invalid pages are recorded as errors rather than saved as valid courses.

The CLI saves progress after every result. `--resume` skips courses already saved in the same export; omit it when refreshing their data. The output contains courses, errors, and whether the selected run completed. A limited run is not a full-catalog export.

## Run it

From the repository root:

```sh
bun run scrape:maktabkhooneh --limit 10
bun run scrape:maktabkhooneh --all
bun run scrape:maktabkhooneh --all --resume
```

Default output: `apps/utils/output/maktabkhooneh.json` (ignored by Git).

The reusable logic lives in [the scraper module](../apps/utils/scrapers/maktabkhooneh.ts); [the CLI](../apps/utils/scrape-maktabkhooneh.ts) handles arguments and file saving. See [utility usage](../apps/utils/README.md) for backend methods and more options.

Alignment validation (October 2, 2026): 11 Maktabkhooneh tests and all 40 utility tests pass, along with workspace lint/type checking, CLI help and whitespace checks. Tests use the retained public-page fixture and synthetic/injected transport cases; no fresh live collection was performed for this output-format update. The frontend production build still encounters the existing Bun runtime error after compilation and type checking.
