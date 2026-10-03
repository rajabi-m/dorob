# Course information and standard JSON format

Every provider parser must return the same course shape described here. Dorob uses it for search, course cards, details, filters, and comparisons. One record represents one provider’s course; similar courses from different providers remain separate records.

This is the contract, version `1`, implemented by all four standalone adapters (Maktabkhooneh, TopLearn, Sabzlearn, and Roocket) in `apps/utils`. Maktabkhooneh parser version 2.0.0 now returns this format; older exports/checkpoints and frontend mock fixtures are not migrated automatically. Server-side TypeScript definitions and validation/hash helpers are in `apps/utils/scrapers/course.ts`.

## Information we need

| Information | Fields | Purpose |
| --- | --- | --- |
| Identity and source | `id`, `providerId`, `providerCourseId`, `sourceUrl` | Avoid duplicates and link visitors to the provider. |
| Course content | `title`, `description`, `learningOutcomes`, `prerequisites` | Explain what is taught and who can take it. |
| Presentation | `image`, `language`, `format` | Show a cover and explain how the course is delivered. |
| Teachers | `instructors` | Preserve names and roles, including coaches or designers. |
| Provider classification | `providerCategories`, `providerLevel` | Keep the provider’s own categories and level labels. |
| Purchase options | `offers` | Compare free, paid, discounted, and subscription access accurately. |
| Time and structure | `duration`, `syllabus` | Compare content length and chapter/lesson coverage. |
| Course state | `availability`, `providerStatus`, `ongoing`, `providerUpdatedAt` | Distinguish unavailable courses and courses still being developed. |
| Supporting facts | `rating`, `studentCount`, `lessonCount`, `features` | Show only counts, ratings, and benefits actually published. |
| Traceability | `source`, `raw` | Know when information was checked and where it came from. |
| Dorob enrichment | `derived` | Keep later AI summaries and topic/level grouping separate from provider facts. |

## Rules for every parser

- Always include the documented keys. Required nonempty values are `id`, `providerId`, `providerCourseId`, `title`, `sourceUrl`, and the source timestamp, parser name, and parser version. A page missing these fails extraction.
- Use a stable provider identifier for `providerCourseId`, stored as a string. `id` is `<providerId>:<providerCourseId>`. If no provider identifier exists, use a SHA-256 hash of the canonical course URL. Keep IDs stable across refreshes; retain alternate provider identifiers in `raw`.
- Use `null` for unknown information, including unknown lists. Use `[]` only when the source confirms an empty list. A failed or incomplete extraction must not masquerade as an empty syllabus or a free course.
- Store Persian text as supplied, including ZWNJ. Descriptions, outcomes, prerequisites, and lesson titles are plain text. Search normalization and display formatting happen separately.
- URLs are absolute HTTPS URLs. Keep required image query parameters. Timestamps use UTC ISO 8601; numeric values use JSON numbers, not formatted Persian strings.
- `image` is null when no cover is available; otherwise it contains `url` and `alt`. Reuse the course title for alt text if the provider supplies none. `source.method` is `public-html`, `public-html-and-embedded-data`, `public-api`, or `browser-rendered-html`.
- Do not infer levels, learning outcomes, certificates, ratings, or popularity. Provider categories and labels do not prove that two courses are equivalent.

## Prices, duration, and syllabus

`offers` contains each distinct purchase option. Its `id` is stable within the course. `type` is `full`, `content`, `subscription`, `free`, or `other`; preserve the provider’s label too. Disabled offers are excluded.

Each offer has a numeric current `amount`, an `originalAmount` only when a higher pre-discount price is supplied, and normalized `unit: "toman"`. `status` is `free`, `paid`, `subscription`, or `unknown`. Zero requires explicit free-access evidence; an unresolved amount is null. Subscription offers use `billingPeriod: "monthly"`, `"yearly"`, or `"other"`; it is null for one-time purchases or an unknown period. `certificateIncluded` is true/false only when stated.

Keep the original amount, unit, and displayed label in `sourcePrice`. Its `unit` is `toman`, `rial`, or `unknown`. Convert known rial amounts to toman by dividing by ten. If sources disagree about units, leave normalized amounts null and record a warning until resolved. Do not copy a disabled zero-price slot into a free offer.

`duration.contentMinutes` measures published content, `effortHours` measures total estimated study effort, and `completionWindowDays` measures the provider’s completion window. They are not interchangeable. Unknown or unspecified durations are null.

`syllabus` preserves chapter and lesson order, starting at 1. Chapter and lesson IDs are provider IDs stored as strings, or null if unavailable. Lesson `type` is `video`, `text`, `exercise`, `quiz`, `project`, `live`, `other`, or `unknown`; `providerType` preserves the original label. Lesson `contentMinutes` is populated only when the source identifies content duration, not general effort time.

`rating` contains the published value, scale, and count; it is null if no valid rating is available. Exact student/lesson counts are nonnegative integers. Approximate counts such as `105+` belong in `features` as strings. `availability` is `available`, `unavailable`, or `unknown`; a failed request does not prove unavailability. `format` is `recorded-video`, `interactive`, `live`, `blended`, `other`, or null. `language` is a language code such as `fa`, or null when unknown.

