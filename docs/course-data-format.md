# Course data: golden format

Version **2**, October 3, 2026. All four utility adapters now emit this owner-authorized contract. Implementation lives in `apps/utils/scrapers/course.ts`. Frontend fixtures remain separate. Version-1 exports/checkpoints require a fresh export without `--resume`; retain old files by choosing a new output path.

## What to collect

Keep provider facts sufficient for factual cards and an initial AI assessment of coverage, level, practice, and student feedback. Extract only published evidence; unavailable fields stay unknown.

| Data | Fields |
| --- | --- |
| Identity/display | `id`, `providerId`, `providerCourseId`, `sourceUrl`, `title`, `image`, `instructors` |
| Educational content | `description`, `learningOutcomes`, `prerequisites`, `intendedAudience`, `technologies`, `learningSupport` |
| Classification/delivery | `providerCategories`, `providerLevel`, `language`, `format` |
| Structure | `duration`, `syllabus` including chapter/lesson descriptions, `syllabusCoverage`, `lessonCount` |
| Price/access | `offers`, including published `accessDescription` and `supportDescription` per offer |
| State | `availability`, `providerStatus`, `ongoing`, `providerUpdatedAt` |
| Feedback | Aggregate `rating`, `studentCount`, anonymous `reviews` and collection coverage |
| Evidence | `features`, `source`, selected `raw`; parsers always return `derived: null` |

Deferred: instructor credentials, sample transcripts, subtitle/accessibility metadata, live schedules, lesson revision dates, completion percentages, rating distributions, detailed chapter entitlements, certificate-cost breakdowns, refunds, external costs, discount deadlines, and support response guarantees. Do not build speculative extraction for these now.

## Rules

- Include every documented key. Identity, title, source URL, successful check time, parser and parser version are mandatory. IDs are `<providerId>:<providerCourseId>`; use a stable provider ID or a canonical-URL SHA-256 fallback.
- Unknown is `null`. Use `[]` only for a confirmed empty source list. Failed extraction is not an empty syllabus, no reviews, or a free course.
- Preserve Persian text and ZWNJ as plain text. URLs are absolute HTTPS; numbers are unformatted JSON numbers; dates are UTC ISO 8601 only when calendar/time semantics are known. Otherwise retain selected original date evidence with a warning.
- Descriptions/outcomes/audience are provider claims. Extract explicit labeled facts; do not invent them from marketing prose. AI inference happens later. `technologies` contains explicit names/versions; unknown versions are null.
- `learningSupport` preserves published practice, assessment/feedback, and support descriptions. Lesson types and descriptions provide project/exercise evidence without inventing counts or double-counting syllabus items.
- Offers retain stable IDs, provider labels and original currency evidence. `type`: `full`, `content`, `subscription`, `free`, `other`. `status`: `free`, `paid`, `subscription`, `unknown`. Normalize verified rial to toman by dividing by ten. Explicit amount-matched purchase labels outrank generic SEO currency metadata; retain a discrepancy warning and original metadata. Course-scoped structured prices may establish a unit only when currency and amounts consistently match the purchase data. Conflicting purchase facts or unverified units leave amounts null. Zero requires explicit free evidence. Exclude disabled offers. Billing period is `monthly`, `yearly`, `other`, or null. Certificate inclusion is true/false only when stated. Offer-specific access/support prose must not be applied to every offer without evidence.
- Duration separates published content minutes, estimated effort hours, and completion-window days. Chapter/lesson order starts at 1; IDs are strings or null. Lesson `type`: `video`, `text`, `exercise`, `quiz`, `project`, `live`, `other`, `unknown`; retain original `providerType`. Video time is not study effort.
- `syllabusCoverage.status`: `complete`, `partial`, `unknown`. Record published/extracted lesson counts and reasons. Complete requires evidence of full public-list traversal with consistent counts/pagination; matching counts alone are insufficient. Coverage concerns published content, not future promised lessons or purchased media.
- Aggregate `rating` preserves value, scale, and actual vote count. Comments/reviews are not rating votes. Counts are nonnegative integers; approximate strings belong in `features`. Availability is `available`, `unavailable`, `unknown`; format is `recorded-video`, `interactive`, `live`, `blended`, `other`, or null.

