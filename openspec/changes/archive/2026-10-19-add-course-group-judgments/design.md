# Design

## Context

See `proposal.md` for motivation and scope. The accepted Python mock provides the content vocabulary, not the live catalog format. It still uses page-local fixture IDs, prices, ratings and assessments. The uncommitted badge preview is separate work and is not modified by this planning change.

The API already has paginated management groups, explicit memberships, immutable v3 `course_snapshots`, canonical IDs (`provider:providerCourseId`), a current-snapshot pointer, and separate suggestion/embedding ledgers. Management group details contain minimal references. Public course summaries omit the richer educational/comment evidence needed by a judge. `CourseIngestion` provides section-level coverage and `feedback.data.reviews.items` contains both `review` and `comment` items despite its property name.

No current main spec defines quality judgments. `docs/course-group-ai-assessment.md` is an older draft, not a production contract: its deterministic weighted ranking, extra badges, visible evidence notices and ranking reasons conflict with the latest owner decisions. This design uses AI-owned order and the four selected tags. Implementation will mark the historical draft's superseded portions explicitly, without treating them as implementation prerequisites.

## Goals / Non-Goals

**Goals:** Provide one backend standard for evidence reads and retained generated content, with exact revision binding and safe retries. Keep facts and generation separate so later frontend work can join them without interpreting arbitrary AI page markup.

**Non-Goals:** Calling or choosing a model; building a judge agent/worker/prompt; discovering group membership; recrawling feedback; publishing or approving judgments; exposing public judgment APIs; changing frontend pages; numerical ranking; calibrating popularity or price thresholds. No new scores, confidence percentages or ranking reasons are required.

## Decisions

### 1. One new capability; additive management routes

Use `course-group-judgments`. Do not extend the suggestion inbox: a complete group judgment is different from a proposed course membership. Reuse the existing group discovery endpoint rather than inventing another queue.

| Method and path | Purpose |
| --- | --- |
| GET `/api/v1/manage/groups` (existing) | Discover groups with existing search/category/publication filters, including drafts |
| GET `/api/v1/manage/groups/:id/judge-input` | Context, revision, submission readiness, output vocabulary and ordering rule |
| GET `/api/v1/manage/groups/:id/judge-input/courses` | Page through all member references and snapshot pointers |
| GET `/api/v1/manage/groups/:id/judge-input/courses/:courseId` | Full whitelisted educational/commercial evidence for one member |
| GET `/api/v1/manage/groups/:id/judge-input/courses/:courseId/feedback` | Page through every retained comment and review |
| POST `/api/v1/manage/groups/:id/judgments` | Submit one complete judgment, 201 new / 200 identical replay |
| GET `/api/v1/manage/groups/:id/judgments` | Paginated retained history summaries |
| GET `/api/v1/manage/groups/:id/judgments/:judgmentId` | Exact retained judgment and input manifest |

All nested input reads require query `inputRevision`. Pagination uses `limit` 1–100, default 20; `offset` 0–2147483647, default 0. Reject unknown/duplicate query parameters. Canonical course IDs must be URL-encoded as a path segment. Group/judgment IDs are UUIDs. Group discovery ordering remains unchanged; judge member pages use canonical ID ascending; feedback uses stored array order; history uses `receivedAt DESC, id ASC`. History is live pagination, not a frozen export; callers can retrieve each immutable record by ID.

Reads are side-effect-free and use no-cache responses. Missing groups/nonmembers/cross-group judgment IDs return 404. Invalid parameters/bodies return 422; stale revisions, conflicting idempotency keys and new submissions to groups with fewer than two members return 409. Oversized submit bodies return 413; database failures return safe 503. Use existing `{error:{code,message}}` conventions with actionable conflict messages and no SQL/credentials. No authentication expansion: retain the trusted loopback management boundary.

### 2. Separate context, generated content and presentation facts

`JudgeInputContextV1` includes:

