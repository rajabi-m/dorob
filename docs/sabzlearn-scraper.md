# Sabzlearn standalone adapter

The server-side adapter lives in `apps/utils/scrapers/sabzlearn.ts`; it does not update Dorob's frontend, use an LLM, call private endpoints, collect reviews, or download course media. It returns the complete [version-1 course contract](course-data-format.md). The pure parser decodes public Nuxt JSON without executing scripts, reusing the existing indexed payload decoder.

## Public observations and access

Inspected October 2, 2026:

- [Robots](https://sabzlearn.ir/robots.txt) allows public course pages and publishes the sitemap; account, lesson, lab, and admin paths are excluded.
- [Sitemap index](https://sabzlearn.ir/sitemap.xml) publishes [course sitemap](https://sabzlearn.ir/sitemap-courses.xml). Discovery follows course maps only and omits blog/category/teacher maps. A live adapter smoke check discovered **89** course URLs; the published course sitemap was exhausted. This describes advertised sitemap coverage, not proof that every provider course is indexed.
- [C#](https://sabzlearn.ir/course/csharp/), [HTML](https://sabzlearn.ir/course/html-tutorial/), and [Python](https://sabzlearn.ir/course/python/) shared the same public detail structure. C# and HTML were fetched again through the actual adapter with robots, request spacing, and safe transport: C# produced ID `100`, 2,000,000 toman current / 4,000,000 original, 16 chapters and 59 published episodes; HTML produced ID `2`, explicit free access, one chapter and 40 published episodes. Python's fetched page parsed to ID `25`, 3,500,000 toman current / 7,000,000 original, 14 chapters and 246 episodes.

The initial sandboxed Bun request failed with `ConnectionRefused`; an authorized escalated smoke check succeeded. No full-detail catalog collection was run.

## Field mapping and conservative limits

| Output | Public evidence |
| --- | --- |
| Identity/title | `data.course-<slug>.id`, `.slug`, `.title`; page slug must match requested URL |
| Description | `full_content`, falling back to `description`; scripts/styles/tags stripped |
| Cover/instructor/category | `thumbnail`, `teacher.name`, `category.name` |
| Prerequisites | `course_prerequisites` text or nonempty title list |
| Purchase | `is_free`, `is_sale_stopped`, `original_price`, `discounted_price`, matched rendered purchase currency |
| Duration | `total_duration` verified against the rendered hours label; study effort stays null |
| Syllabus | Ordered `chapters[].episodes`; lesson `duration` is mm:ss and `has_video` identifies video |
| Lesson/student counts | Sum of published chapter `episodes_count`; `students_enrolled` |
| Status | Provider `status` preserved; known «در حال برگزاری» / «تکمیل شده» determine ongoing |
| Availability | Explicit `is_sale_stopped`; request failures never imply unavailable |

Price normalization verifies the current numeric amount followed by تومان or ریال in the observed balanced purchase row after the course heading, rather than accepting prices from navigation, related courses, or description prose. Missing row structure keeps normalized prices null; invalid explicit numeric fields fail extraction. Rial is divided by ten; if currency evidence disappears, paid normalized amounts remain null and a warning is recorded. `is_free=true` is explicit free evidence even if no zero-price display exists; an ordinary zero slot does not establish free access. Stopped-sale offers are excluded. Source amounts and units are retained separately. This initial mapping supports one full-access purchase option, not subscriptions or future multi-offer layouts.

`last_update` is a Jalali date retained in `raw.lastUpdateJalali`; `providerUpdatedAt` remains null. The numeric rating is retained raw, but rating scale/vote count are unverified; `comments_count` is never used as rating-vote count. Language, course format, provider level, outcomes, certificates, and other unknown facts remain null. Marketing prose is not converted into inferred structured facts. Teacher avatar/statistics, reviews and reviewer identities, video URLs, and account flags are excluded from output.

The provider's displayed aggregate hours can be rounded; episode durations remain separate observations. A mismatch between embedded lessons and the published chapter count adds a partial-syllabus warning. Course coverage and price layouts need wider sampling before scheduling collection. Access terms require review before deployment.

## Run or import

```sh
bun apps/utils/scrape-sabzlearn.ts --limit 2
bun apps/utils/scrape-sabzlearn.ts --url 'https://sabzlearn.ir/course/csharp/'
bun apps/utils/scrape-sabzlearn.ts --all --resume
bun apps/utils/scrape-sabzlearn.ts --help
```

The shared CLI defaults to ten courses and an ignored `apps/utils/output/sabzlearn.json`. It checkpoints atomically, reports partial failures with nonzero exit status, and supports resume with the same selected URLs. `--all` means all published sitemap URLs, not unlisted courses. Requests are sequential with shared timeout/size/retry/robots/cancellation safeguards; 401/403 stops collection.

```ts
import { SabzlearnScraper } from "@dorob/utils/sabzlearn";
const scraper = new SabzlearnScraper();
const urls = await scraper.discoverCourses();
for await (const result of scraper.scrapeCourses(urls)) {
  // Backend: persist result.course or record result.error for later retry.
}
```

Six offline tests exercise three reduced public fixtures, discount/free/missing/unknown-unit handling, synthetic rial normalization, layout/identity drift, strict URLs, sitemap discovery, access denial, streaming errors, and CLI partial/repair/resume. Fixtures contain selected actual metadata and at most two chapters/two lessons per chapter, clearly attributed in comments; tests do not imply these reduced syllabi represent full live courses. Synthetic transformations are labeled in test code. Tests and utility lint/type checking passed during implementation; root performs the final workspace checks.
