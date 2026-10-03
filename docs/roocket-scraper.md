# Roocket standalone course adapter

Roocket adds programming and web-development courses that overlap Dorob’s initial comparison topics. This utility is separate from frontend fixtures and backend scheduling. It emits the complete version-1 [course contract](course-data-format.md), with `derived: null` and explicit nulls for unknown information.

## Public sources and verified coverage

Inspected October 2, 2026:

- [Robots rules](https://roocket.ir/robots.txt): public `/series/` course pages are allowed; cart/purchase-success/private-class-success routes and tracking queries are excluded.
- [Sitemap index](https://roocket.ir/sitemap/) points to [the course sitemap](https://roocket.ir/sitemap-courses/), containing 106 course URLs in the observed response. Article, discussion, episode/video and podcast maps are skipped. Exhaustive successful course-map traversal sets `discoveryIsComplete`; CLI `fullCatalog` requires complete successful collection of that discovered catalog. This means published sitemap coverage, not proof every provider offering is listed.
- [Free Python course](https://roocket.ir/series/learn-python/): provider ID 70, 26 lessons, published content time `06:46:11`, free flag and type, instructor, rating and student count.
- [Laravel projects course](https://roocket.ir/series/learn-laravel-with-projects/): provider ID 134, four sections, 73 lessons, `20:00:30`, provider status indicating ongoing recording, source prices 4,900,000 and 2,450,000.

Local DNS could not resolve `roocket.ir`, including outside the sandbox. Public DNS returned 185.143.234.131/185.143.233.131; inspection used `curl --resolve roocket.ir:443:185.143.234.131` with normal TLS certificate verification, not an access-control bypass. The live public responses were parsed successfully. Regular CLI requests still require working local DNS; no hardcoded IP or system DNS change was introduced. Sitemap discovery was tested against the retained live catalog; an ordinary Bun-network end-to-end run was not claimed.

## Extraction

Pages publish React Server Components (RSC) JSON inside `self.__next_f.push([1, "..."])` script tags. The parser uses `JSON.parse` to decode those literal arrays, joins text chunks, and extracts the single `data.course` record. It never evaluates JavaScript, executes page scripts, fetches undocumented APIs, opens episode pages, or downloads course media. Missing/ambiguous records and identity mismatches fail extraction.

| Contract field | Published source |
| --- | --- |
| Stable ID, URL, title | `data.course.id`, `slug`, `path`, `title` |
| Description, cover | `description_full` / `description`, `image` |
| Instructor | `course.instructor.name`; role remains null |
| Content duration | `course.time`, `episodes[].time` (HH:MM:SS / MM:SS) |
| Provider state | `status_label`, `status`, `is_inactive`, `is_coming_soon` |
| Update time, counts, rating | `updated_at`, `learning_count`, `episodes_count`, `rates.avg/max/count` |
| Syllabus | `sections[].section_name/section_num/episodes`, otherwise flat `episodes[]` |
| Source purchase facts | `is_free`, `type`, `type_label`, `price`, `final_price`, formatted values |

When the provider publishes a flat lesson list, the course title is used as a single container with `id: null`; a warning distinguishes this from a provider chapter title. Source lesson/section IDs and order are preserved. Missing lists remain null, and explicit empty lists remain empty. Content duration is separate from unknown study effort and completion windows. Recorded-video format comes from published video duration/episode evidence, not provider-wide inference.

Free requires both `is_free: true` and `type: "free"`, with no conflicting positive price. Disabled inactive options are excluded (`offers: []`); coming-soon purchase options remain null because preorder eligibility is not established. Login-specific cart and certificate state is never used to infer availability or included certification.

**Paid price units remain unverified.** The sampled course purchase prices use an SVG currency glyph, with no machine-readable currency label in that region. A separate private-class advertisement saying تومان does not establish the course price unit. The adapter retains the observed current/original source amounts, `sourcePrice.unit: "unknown"`, and a warning; normalized `amount`/`originalAmount` remain null and status is `unknown`. Do not display these as verified toman prices until the course-price glyph/unit is reviewed. Free zero remains explicit regardless of currency.

Learning outcomes, prerequisites, language, category labels, and provider level remain null: descriptive prose and SEO links are not interpreted as independently labeled metadata. Provider-supplied descriptions remain plain text; no AI text is generated. Field paths, successful-check timestamp, selected raw evidence and deterministic fact hash accompany every record. Account state, instructor profiles/biographies, reviewer identities, media URLs, and full source scripts are excluded from output and fixtures.

## Usage

From repository root:

```sh
bun run scrape:roocket --limit 2
bun run scrape:roocket --url 'https://roocket.ir/series/learn-python/'
bun run scrape:roocket --all --output apps/utils/output/roocket.json
bun run scrape:roocket --all --resume --output apps/utils/output/roocket.json
bun run scrape:roocket --help
```

Default collection selects ten discovered courses, each checkpointed atomically in ignored `apps/utils/output/roocket.json`. Use `--all` for the complete discovered catalog, never during routine implementation smoke checks. Resume requires the same selected URLs and validated checkpoint; saved successes are skipped. Partial failures return exit code 1. Access denial stops the provider; cancellations preserve collected progress once discovery finishes. The shared transport uses sequential requests, minimum 1.5-second spacing or longer robots delay, strict HTTPS host/redirect validation, bounded response size/timeouts/retries, and Retry-After handling.

```ts
import { RoocketScraper } from "@dorob/utils/roocket";
const scraper = new RoocketScraper();
const urls = await scraper.discoverCourses();
for await (const result of scraper.scrapeCourses(urls)) {
  // Persist result.course, or record result.error for operator review/retry.
}
```

The scraper exposes `initialize`, `discoverCourses`, `fetchCoursePage`, `scrapeCourse`, and streaming `scrapeCourses`. `parseCoursePage`, `decodeCourseData`, and `canonicalCourseUrl` are pure offline helpers. Use the backend package export, never a frontend import.

## Validation and limitations

Reduced public fixtures retain course facts and lesson titles from both live pages, public robots rules, and the 106-URL course sitemap. They contain no reviews, account state, course media or credentials. Synthetic variants are labeled in tests.

Validation: `bun test apps/utils/tests/roocket.test.ts` and `bun run typecheck:utils` pass. Tests cover free/unknown/discount source prices, inactive/coming-soon options, malformed prices/counts/durations, null fields, layout and identity drift, strict course URLs, sitemap discovery, deduplication, partial errors, robots/access denial and CLI checkpoint/resume. Both actual fetched course HTML pages parse successfully. Broader provider sampling, paid-currency verification, sitemap completeness assessment and scheduled-ingestion authorization remain future work.