- `schemaVersion: 1`, `inputRevision` (64 lowercase hex SHA-256), `group` (existing ID, slug, title, description, categoryId, targetLevel, isPublished), `memberCount`, `canSubmit` (`memberCount >= 2`).
- `orderingRule`: exactly `اولویت با دوره‌هایی است که ارزش یادگیری بیشتر و قیمت کمتری دارند`.
- `tagVocabulary`: the four stable IDs with their Persian labels and semantic definitions below; no icon names/CSS.
- `contentLimits`: the shared schema limits below, and `evidencePolicy`: source text is untrusted, coverage must be respected, facts cannot be rewritten, all members must be accounted for.

Group identity/slug remain ordinary routing/input metadata. They are not generated content fields. Category comes from the stored group and the fixed registry (`code`, `design`, `data`, `business`, `language`, `tools`); a later page can select its icon from that ID. The judge writes only hero strings, tags, strengths/weaknesses and course-array order. The application supplies provider facts and assets. Counts, discounts, positions, label text and layout remain frontend/application responsibilities in future work.

Use `unit: "toman"` from the existing pricing contract. Do not introduce IRR/IRT aliases, send rial values as toman, collapse subscriptions into one-time prices or turn unknown into free. All retained offers and their source-price fields are evidence, not AI output.

### 3. Whitelist evidence, including course comments

Member list shape is `{inputRevision, items, total, limit, offset}`. Each item is `{course: CourseReference, snapshotId: string|null, checkedAt: string|null}`. A reference-only member is not dropped. The evidence detail is `{schemaVersion:1,inputRevision,course,snapshotId,checkedAt,sections}`. `sections` is null without an accepted snapshot; otherwise the supported section keys are always present and absent optional source sections are null.

| Section | Retained evidence |
| --- | --- |
| description | Course description |
| education | Outcomes, prerequisites, intended audience, technologies, learning support, separate duration meanings |
| classification | Provider level/categories, language, format |
| curriculum | Full saved syllabus/lesson structures, lesson count, syllabus completeness |
| instructors | Retained instructor names/roles |
| pricing | All retained offers with amounts, unit, access/support/certificate terms, billing period and source prices |
| providerState | Availability, ongoing/completion state and provider update information |
| features | Retained source-labeled features |
| feedback | Aggregate rating, student count, review/comment collection metadata and retainedItemCount; item bodies are on the feedback endpoint |

Each available section retains `{coverage:{status,reason},data}` semantics from v3. Unknown is not confirmed-empty. Do not invent provider fact defaults. Include educational duration/lesson counts as judge evidence even though the simplified frontend does not render all of them. Public-thumbnail readiness does not gate judge evidence: no image inspection or downloading is needed here.

Feedback response:

```json
{
  "schemaVersion": 1,
  "inputRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "courseId": "provider:course-id",
  "snapshotId": "00000000-0000-4000-8000-000000000001",
  "coverage": { "status": "partial", "reason": "Only retained source pages are available" },
  "collection": {
    "status": "partial",
    "publishedCount": 120,
    "collectedCount": 35,
    "selection": "newest",
    "pagesRead": 2,
    "hasMore": true,
    "omittedCount": 0,
    "stopReason": "page-limit"
  },
  "itemsKnown": true,
  "items": [
    {
      "id": "retained-comment-id",
      "sourceType": "comment",
      "text": "تمرین‌های دوره برای من مفید بود، اما بخش پایانی سریع توضیح داده شد.",
      "rating": null,
      "publishedAt": null,
      "publishedDateText": null,
      "verifiedEnrollment": null,
      "redacted": false
    }
  ],
  "total": 35,
  "limit": 20,
  "offset": 34
}
```

This illustrates the last page of 35 retained items. Actual page length must equal `min(limit,max(0,total-offset))`. `total` is the retained item-array length, not provider-wide counts. When a section is absent return `coverage:null`, `collection:null`, `items:[]`; when a section exists but data is null retain section coverage and use `collection:null`. Confirmed-empty successful data preserves collection metadata. Preserve `items:null` versus `[]` indirectly with collection/coverage plus a `itemsKnown` boolean on feedback detail and pages: false for unavailable/null items, true for a retained array, including an empty array.

