# TopLearn standalone provider adapter

`apps/utils/scrapers/toplearn.ts` exports a dependency-free, server-side `ToplearnScraper`, `canonicalCourseUrl`, and pure `parseCoursePage`. It is separate from the frontend. Every successful record follows the complete version-1 contract in [course-data-format.md](course-data-format.md), including null unknowns, provenance, deterministic fact hash and `derived: null`. No backend or live frontend integration is enabled.

## Usage

From the repository root:

```sh
bun run apps/utils/scrape-toplearn.ts --url https://toplearn.com/c/6274
bun run apps/utils/scrape-toplearn.ts --limit 10 --output apps/utils/output/toplearn.json
bun run apps/utils/scrape-toplearn.ts --all --output apps/utils/output/toplearn.json
bun run apps/utils/scrape-toplearn.ts --all --output apps/utils/output/toplearn.json --resume
```

The default is ten discovered URLs. `--all` selects the full discovered sitemap list; `fullCatalog` is true only after successful exhaustive traversal of the advertised course sitemap and selection of all discovered URLs. This does **not** establish coverage of courses absent from the sitemap. Output is atomically checkpointed after each result. Failures appear in the JSON export and set a nonzero exit status. Resume reuses successful records; omit resume for a fresh observation. Output remains in the ignored utility output directory by default.

Backend import (server-side only):

```ts
import { ToplearnScraper } from "../utils/scrapers/toplearn";
const scraper = new ToplearnScraper({ signal: abortController.signal });
for await (const result of scraper.scrapeCourses(await scraper.discoverCourses())) {
  if (result.course) await saveSourceCourse(result.course);
  else await saveRefreshFailure(result.sourceUrl, result.error);
}
```

The shared public-provider transport enforces HTTPS/same-origin requests and redirects, robots checks, sequential bounded rate limiting, timeout/response-size limits, retries/Retry-After, and cancellation. A 401/403 stops further collection; no browser or authentication bypass exists.

## Verified public sources

Observed October 2, 2026 through both raw public HTML and a live adapter run:

- [Robots](https://toplearn.com/robots.txt): wildcard user-agent, `Allow: /`, sitemap declaration.
- [Sitemap index](https://toplearn.com/sitemap.xml) and [course map](https://toplearn.com/sitemap-course.xml): 1,242 discovered course URLs during the smoke check. Only course maps are followed; articles, questions, categories and other maps are excluded. Limit: 30 visited maps. Sitemap entries are URLs, not proof that every listed course remains usable.
- [N8N](https://toplearn.com/c/6274): course ID 6274, 47 videos, 11:4:00 content duration, displayed 2,280,000 تومان with 3,800,000 struck through, in progress.
- [Xamarin installation](https://toplearn.com/c/G7): numeric course ID 19, explicitly free, four videos, 0:46:00, completed.
- [Kotlin/WhatsApp](https://toplearn.com/c/qj2): numeric course ID 96, 87 videos, 34:14:00, displayed 280,000 تومان with 400,000 struck through, completed.

Prices and counts above are dated observations, not current promises. Reduced fixtures retain attributed course fact sections and omit reviews, reviewer identities, scripts, forms, verification tokens and media URLs. Synthetic modifications in tests are labeled and never presented as provider observations.

## Mapping and conservative normalization

| Contract field | Public source |
| --- | --- |
| `providerCourseId` | Numeric `input#CourseId`; duplicate IDs must agree |
| `sourceUrl` | Same-host course URL, provider canonical short link where supplied; older short links may be alphanumeric |
| `title` | `course-page-header h1` |
| `description` | Plain text of `course-content-text` |
| `prerequisites` | Explicit prerequisite heading and ordered list |
| `image` | Course article cover image, retaining the source HTTPS URL and alt |
| `instructors` | `مدرس دوره` label; role explicitly مدرس |
| `providerCategories` | Course-header breadcrumb category links only |
| `providerLevel`, `providerStatus` | Explicit level/status labels |
| `ongoing` | True only for `در حال برگزاری`, false only for `به اتمام رسیده` |
| `offers` | Course details price label, price slots, struck-through original price and explicit `رایگان` |
| `duration.contentMinutes` | Published video content duration HH:MM:SS; seconds retained as fractional minutes |
| `lessonCount`, `format` | `تعداد ویدیوها`; recorded video is evidenced by this label and video catalog |
| `syllabus` | Ordered `Ep_*` video entries, heading and individual duration labels |

**Currency ambiguity:** all three inspected pages publish `og:price:currency=IRR`, but paid price labels explicitly say تومان. Following the contract's conflict rule, paid normalized amounts and status are unknown until that conflict is resolved. `sourcePrice` preserves the displayed numeric amounts and toman unit, while `raw.metadataCurrency` preserves IRR and a warning explains the issue. Explicit free access still yields amount zero. Numeric zero alone never establishes free access. Synthetic tests demonstrate discounted toman extraction without conflict and rial-to-toman division by ten.

No dedicated chapter grouping is supplied: the flat video list is represented as one section with the provider's list heading, `id: null`. Missing/unrecognized lists remain null with a warning; a mismatch between the published video count and parsed entries is flagged. There are no invented outcomes, student counts, ratings, language, availability, certificate claims, study effort or update dates. Page-wide `lang=fa-IR` is not assumed to describe spoken course language. Description text is preserved as source text rather than interpreted as separate outcomes.

## Validation and remaining limits

Six offline tests cover three real reduced pages, explicit free/discount/unknown/currency cases, stable hashes, unknown fields, identity/layout drift, URL attacks, course-only discovery, denial handling, streamed partial failures, and CLI checkpoints/resume including long-URL/canonical-shortlink aliases and prerequisite-list association. Live adapter discovery and three detail requests passed on October 2, 2026 after network escalation; the first sandboxed Bun fetch was refused. Utility lint passed. Shared workspace checks are recorded by the integrating agent.

The HTML reader is a small non-executing parser for the inspected server HTML; malformed HTML or provider structural changes may require an adapter update. No full-catalog collection was performed. Coverage of special/VIP courses, removed courses and future templates remains unverified. Schema-complete output does not imply every nullable field is discoverable.