## Source facts and later enrichment

`source.checkedAt` is the last successful observation, not the last failed attempt. `fieldSources` maps populated fact fields to their original HTML label or embedded-data path. Use dotted paths for individual offers when they have different sources. `warnings` records ambiguities and missing sections.

`source.contentHash` is a SHA-256 hash of deterministically serialized normalized provider facts. Sort object keys, preserve array order, and exclude `source`, `raw`, `derived`, and expiring image query parameters. This lets the backend detect factual changes without treating collection timestamps as changes.

`raw` contains selected original values needed to audit normalization; provider-specific names are allowed only here. It may contain untrusted source HTML and must never be rendered directly or sent wholesale to the browser. Do not retain reviewer identities, credentials, or course media.

Parsers always return `derived: null`. Later enrichment may store an object with `summary`, `topicIds`, `groupIds`, `normalizedLevel`, `method`, `model`, `promptVersion`, `sourceContentHash`, and `generatedAt`. `method` is `ai` or `manual`; AI output records its model and prompt version. `normalizedLevel` is `beginner`, `intermediate`, `advanced`, `mixed`, or null. The referenced source hash makes outdated enrichment detectable. Comparisons between multiple courses are separate records.

The backend manages refresh attempts, first-seen dates, revision history, and enrichment separately. Batch exports may wrap results in `{ "courses": [], "errors": [] }`, but every successful course uses the shape below. Parsing failures belong in the error list, not as incomplete course records.

## Golden standard JSON

This is a fictional example showing the complete shape, not a real provider offering. The placeholder hash must be replaced with a calculated SHA-256 hash. Nullable values demonstrate information the source did not supply.

```json
{
  "schemaVersion": 1,
  "id": "example-provider:101",
  "providerId": "example-provider",
  "providerCourseId": "101",
  "sourceUrl": "https://example.org/courses/101",
  "title": "دورهٔ نمونهٔ آموزش پایتون",
  "description": "معرفی مفاهیم پایهٔ پایتون همراه با تمرین.",
  "learningOutcomes": ["نوشتن برنامه‌های ساده با پایتون"],
  "prerequisites": "آشنایی اولیه با کار با رایانه",
  "image": {
    "url": "https://example.org/images/python.webp",
    "alt": "دورهٔ نمونهٔ آموزش پایتون"
  },
  "language": "fa",
  "format": "recorded-video",
  "instructors": [
    {
      "name": "مدرس نمونه",
      "role": "مدرس"
    }
  ],
  "providerCategories": ["برنامه‌نویسی", "پایتون"],
  "providerLevel": "مقدماتی",
  "offers": [
    {
      "id": "full",
      "type": "full",
      "label": "دسترسی کامل دوره",
      "amount": 800000,
      "originalAmount": 1000000,
      "unit": "toman",
      "status": "paid",
      "billingPeriod": null,
      "certificateIncluded": null,
      "sourcePrice": {
        "amount": 8000000,
        "originalAmount": 10000000,
        "unit": "rial",
        "label": "۸٬۰۰۰٬۰۰۰ ریال"
      }
    }
  ],
  "duration": {
    "contentMinutes": 15,
    "effortHours": 1,
    "completionWindowDays": null
  },
  "syllabus": [
    {
      "id": "chapter-1",
      "order": 1,
      "title": "شروع کار با پایتون",
      "lessons": [
        {
          "id": "lesson-1",
          "order": 1,
          "title": "نصب پایتون",
          "type": "video",
          "providerType": "ویدئو",
          "contentMinutes": 15
        }
      ]
    }
  ],
  "availability": "available",
  "providerStatus": "در حال تکمیل",
  "ongoing": true,
  "providerUpdatedAt": null,
  "rating": {
    "value": 4.5,
    "scale": 5,
    "count": 100
  },
  "studentCount": null,
  "lessonCount": 1,
  "features": [
    {
      "label": "تعداد تمرین‌ها",
      "value": "۱۰+"
    }
  ],
  "source": {
    "checkedAt": "2026-10-01T12:00:00Z",
    "parser": "example-provider",
    "parserVersion": "1.0.0",
    "method": "public-html-and-embedded-data",
    "contentHash": "REPLACE_WITH_CALCULATED_SHA256",
    "fieldSources": {
      "title": "course.title",
      "description": "course.description",
      "learningOutcomes": "course.learning_outcomes",
      "prerequisites": "course.prerequisites",
      "image": "course.cover",
      "language": "course.language",
      "format": "course.format",
      "instructors": "course.teachers",
      "providerCategories": "course.categories",
      "providerLevel": "course.level",
      "offers.full": "course.offers.full",
      "duration": "course.duration",
      "syllabus": "course.chapters",
      "availability": "course.available",
      "providerStatus": "course.status",
      "ongoing": "course.in_progress",
      "rating": "course.rating",
      "lessonCount": "course.lesson_count",
      "features": "course.features"
    },
    "warnings": []
  },
  "raw": {
    "priceAmount": 8000000,
    "priceUnit": "rial",
    "level": "مقدماتی"
  },
  "derived": null
}
```