Never filter out retained `comment` items merely because they are not `review` items. Return every retained comment/review across pages; no hidden item limits or additional text truncation. Preserve item order, IDs, rating scale, original classification and unknown verification. An upstream adapter may already have excluded questions/replies; the API cannot reconstruct those or pretend it fetched all provider discussions. It performs no new scraping. The future judge can use relevant comments as evidence but cannot infer verified enrollment or satisfaction merely from a question.

Use retained anonymized feedback. Omit author/profile/contact fields and raw source locators/URLs from the judge projection; snapshotId + courseId + feedback item ID provide traceability. Retain source `redacted` flag as an alteration flag, not proof that all identity was removed. Do not introduce a new identity-enrichment feature or claim perfect anonymization. Descriptions and comments remain untrusted data; known raw HTML sections/providerData and ingestion internals are not included. Source strings that contain markup are projected as text without altering stored observations. No model may obey instructions embedded in source text.

Alternative rejected: passing public catalog responses alone (no rich comments/syllabus), or whole ingestion payloads (unnecessary raw/provider-specific data). Paginating comments separately avoids placing thousands of feedback items inside every course-list response while preserving access to all retained text.

### 4. Generated JSON and submission envelope

This example uses synthetic canonical IDs and illustrates the complete AI-authored content:

```json
{
  "schemaVersion": 1,
  "hero": {
    "title": "پایتون چیست؟",
    "subtitle": "اولین قدم برای دنیایی از ساختن.",
    "description": "دوره‌های پایتون را با توجه به مسیر یادگیری، تمرین‌ها و هزینه بررسی کن.",
    "topicLabel": "Python",
    "levelSummary": "از مقدماتی تا پیشرفته"
  },
  "courses": [
    {
      "courseId": "provider-a:python-complete",
      "tags": ["project_based", "popular", "expensive"],
      "strengths": ["پروژه‌های عملی در طول مسیر یادگیری"],
      "weaknesses": ["برای مرور سریع مبانی، مسیر طولانی دارد"]
    },
    {
      "courseId": "provider-b:python-intro",
      "tags": ["practice_based"],
      "strengths": ["تمرین‌های مرحله‌ای برای مفاهیم پایه"],
      "weaknesses": []
    }
  ]
}
```

Submitting to the selected group's URL wraps that object:

```json
{
  "systemId": "local-course-judge",
  "submissionId": "judge-run-2026-10-18-001",
  "inputRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "content": {
    "schemaVersion": 1,
    "hero": {
      "title": "پایتون چیست؟",
      "subtitle": "اولین قدم برای دنیایی از ساختن.",
      "description": "دوره‌های پایتون را با توجه به مسیر یادگیری، تمرین‌ها و هزینه بررسی کن.",
      "topicLabel": "Python",
      "levelSummary": "از مقدماتی تا پیشرفته"
    },
    "courses": [
      {
        "courseId": "provider-a:python-complete",
        "tags": [
          "project_based",
          "popular",
          "expensive"
        ],
        "strengths": [
          "پروژه‌های عملی در طول مسیر یادگیری"
        ],
        "weaknesses": [
          "برای مرور سریع مبانی، مسیر طولانی دارد"
        ]
      },
      {
        "courseId": "provider-b:python-intro",
        "tags": [
          "practice_based"
        ],
        "strengths": [
          "تمرین‌های مرحله‌ای برای مفاهیم پایه"
        ],
        "weaknesses": []
      }
    ]
  }
}
```

Examples use synthetic IDs/revisions; callers must substitute the IDs and revision from their actual reads. Swagger must provide the same structurally valid object shape. `systemId` and `submissionId` are caller transport metadata; server generates judgment ID and receivedAt. No systemName/model/provider credentials required. Attribution is not authenticated identity.

Contract limits (proposed implementation defaults, now explicit for compatibility):