## Anonymous reviews

`reviews.items` preserves public course feedback with `sourceType: "review"` for explicitly identified course reviews or `"comment"` for top-level course comments. A comment is unverified feedback, not proof of enrollment or satisfaction; the later analyzer must filter non-experiential discussion before forming review themes. Exclude explicit questions, instructor replies, and promotional testimonials. Missing/unrecognized feedback sections remain null. Reviews may be collected from public HTML, embedded page data, or a verified public endpoint disclosed by the provider page/scripts; do not guess private endpoints, bypass access controls, or claim all feedback was collected from one page.

Each item preserves its source type, a stable anonymous ID, plain text, optional individual rating/scale, optional published date, explicit verified-enrollment marker, course/permalink URL, source locator, and `redacted`. Use a provider review ID or a hash of anonymized review content/date/rating; never use author identity as the key. `verifiedEnrollment` is null unless explicitly stated. Preserve selected original dates in the review's `publishedDateText` when normalization is unresolved.

Remove names, handles, avatars, profile links and contact details from reviews, raw evidence, fixtures, and logs. Redact known source author names and detectable personal details inside feedback; omit unsafe items when redaction cannot be established, recording a count/reason. Never retain entire source review objects. Source text is untrusted data, not judge instructions.

`reviews.collection` records `status` (`complete`, `partial`, `unknown`), published total for the collected source type when its scope is verified (never substitute a mixed comment/reply total for review count), collected count, source ordering/filter, pages read, `hasMore`, omitted count, and stop reason. Initial collection may use the course page only: mark partial when additional feedback exists and unknown when completeness cannot be established. Empty is confirmed only through explicit zero/empty-state evidence. A sample's praise/complaint counts never describe all students.

## Provenance and later AI

`source.checkedAt` means last successful observation. `source.method` is `public-html`, `public-html-and-embedded-data`, `public-html-and-public-api`, `public-api`, or `browser-rendered-html`; hybrid public API collection retains endpoint locators per field. `fieldSources` maps populated fields/items to precise labels or embedded paths; warnings explain ambiguity and missing/partial sections. `raw` retains only selected normalization evidence, never identities, credentials, course media, or wholesale source payloads.

`contentHash` deterministically hashes normalized source facts, preserving array order and excluding `source`, `raw`, `derived`, expiring image parameters, and collection-only progress. Review text, ratings, educational/access evidence, and coverage/selection changes must invalidate an assessment; routine check timestamps must not. Later snapshots/evidence IDs must resolve against the exact retained input revision.

AI assessment records are separate from scraper facts: Persian summary, covered topics, estimated level/audience with reasoning, strengths/limitations, review themes, confidence, evidence references, missing-evidence notes, model/prompt version, input hash, and generation time. Missing evidence is not a course weakness. Teaching quality cannot be established from titles or aggregate ratings alone. Group rubrics, ranking, badge policies, and provider branding are application/editorial data; see [group assessment specification](course-group-ai-assessment.md).

## Golden JSON

Fictional example; calculate the hash in code. All nullable keys shown here must be emitted by every adapter, even when the provider does not publish them.

