# Sabzlearn native v3 audit

Audited October 12, 2026 (Tehran; successful observation timestamps fall on October 11 UTC). This is observed public provider data, not sample editorial facts or AI-derived descriptions. Collector version `3.0.0`; no v2 record construction or conversion is used. The sole Maktabkhooneh import is its existing pure Nuxt decoder, without altering that file.

## Inspected public sources

- Paid [Python](https://sabzlearn.ir/course/python/) and explicitly free [HTML](https://sabzlearn.ir/course/html-tutorial/): rendered HTML, matching `__NUXT_DATA__.data.course-{slug}`, embedded `courses-{slug}-comments`, course-scoped JSON-LD scripts where present, all published course `teacher` entries and `chapters[].episodes`.
- [Provider robots](https://sabzlearn.ir/robots.txt), [API robots](https://api.sabzlearn.ir/robots.txt): controlled origin policy applies to all requests; API publicly permits crawling.
- Public course page links [entry module](https://sabzlearn.ir/_nuxt/Cw6YDbuO.js), which discloses [course module](https://sabzlearn.ir/_nuxt/D0hYGc8A.js) and [comment module](https://sabzlearn.ir/_nuxt/Dk9Iuuxw.js). Runtime configuration discloses `https://api.sabzlearn.ir/api`; comment module explicitly requests `/v1/{type}/{slug}/comments`, `per_page=12`, and `page=current_page+1`.
- Course-specific anonymous supplementary sources: [Python comments page 2](https://api.sabzlearn.ir/api/v1/courses/python/comments?page=2&per_page=12), [HTML comments page 2](https://api.sabzlearn.ir/api/v1/courses/html-tutorial/comments?page=2&per_page=12), and subsequent evidenced pages up to configured limits. No authenticated endpoints, lesson media, user endpoints, or featured comments from unrelated courses are requested.

## Field and coverage matrix

| Group / native representation | Public locator | Coverage and limitation |
| --- | --- | --- |
| Identity/provenance | Matching embedded `slug`, numeric `id`, `title`; final canonical `/course/{slug}/` URL | Required validated identity; new observation/submission IDs on fresh collection; independent checked-at time. |
| Pricing / original price / currency | Embedded `is_free`, `original_price`, `discounted_price`, `is_sale_stopped`; balanced rendered purchase div after course h1 | Free requires explicit `is_free`; paid toman/rial conversion requires matching purchase amount/unit. Conflicting units and ambiguous zero remain unknown. Disabled sale yields evidenced empty offers. Python 3,500,000 toman, original 7,000,000; HTML explicitly free. |
| Certificate / billing / access terms | `course_watch_type`; explicit access FAQ or full-content heading | Watch/access prose retained; no inferred certificate, subscription or billing period. Unpublished fields null. |
| Thumbnail | `thumbnail.url`, `thumbnail.alt` | Complete source thumbnail when safe HTTPS; hosted readiness independently verified below. |
| Description | `full_content`, fallback `description` | Plain source text retained, no raw HTML; 6,401 / 7,780 characters in initial paid/free observations. |
| Outcomes / audience / prerequisites | Explicit educational headings/list items and relevant FAQ question/answer; `course_prerequisites` | Original prose retained under explicit headings only. Python outcomes and audience preserved; HTML audience preserved. Empty prerequisite array alone does not assert no prerequisite; explicit “ندارد” prose does. |
| Technologies / language / level | Inspected embedded course fields and full-content educational sections | Unknown absent explicit supported fields; mention of Python, HTML5 or marketing skill levels does not establish structured version/language/level. |
| Practice / assessment / support | Explicit project/practice/support headings and support FAQs | Published prose preserved. Assessment requires explicit assessment in heading and body; a heading listing “ارزیابی” with body describing only videos does not establish assessment. |
| Content / effort / completion durations | `total_duration` matched to visible hours label; episode `duration` in mm:ss | Python 78h, HTML 7h. Effort hours and completion-window days unknown. Zero episode duration retained without inferring exercise type. |
| Classification | `category.name`; explicit prerecorded-video prose/FAQ | Provider category retained; recorded format only when explicit, other classification unknown. |
| All published instructors | `teacher`; array `teacher`, `teachers` or `instructors` when explicitly published | Live Python رضا دولتی; HTML حمیدرضا عبادی. Synthetic multi-instructor test retains both published entries; none invented for live pages. |
| Curriculum | Ordered `chapters[].id/title/description/episodes_count/episodes[]` and lesson id/title/description/has_video/duration | Python 246 lessons, HTML 40; embedded counts match but completeness remains unknown absent independent exhaustion proof. Count mismatch partial; malformed optional curriculum failed with independent price/identity retained. No disclosed additional public chapter pagination observed in linked course module. |
| Availability / status / update | `is_sale_stopped`, `status`, `last_update` | Availability and recognized ongoing/completed states retained. Jalali update text preserved in `providerData['sabzlearn.course'].lastUpdateJalali`; normalized timestamp null. |
| Enrollment | `students_enrolled` | Published enrollment count retained, separate from rating votes and comments. |
| Comments / reviews / individual ratings | Embedded items and disclosed public comments API; matching Course JSON-LD `review` when present | Public items remain anonymous `comment`; no verified enrollment inferred from user role. Questions, nested replies and staff excluded conservatively; rhetorical question filtering can omit feedback. JSON-LD Review classification/rating only when explicit. Authors/contact/handles/URLs redacted. Jalali comment date text retained without timestamp conversion. |
| Aggregate rating / scale / vote count | `rating_score`, rendered single score; matching Course JSON-LD aggregateRating when published | Live raw rating score 5, but no bestRating/scale or ratingCount found in course HTML/embedded data/course module/comments responses. Confirmed aggregate rating remains null; raw score retained with evidence. Explicit JSON-LD score+scale+ratingCount supported/tested; reviewCount and comments_count never rating votes. |
| Published / collected feedback counts | API pagination `total`, `current_page`, `has_more_pages` | Mixed total remains sanitized provider extra, never review total. Pages include embedded first page. Dedup preserves source order; distinct original item locators/source URLs retained. Explicit exhausted zero list yields complete empty feedback; absence remains unknown. |
| Features / provider extras | `subtitle`, `completion_percentage`, `bulk_download`, `is_presale`, `is_ai_enabled`, `is_comments_disabled`, mixed `comments_count`, raw source prices/date/duration/score | Only bounded allowlisted anonymous scalars retained under `providerData['sabzlearn.course']` with source locators; no user state, avatars, related-course blobs or raw HTML. Features stay unknown when no explicit feature list is published. |

## Bounds, failures and checks

Defaults are ten pages (embedded page counts) and 500 retained items, configurable and persisted by the shared CLI. Items have one precise evidence locator each; rich curriculum evidence and other source fields remain below 4,000 in the real sample (initial Python 1,918, HTML 468). Repeated source IDs deduplicate without reordering. Later ordinary failures retain prior items and independent facts with `later-page-failed`; access denial and cancellation propagate. Limit/exclusion prevents complete coverage. Ingestion retains one whole observation; accepted partial feedback requires a fresh checkpoint for enrichment, not image-only replay.

Focused tests cover paid/free/unknown/conflicting pricing, native fresh IDs, ordered curricula and optional failures, explicit educational extraction, multi-instructors, review classification, redaction, Jalali dates, pagination/dedup, page/item limits, denial/cancellation, failure survival, exhausted-empty vs absent, sitemap selection, URL identity and shared CLI help. Utility lint/type results and browser evidence are recorded after final verification.

## Real ingestion acceptance

Existing local API `http://127.0.0.1:3001` and homepage `http://localhost:3000` used; no service lifecycle, fixture insertion, editorial membership or frontend code changed by this provider agent. Shared coordinator owns logo registration.

Initial real CLI used exactly Python and HTML, default 10/500, private ignored checkpoint `apps/utils/output/migrate-sabzlearn-v3-sample-20261012.json`. Both new observations accepted, both images ready, zero collection/delivery/image failures. Management reads and public detail reads verified retained fields and matching snapshot IDs.

| Source | Stable course / snapshot / submission IDs | Observed feedback and thumbnail |
| --- | --- | --- |
| Python | `sabzlearn:25`; snapshot `3afa7cd6-f236-48e9-a6b3-22a72375c38d`; submission `a7144a0b-a90e-4f0b-82b3-3e1bd2a17635` | 76 anonymous comments, 44 excluded, 10 pages, hasMore true, page-limit; raw score 5, confirmed rating null; hosted WebP 640×360. |
| HTML | `sabzlearn:2`; snapshot `eecb5d08-ca10-4d95-9542-2fa9fbe99398`; submission `17b8536e-51c1-4d5b-9ba2-348de184d656` | 112 anonymous comments, 8 excluded, 10 pages, hasMore true, page-limit; raw score 5, confirmed rating null; hosted WebP 640×360. |

Same-checkpoint resume completed in 0s with saved collected/accepted 2/2 and no recollection. Fresh refined observations and browser acceptance are recorded below.

## Refined observations and final acceptance

- `sabzlearn:25`: submission `7ba9d584-c487-4790-842b-757e8e72661d`, snapshot `11df3a76-398d-4e35-917c-aed6185b57fc`; management/current public detail match, presentation ready, hosted WebP HTTP 200.
- `sabzlearn:2`: submission `5e007996-5335-421b-8ae6-4f7db721f25e`, snapshot `d4896fc4-26ef-4b72-b686-0bcfc79463aa`; management/current public detail match, presentation ready, hosted WebP HTTP 200.

Coordinator repeated the completed refresh/refined checkpoint resume: exit 0, saved collected/accepted 2/2, no recollection or new acceptance. Real paid/free fields and anonymous feedback coverage remain as documented above. Final provider regression counts: TopLearn 20, Sabzlearn 13. Combined utility suite: 134 passing tests. Large curriculum/max-feedback regressions preserve independent facts within evidence/payload bounds with explicit omission reasons.

Agent #3 completed native Chrome desktop and responsive 390×844 acceptance using search «سبزلرن» with category/free filters clear: both real cards and both details, hosted images/authentic logos, Python paid price and 246 lessons, HTML free access and 40 lessons. Close receives initial focus, Tab visibly focuses the actual source link, Escape restores the invoking card, and Enter opens the free detail. Persian RTL text/mobile layout remained readable. Coordinator additionally reproduced the HTML detail from the combined unfiltered real catalog.
