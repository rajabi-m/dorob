# TopLearn native v3 audit

Inspected October 12, 2026 (Tehran; collection timestamps are UTC). Collector
`ToplearnScraper`/extractor `toplearn` version `3.0.0` constructs v3 sections
without a v2 record, conversion, legacy export, or compatibility adapter.

## Public sources and access

- Paid [n8n](https://toplearn.com/c/6274), canonical `c/6274`, internal CourseId
  `6274`: current course HTML, labeled purchase/details panel, ordered Ep_* list,
  description, breadcrumb, linked public course script.
- Explicitly free [Xamarin setup](https://toplearn.com/c/G7), canonical `c/G7`,
  internal CourseId `19`: same public template. Its four catalog entries include
  one 46-minute lesson and three zero-duration downloadable-resource entries;
  provider labels the catalog as videos, so the original provider type is kept.
- Existing reduced October 2/3 fixtures also cover Kotlin `c/qj2` and the
  verified numeric legacy alias `c/41` (CourseId `37`). Those are historical
  parser fixtures, not claims about current prices or the live acceptance sample.
- [robots.txt](https://toplearn.com/robots.txt) allows `/` and discloses
  `https://toplearn.com/sitemap.xml`; only the index/course sitemap family is
  selected. Controlled requests follow robots, redirect, retry and cancellation
  policy; no authenticated requests or user-state forms are used.
- The page links [site.SingleCourse.min.js](https://toplearn.com/Site/js/site.SingleCourse.min.js).
  Its `loadComments` builds `/courses/` + CourseId + `/Comments?pageId=` + page,
  increments pages from one, and reads `CommentPageState` attributes `pageCount`
  and `currentPage`. The collector verifies this disclosure before calling the
  course-specific route, and follows only that evidenced pagination.
- [Paid comments page 1](https://toplearn.com/courses/6274/Comments?pageId=1) and
  [free comments page 1](https://toplearn.com/courses/19/Comments?pageId=1) returned
  the provider's “page not found” HTML during collection. This is unrecognized
  feedback, not an empty list. No alternate endpoint was guessed. No public
  Course JSON-LD aggregate rating/review data was found in either live page.
  Browser-search indexing can show older n8n counts/prices; fresh controlled
  source observations, not search-cache values, are delivered.

## Field/evidence/coverage matrix

A section's coverage describes inspected source completeness, not a guarantee
that every nullable field is published. Every populated fact has its section
or item locator in `source.fieldSources`; individual review locators remain in
items. The matrix lists all required fact groups, including unknown fields.

| Field/group | Public source / locator | v3 representation and coverage / gap |
| --- | --- | --- |
| Identity/provenance | `input#CourseId`, `.course-page-header h1`, canonical link; ID-bearing `og:url` on legacy alias | Stable provider/internal IDs, canonical source URL, fresh UUID, checkedAt, extractor/version and evidence. Numeric aliases require controlled canonical-page proof matching ID/title/canonical/OG identity. Inconsistent core fails. |
| Purchase prices/currency | `.course-details-layer .course-price .price-amount`, `del`, duplicate public price panels; `og:price:currency` | Paid/free/subscription/unknown offers retain source amount/unit/label and discount. Explicit matching purchase تومان/ریال labels establish normalization; generic IRR SEO conflict is a warning. Disagreeing purchase panels withhold amounts. Missing/ambiguous zero is never free. |
| Billing/certificate/access/support terms | Explicit VIP link plus purchase label; inspected purchase/details/description | VIP subscription label retained when present; billing period and certificate remain unknown. No fixed access duration, certificate, or support entitlement is invented. |
| Thumbnail | `.course-content-layer .img-layer img` | HTTPS source image/alt; thumbnail input complete when present. Live API processed both to hosted ready WebP. |
| Description | `.course-content-text` | Plain-text published description, complete recognized source section. No raw HTML or signed video URLs retained. |
| Outcomes | Explicit `اهداف یادگیری`, `آنچه یاد خواهید گرفت`, or `خروجی بوت‌کمپ` heading/strong label and its body | Labeled statements only, nullable education field; general topic/marketing prose does not create outcomes. n8n publishes an explicit inline bootcamp-output label. |
| Prerequisites | Course-specific prerequisite heading and following ol/ul | n8n “none” statement retained; absent free-course prerequisite remains null. |
| Audience/technologies | Explicit audience headings; inspected description/details/structured course data | Recognized audience statements retained when explicit. No distinct technology/version list published in live templates; technologies unknown rather than inferred from titles. |
| Practice/assessment/support | Explicit practice/project, assessment/feedback and support headings | Exact labeled bodies supported in synthetic cases. No formal assessment, practice requirement or contractual support claim found in live samples; remain null. |
| Content/effort/completion durations | `مدت زمان دوره` HH:MM:SS and per-Ep `.course-time-left` | Content minutes preserved separately from unknown effort hours/completion window. Zero-duration resource entries stay zero as published. |
| Classification/format/language | Breadcrumb links containing `categories=`, `سطح دوره`, `تعداد ویدیوها`; optional `زبان دوره` label | Provider categories/level and recorded-video catalog format retained. Persian site language does not establish course language; language null without course label. |
| All instructors | Every labeled teacher row/span; course-scoped JSON-LD instructor and all `hasCourseInstance.instructor` entries | All distinct explicitly published names/roles preserved. Both live samples publish ایمان مدائنی. Synthetic multi-instructor fixture proves no first-instructor-only truncation. No reviewer/profile personal data retained. |
| Ordered curriculum | `.video-list-layer #Ep_*`, h2, description, duration, heading, source order | Flat provider catalog preserved as one chapter, all lesson IDs/order/titles/descriptions/types/durations. Complete only after server-rendered traversal, no loading/paging controls and matching published count. Missing/list mismatch/pagination/bounds is unknown/partial. Malformed optional list is failed while core/pricing survive. |
| State/availability/update | `وضعیت دوره`, explicit course registration link; inspected detail HTML | Ongoing/completed source label and ongoing flag retained; registration CTA supports available. No verified provider-update timestamp found; no calendar/timezone guess. |
| Enrollment | Explicit course `تعداد دانشجویان` detail label if present | No enrollment count published in inspected live samples; studentCount null. Comment/rating counts never substitute. |
| Comments/reviews/individual ratings | Course-attached JSON-LD `Course.review`; disclosed Comments response, explicit Comment/Review semantic microdata | Anonymous source-classified text/individual scale/date/order/locator when evidenced. Live route unavailable, items/collected count unknown. Questions/replies/staff/unsupported candidates excluded; author names/contact/handles/links redacted. Semantic fragment support is synthetic fallback coverage, not a claim that live TopLearn exposes that markup. |
| Aggregate score/scale/votes | Matching Course JSON-LD aggregateRating with explicit bestRating/ratingCount | No live aggregate data found. Explicit score plus scale required; absent scale stays unknown. ratingCount is distinct from reviewCount or sampled item size. Tested synthetically with 100 votes and independent 8 review total. |
| Feedback published/collected count and pagination | `aggregateRating.reviewCount`; `CommentPageState.currentPage/pageCount`; accumulator | No published feedback count in live sample. Page-count is never item-count. Confirmed empty requires an explicit recognized exhausted list; 404 stays unknown. Bounds default 10 pages/500 items, configurable max 2,000 items; embedded recognized page counts toward limit. Duplicates removed, exclusions/bounds/failure keep partial/unknown with stop reason. |
| Features | Course video-list explicit online-viewing/half-price internet statement | Published labeled feature retained, partial coverage. No blanket provider policy imported as course facts. |
| Sanitized extras | CourseId, canonical, purchase/duration labels and SEO currency | `providerData.data['toplearn.public']`, partial selected anonymous evidence; no full source HTML, reviewer identity, forms/tokens, video/private URLs. |

## Offline checks and implementation boundaries

Twenty focused TopLearn tests pass: paid/free/rial/unknown/conflicting prices,
required identity/verified alias, rich/sparse educational claims, multi-instructor
preservation, ordered/count-mismatched/malformed curricula, fresh IDs, anonymous
course-scoped reviews, semantic comments, separate rating counts, deduplication,
exclusions, explicit empty vs unknown, two pages, item/page limits, later ordinary
failure with independent aggregate facts, denied access and thin CLI help.
Large synthetic 700-item feedback retains 500 and records 200 omissions; evidence
stays below 4,000. Source/evidence bounds may reduce further retained items with
an explicit `field-evidence-limit` reason; curriculum has an explicit 2,000-item
bound with partial coverage. Utility lint/type checking pass. Shared ingestion
CLI tests verify human/JSON output, provider-specific recovery, incompatible
checkpoints/settings, replay and image-only recovery.

Removed `scrape-toplearn.ts` and TopLearn-only export/resume tests; entry point
`ingest-toplearn.ts` uses the shared explicitly invoked API worker. No
Maktabkhooneh, shared converter/contracts, frontend, editorial membership,
checkpoint deletion, branch or commit was changed by this provider agent.

## Live ingestion and replay evidence

Private ignored journals/reports use `apps/utils/output/migrate-toplearn-v3-*`.
The initial paid/free CLI accepted two observations and produced two ready
thumbnails; management history, exact payload and public list/detail were read.
Both hosted URLs returned HTTP 200 `image/webp`. Title search finds both courses
without editorial membership/filter changes.

| Source / stable course | Initial submission | Initial snapshot | Initial checkedAt UTC |
| --- | --- | --- | --- |
| `c/6274` / `toplearn:6274` | `f98d07db-c673-4148-b131-ed6e649d9ccd` | `66398889-a319-4ff7-bfd6-2bd08cc0ee3e` | `2026-10-11T21:52:00.526Z` |
| `c/G7` / `toplearn:19` | `ea983802-98a3-4be2-94a6-a8b84e8b718b` | `3f0a3042-1f20-4ecc-9992-f3ee9fd3bf09` | `2026-10-11T21:52:06.522Z` |

Same-checkpoint resume reported zero collection/new acceptance/replay, skipped
ready images and left each history total at one. Fresh-parser refresh and browser acceptance are recorded below.

## Refined observations and final acceptance

- `toplearn:6274`: submission `0a8282d5-5c61-47d8-8ff5-2ec7eadd075c`, snapshot `997f5e13-800e-4c61-a5f7-4d4be32b7768`; management/current public detail match, presentation ready, hosted WebP HTTP 200.
- `toplearn:19`: submission `873e12ed-c000-4916-9bda-fdc9278f1ce4`, snapshot `88e56dea-f20a-4392-9017-d2e1adb87bcd`; management/current public detail match, presentation ready, hosted WebP HTTP 200.

Coordinator repeated the completed refresh/refined checkpoint resume: exit 0, saved collected/accepted 2/2, no recollection or new acceptance. Real paid/free fields and anonymous feedback coverage remain as documented above. Final provider regression counts: TopLearn 20, Sabzlearn 13. Combined utility suite: 134 passing tests. Large curriculum/max-feedback regressions preserve independent facts within evidence/payload bounds with explicit omission reasons.

Coordinator verified both real details at desktop and Chrome responsive 390×844. Correct instructor, ordered curriculum, source link and paid/free offers are available. Persian text and mixed Latin N8N/Xamarin descriptions wrap without visible horizontal overflow. The mobile card opens via Enter, close receives initial focus, Tab reaches the actual source link, and Escape returns focus to the invoking action. Both hosted thumbnails and provider labels appear on real cards. The existing blank/capture interruption cleared in a fresh Chrome tab; no frontend workaround was added.