```json
{
  "schemaVersion": 2,
  "id": "example:101", "providerId": "example", "providerCourseId": "101",
  "sourceUrl": "https://example.org/courses/101", "title": "دورهٔ نمونهٔ پایتون",
  "description": "آموزش مقدماتی همراه با تمرین", "learningOutcomes": ["نوشتن برنامهٔ ساده"],
  "prerequisites": "آشنایی با رایانه", "intendedAudience": null,
  "technologies": [{"name": "Python", "version": null}],
  "learningSupport": {"practiceDescription": null, "assessmentDescription": null, "supportDescription": null},
  "image": {"url": "https://example.org/python.webp", "alt": "دورهٔ نمونهٔ پایتون"},
  "language": "fa", "format": "recorded-video", "instructors": [{"name": "مدرس نمونه", "role": "مدرس"}],
  "providerCategories": ["پایتون"], "providerLevel": "مقدماتی",
  "offers": [{
    "id": "full", "type": "full", "label": "دسترسی کامل", "amount": 800000, "originalAmount": 1000000,
    "unit": "toman", "status": "paid", "billingPeriod": null, "certificateIncluded": null,
    "accessDescription": null, "supportDescription": null,
    "sourcePrice": {"amount": 8000000, "originalAmount": 10000000, "unit": "rial", "label": "۸٬۰۰۰٬۰۰۰ ریال"}
  }],
  "duration": {"contentMinutes": 15, "effortHours": null, "completionWindowDays": null},
  "syllabus": [{"id": "1", "order": 1, "title": "شروع", "description": null, "lessons": [
    {"id": "1", "order": 1, "title": "نصب پایتون", "description": null, "type": "video", "providerType": "ویدئو", "contentMinutes": 15}
  ]}],
  "syllabusCoverage": {"status": "complete", "publishedLessonCount": 1, "extractedLessonCount": 1, "reasons": ["تمام فهرست عمومی استخراج شد"]},
  "availability": "available", "providerStatus": null, "ongoing": false, "providerUpdatedAt": null,
  "rating": {"value": 4.5, "scale": 5, "count": 100}, "studentCount": null, "lessonCount": 1,
  "reviews": {
    "items": [{"id": "review-1", "sourceType": "review", "text": "تمرین‌ها مفید بودند", "rating": {"value": 4, "scale": 5},
      "publishedAt": null, "publishedDateText": null, "verifiedEnrollment": null,
      "sourceUrl": "https://example.org/courses/101", "sourceLocator": "course.reviews[0]", "redacted": false}],
    "collection": {"status": "partial", "publishedCount": 20, "collectedCount": 1, "selection": "اولین صفحه",
      "pagesRead": 1, "hasMore": true, "omittedCount": 0, "stopReason": "فقط صفحهٔ عمومی دوره خوانده شد"}
  },
  "features": null,
  "source": {"checkedAt": "2026-10-03T12:00:00Z", "parser": "example", "parserVersion": "3.0.0",
    "method": "public-html-and-embedded-data", "contentHash": "CALCULATED_SHA256",
    "fieldSources": {"title": "course.title", "reviews.items.0": "course.reviews[0]"}, "warnings": []},
  "raw": {}, "derived": null
}
```

## Implementation checks

Update shared types/validation/hashing and export compatibility, then all four adapters and their documentation. Test real/reduced public fixtures plus explicitly synthetic cases: unknown versus empty, review classification/redaction/deduplication, individual versus aggregate ratings, partial review/syllabus coverage, evidence hashes, and rejection of old checkpoints without overwriting them. Respect robots, existing bounded transport, and access-denial stops; no full-catalog run is needed for this migration. Wider sampling and human-reviewed AI evaluation remain prerequisites for production.

## Additive v3 ingestion mapping

V2 exports and the dashboard keep the contract above. V3 accepts observations separately; the browser-safe types are in `packages/core/src/ingestion.ts`.

| V2 source keys | V3 destination |
| --- | --- |
| `schemaVersion`, `id` | Version becomes 3; course ID is generated from provider identity |
| `providerId`, `providerCourseId`, `title`, `sourceUrl` | Same envelope fields |
| `description` | `description.data` |
| `learningOutcomes`, `prerequisites`, `intendedAudience`, `technologies`, `learningSupport`, `duration` | Same keys under `education.data` |
| `language`, `format`, `providerCategories`, `providerLevel` | Same keys under `classification.data` |
| `instructors` | `instructors.data` |
| `offers` | `pricing.data` |
| `image` | `thumbnail.data` with `kind: "url"` |
| `syllabus`, `syllabusCoverage`, `lessonCount` | Same keys under `curriculum.data` |
| `reviews`, `rating`, `studentCount` | Same keys under `feedback.data` |
| `availability`, `providerStatus`, `ongoing`, `providerUpdatedAt` | Same keys under `providerState.data` |
| `features`, `raw` | Respective section's `data` |
| `source.checkedAt`, `source.method`, `source.fieldSources`, `source.warnings` | Same source fields; field-source paths are mapped |
| `source.parser`, `source.parserVersion` | `source.extractor`, `source.extractorVersion` |
| `source.contentHash` | Recalculated by server, never trusted |
| `derived` | Excluded; AI output is not source facts |