| Field | Rule |
| --- | --- |
| All object shapes | Required documented properties only; reject extras recursively |
| schemaVersion | Integer literal 1 |
| hero.title | Nonblank plain text, 1–120 characters |
| hero.subtitle | Nonblank plain text, 1–180 characters |
| hero.description | Nonblank plain text, 1–2000 characters |
| hero.topicLabel | Nonblank plain text, 1–80 characters; Latin technical labels permitted |
| hero.levelSummary | Nonblank plain text, 1–120 characters |
| courses | At least 2 entries, bounded by the 8 MiB request limit, exactly the revision's member set, no duplicates |
| courseId | Existing canonical course-ID validation, maximum 265 characters |
| tags | 0–4 unique enum values |
| strengths / weaknesses | Each 0–5 nonblank plain-text strings, maximum 500 characters per bullet |
| systemId | 1–100 ASCII lowercase letters/digits/hyphens, starts with letter/digit |
| submissionId | 1–200 nonblank characters, no control characters |
| inputRevision | 64 lowercase hex characters |
| POST body | Maximum 8 MiB decoded UTF-8 JSON; reject 413 before persistence |

Character limits follow the shared validator's JavaScript string-length convention; reject embedded control characters except normal whitespace in prose. Plain text excludes HTML tags and Markdown structures; no arbitrary rendered markup. Persian content is a producer obligation, allowing technical terms; structural validation is not a language-detection model. No forced minimum bullet count or fabricated missing-data fallback. No display copy like «نمونه» or «برای مثال» is inserted by backend defaults.

### 5. Ordering and tag semantics belong to the judge

`courses` array order is the recommendation. No rank/position duplication, numeric scores, rankingReason or AI-produced pricing. Never sort on readback. An expensive course may rank first: judge educational value and price together, not “cheapest wins” or automatic penalty. AI may use missing-evidence information internally, but not fill weakness bullets with scraping/implementation complaints.

| ID | Persian label | Producer meaning / future presentation |
| --- | --- | --- |
| project_based | پروژه‌محور | Meaningful learner projects supported by evidence; existing neutral/accent badge |
| practice_based | تمرین‌محور | Structured learner exercises supported by evidence; existing neutral/accent badge |
| popular | محبوب کاربران | Supported favorable learner response using ratings/comments/reviews, not enrollment alone; rose heart |
| expensive | پر هزینه | Comparatively high cost within relevant group offers/access terms, not simply paid; amber wallet |

The API validates enum/shape/set coverage; it does not prove educational value, compare prose to source or determine numerical eligibility thresholds. It stores a caller-supplied judgment. A later judge implementation spec must operationalize the qualitative rule and evidence handling; this proposal does not freeze arbitrary quantiles, weights or vote thresholds. Strengths/weaknesses must concern the course. Absent syllabus topics require adequate coverage evidence; negative review themes require actual feedback, not inferred dissatisfaction.

### 6. Revision consistency without writing on GET

Compute SHA-256 over canonical JSON of input schema/projection-policy version, group ID/slug/title/description/category/targetLevel/isPublished, and the complete canonical-ID-sorted member manifest `{course reference fields, snapshotId|null}`. Current immutable snapshot IDs conservatively invalidate judgments on any newly accepted observation, including comment-only or price-only changes. Coverage and feedback changes are covered by the snapshot pointer. Exclude generated time, pagination, current thumbnail-processing state and access timestamps. Any projection/normalization change must bump its policy version and invalidate prior input revisions.

All input reads compute context and requested data in a repeatable-read transaction. Require the supplied revision to match within that transaction. Caller fetches context, all member pages, course details and all feedback pages using that revision; a 409 restarts the traversal. No frozen-input records or database writes on GET are necessary: immutable observations plus recomputed revisions suffice.

Submission uses a dedicated consistent transaction (repeatable-read or stronger, not the existing default read-committed write helper) for group/member/source checks and insert. Serialize identical idempotency keys with a transaction-scoped lock; exact replay lookup precedes stale checks. Compare revision and exact course set in the same transaction and store the computed manifest. Do not change isolation behavior of unrelated repositories. A source update after this transaction's snapshot may make the result immediately stale; subsequent freshness reads expose that. The contract guarantees one consistent acceptance point, not that sources remain unchanged afterward.

