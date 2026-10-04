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

## Backend revision policy

Milestone 2 imports and bounded provider jobs share the validated persistence path. Immutable retained inputs preserve this full contract, unknowns and original currency evidence. The backend evidence digest excludes `source.checkedAt` and `source.contentHash`, and includes every other retained field. It is deliberately broader than the adapter's normalized-fact hash: changed provenance/raw/offer/availability/feedback or image URLs can require reapproval even without educational text changes. Unchanged success records freshness, failures/older success never replace current facts, and changed current evidence inserts a transactional group invalidation request. Membership reapproval and publication remain explicit operator actions. See [revision handling](backend-operations.md#revision-invalidation-and-operator-approval).