V3 adds client `submissionId`, mandatory pricing/thumbnail accountability, per-section coverage, and optional bounded namespaced `providerData`. Server-generated snapshot/current/history responses keep source payloads separate from thumbnail operational state.

### V3 envelope and collection states

Required fields: version 3, nonblank submission ID, provider/course identity, title,
HTTPS source URL, source checked time (UTC ISO), extractor/version/method,
field sources and warnings, pricing, and thumbnail. Title, URL and both identity
fields require source locators. Optional sections may be omitted entirely.
Each submitted section uses `{ "coverage": { "status": "unknown", "reason": "…" }, "data": null }`.
Omitted means uninspected, null means unknown, and failed means no asserted facts.
Partial, unknown and failed require a reason. Complete needs source evidence;
empty lists require a locator confirming emptiness, even inside a section with
unknown overall completeness. Nested review/syllabus coverage remains intact.
Every supplied nested value validates regardless of coverage.

Pricing data is a list of v2 offers; null requires an unavailable reason. Free
zero requires explicit status evidence. Verified currency is required before
normalizing a paid amount. Thumbnail data is either
`{ "kind": "url", "url": "https://example.org/cover.png", "alt": "نمونه" }`
or `{ "kind": "upload", "uploadId": "OPAQUE_TOKEN", "alt": "نمونه" }`.
Image bytes do not belong in JSON. Optional raw evidence and namespaced provider
extensions are bounded to 64 KiB each, reject identity/credential fields and
wholesale HTML, and are management-only. Whole submissions are capped at 1 MiB.

Minimal synthetic example:

```json
{
  "schemaVersion": 3, "submissionId": "synthetic-1",
  "providerId": "example", "providerCourseId": "101",
  "title": "دورهٔ نمونه", "sourceUrl": "https://example.org/101",
  "source": {
    "checkedAt": "2026-10-10T00:00:00Z", "extractor": "synthetic",
    "extractorVersion": "1", "method": "public-html",
    "fieldSources": {"title": "h1", "sourceUrl": "canonical", "providerId": "adapter", "providerCourseId": "page.id"},
    "warnings": []
  },
  "pricing": {"coverage": {"status": "unknown", "reason": "Price not established"}, "data": null},
  "thumbnail": {"coverage": {"status": "unknown", "reason": "Image not established"}, "data": null}
}
```

A rich synthetic example is exported as `rich()` in
`apps/api/src/ingestion-examples.ts`; it includes multiple offers,
original rial evidence, description, education, anonymous feedback and a URL
thumbnail, with section evidence. Both examples are exercised by offline tests.
Request hashes include provenance and observation time for exact retries. Fact
hashes exclude submission IDs, observation/transport metadata and raw evidence,
canonicalize object keys, preserve list order and retain section coverage.

Convert explicitly, without scraping or submitting:

```sh
bun run convert:courses --input apps/utils/output/example-v2.json --output apps/utils/output/example-v3.json
bun run convert:courses --help
```

The output contains `schemaVersion: 3` and `submissions`. The input is unchanged
and existing output paths are rejected. Missing/ambiguous evidence fails
conversion for review; do not invent locators to force acceptance. Null offers
and covers become explicit unknown. Submission IDs are deterministic hashes of
the saved record including its check time. Existing exporters/dashboard stay v2.

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