Alternative rejected: caller-supplied source facts (can be fabricated), timestamp-only freshness (misses member/course changes), read-time manifest writes (violates read-only API), or opportunistic partial results (cannot establish group order).

### 7. Durable immutable records and readback

Use an additive `course_group_judgments` table in the next available migration. Store server UUID, group foreign key, systemId, submissionId, requestHash, inputRevision, server timestamp, accepted group context, complete input manifest and content JSONB. Enforce global unique `(system_id,submission_id)`, JSON object shape and revision/hash formats; application validation owns detailed content schema and exact member-set checks. Snapshots already persist immutably; the manifest records course/snapshot pairs including nulls. New judgments never UPDATE source snapshots or prior judgments. Migration reruns do not seed records or alter memberships.

Hash the validated request's semantic JSON with sorted object keys and preserved array order; do not trim/rewrite accepted content. JSON key order is irrelevant, array order is significant. Same key + same URL group/revision/content returns original record; differing group or content returns 409. Concurrency handling must re-read the committed winner on retries rather than leaking unique/serialization errors. Database exceptions are rolled back and translated safely.

Read detail: `{id,groupId,systemId,submissionId,receivedAt,inputRevision,groupContext,inputManifest,content,isCurrent}`. groupId in this server envelope is not an AI content field. `inputManifest` includes projection-policy version and sorted member course/snapshot references; it permits replay against historical snapshots. `isCurrent` is computed, never stored into/rewrite the immutable content. Replay returns 200 with this record and current freshness. A successful new response can be current at its transaction snapshot and become stale immediately after; do not assert a timeless freshness guarantee.

History uses `{items,total,limit,offset}` of metadata summaries (id,groupId,systemId,submissionId,receivedAt,inputRevision,isCurrent); full content is by ID. No current-winner pointer, approval state, deletion, merge, public export or last-write-wins publication is introduced. A later frontend spec chooses how/when a retained current judgment becomes public page data.

### 8. Integration and validation

Add browser-safe contracts/validators under `packages/core/src/group-judgments.ts` and exports; use one schema source for runtime boundaries and OpenAPI. Add source projection, repository and route modules under `apps/api/src`, dependency-injected through `createApp` like existing management features. Keep ingestion/worker/provider code out of core and API projection imports.

Test boundary semantics offline and persistence against the existing isolated PostgreSQL helper. Exercise actual comments-only and mixed-comment fixtures, feedback pagination beyond 100, missing/partial sections, stale reads and submits, exact retries after staleness, concurrent replay, rollback, restart readback, no catalog mutations, safe errors and Swagger. The expensive-first example must survive acceptance/readback unchanged. No live judge/network collection needed.

## Risks / Trade-offs

- Caller-supplied prose and ordering can be poor or ungrounded → preserve exact evidence revision and attribution; do not represent API acceptance as verified AI quality or publication.
- Retained comments may be partial or adapters may already exclude items → expose stored collection metadata and all retained items; do not claim provider-complete collection or add scraping here.
- Unknown evidence and group scope can limit recommendations → permit empty tags/bullets; expose missing sections to the judge instead of fabricating facts.
- Large syllabi remain sizable → course-detail reads isolate each record and feedback is paginated; do not silently truncate. Performance tests cover large retained snapshots and many-member groups.
- Source changes during a long read require retries → explicit revisions prevent mixed evidence; frozen job orchestration can be added later if needed.
- Local management is unauthenticated → keep loopback trust documented; public exposure/auth and external-agent access need a separate change.

## Migration Plan

On explicit apply: add the next numbered migration, run normal migration tests against an isolated database, then integrate routes and docs. Do not run against the user's working database during planning. Deployment rollback disables the new routes while retaining the additive judgment table and data; no destructive automatic down migration. Prior app versions ignore the new records. Source/membership/publication fingerprints must remain unchanged in acceptance tests.

Update README, Plan, catalog documentation, validation evidence and the historical assessment draft during implementation to identify the authoritative standard and superseded proposals. No production code, main specs, existing docs or frontend preview changes are made by this proposal step.
