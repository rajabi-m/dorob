# Design

## Context

See `proposal.md` for motivation and scope. `Homepage` currently imports `homeGroups`/`groupCourses`; `/groups/[id]/page.tsx` enumerates fixture static params and special-cases `PythonGroupPreview`. That preview combines layout with JSON facts, hardcoded assessments and three-provider assumptions. The existing server-only `course-api.ts` provides bounded, validated, deadline-limited no-store requests and a same-origin thumbnail bridge.

The API already exposes minimal public group references and independently eligible public courses. `group-judgments.ts` stores immutable content and manifests; `group-judgment-source.ts` hashes group context, canonical members and snapshots. Publication is part of that hash, with explicit regression coverage. Existing `presentCourse` assumes an available hosted thumbnail. Existing public-course projection lacks rating, which the selected group layout displays.

On October 19, read-only API inspection found eight published groups with current judgments; the Python judgment contains an expensive first course and an empty weakness list. These exercise two important rendering boundaries. The main homepage spec's fixture-preservation requirement conflicts with this change and is explicitly modified, rather than bypassed.

Planning checklist: proposal and both spec deltas are created; this design resolves integration choices; tasks follow from these artifacts. No application or database changes occur during planning.

## Goals / Non-Goals

**Goals:** Assemble an internally consistent public comparison in the API; keep browser contracts independent of management; adapt the chosen layout without changing the visual direction; keep failures local to the affected region.

**Non-Goals:** Change revision hashing, approve individual judgments, execute models, persist public selections, migrate the ledger, redesign the homepage hero, or create mappings between semantically different fixture and real groups.

## Decisions

### 1. Add a dedicated public projection

Add browser-safe contracts and runtime validators in `packages/core` and a dedicated public judged-group repository/routes in `apps/api`. Use `/api/v1/judged-groups` and `/api/v1/judged-groups/:slug`, leaving `/api/v1/groups` and management routes compatible. Extending the old minimal-reference response would entangle publication-only consumers with judgment eligibility; browser-side joining of management responses would expose private fields and race independently fetched revisions.

The list item contains group identity/category, the generated hero, actual member count, deduplicated provider identities, up to three hosted covers in judge order and selected judgment ID/time. Default list size is 12, maximum 100; order is slug ascending, then ID. There is no unsupported popularity ordering. All eligibility filters run before slicing and counting.

Detail contains group identity/category, hero, selected judgment ID/time and a page of assessed courses. Each entry separates `course` facts from `assessment` tags/strengths/weaknesses. Reuse the public card facts and pricing/offer projection, plus nullable source rating `{value, scale, count}` from the same snapshot. Avoid sending full syllabus, descriptions or raw feedback solely to render the compact comparison. Public responses omit manifests, input revisions, system/submission IDs, hashes and storage details.

### 2. Preserve strict freshness and complete comparisons

Use the existing canonical manifest/revision helpers without changing their semantics or rewriting stored judgments. Select a matching revision ordered by receivedAt descending and judgment ID ascending. Do not take only the first history page: older matching judgments can exist when inputs return to a previous state. Publication remains the editorial gate. A publish-state change requires a fresh explicit judgment; the guide will document publishing before judging. Excluding publication from hashes was considered but would require versioned freshness migration and compatibility rules unrelated to the immediate integration.

A group qualifies only if every member has the same current snapshot represented in the selected judgment and satisfies existing public-course thumbnail readiness, including read-only file availability checks. Unknown prices or absent optional ratings do not disqualify otherwise-ready members. Reject the whole comparison if any member is unready. Silently skipping courses would misrepresent judge order/counts; inventing a second incomplete-course public model would weaken existing presentation rules.

Assemble candidates, selected judgments and current source projections under a consistent read-only database transaction using shared internal helpers. Check filesystem availability with bounded concurrency and propagate unavailable dependencies safely. Image files can disappear after a successful read; the browser still needs fallbacks. Do not perform per-card HTTP calls or use management repositories from the browser. Batch source reads and reuse projections within each request; keep database and file work bounded by existing timeouts. The local catalog can use an in-memory eligibility pass before paging, matching the existing public-course approach; record its scale limitation.

### 3. Bound course traversal and prevent mixed judgments

Detail defaults to 20 courses, maximum 100 per page. Its course total is the full group member count; offsets follow exact judgment array order. An optional `judgmentId` pins subsequent pages. If the pin differs from the current selected eligible judgment, return 409; fresh unpinned missing/ineligible detail returns 404. Neither path falls back to history.

The initial page is server rendered. Page controls replace the course page rather than append results; display absolute ranks using offset. Carry the pin in page URLs/requests, and expose restart on conflict. The gallery uses hosted covers from the currently displayed course page and labels its local image count; group/course/provider totals remain group-wide. This avoids unbounded full-course responses. URL paging supports refresh/back/forward without silently changing the selected judgment.

### 4. Reuse the web boundary and selected presentation

Add a server-only judged-group client following `course-api.ts`, with strict query/slug/UUID validators, safe result types, five-second deadlines and explicit response byte caps (2 MiB list, 8 MiB detail). A cap breach is an error, never truncated content. Expose concrete same-origin read handlers for list retry/paging and detail paging as needed. Reuse the thumbnail bridge and provider-logo registry with a text fallback for unknown providers. Read relevant installed Next.js guides before implementation; remove fixture static-param enumeration and use dynamic no-store reads. Deduplicate metadata/page data per server request so both describe the same selected content, without cross-request caching.

Extract reusable gallery, course row, provider/price/assessment presentation and page shell from `PythonGroupPreview`. Pass validated data rather than snapshot imports. Preserve full-width assessments, compact metadata, offers and the five-second gallery. Render hero title/subtitle/description/topicLabel/levelSummary directly as text; category artwork/breadcrumb derives from the shared category registry. Preserve four tag visuals, including rose popular and amber expensive. Hide empty strength/weakness sections; hide the assessment block when both are empty. Never synthesize positive or negative claims.

Generalize `CyclingCourseGroupCard` to accept a small cover/provider presentation contract instead of `HomepageCourse`, while keeping design-system fixtures through adapters. Use hero title, subtitle and levelSummary for group card copy. Isolate group-section fetching under its own suspense/loading/retry boundary. Keep individual-course search/filter behavior independent. Remove the product header's demonstration label, the group provenance placeholder and stale sample metadata description; developer provenance remains in documentation. Existing hero sample details retain factual sample provenance per the modified preservation requirement.

Keep `lang=fa`, `dir=rtl`, existing Vazirmatn/tokens, logical CSS, Persian numerals and Jalali observation/judgment dates. Distinguish AI assessment attribution from provider facts; show each course's retained fact date. Preserve bidirectional isolation without mutating provider names or generated prose. Verify gallery arrows/keyboard behavior, visible focus, reduced motion, hover/focus/hidden-tab pauses and long text at 320px, 390px and desktop widths.

### 5. Route and error compatibility

Retain the existing dynamic route segment as the slug resolver. Redirect only known equivalent legacy destinations: `python-beginner` to `python-starting-programming`, and `n8n` to `n8n-workflow-automation`. Do not map `html-css` to a differently scoped group. Unknown slugs and ineligible groups return 404. A timeout or 503 renders a retryable error, never `notFound()`. Existing design-system fixtures remain isolated.

OpenAPI covers request/response schemas and safe 422/404/409/503 examples. Public reads use no-store. Unpublishing or invalidating a judgment affects subsequent requests; an already rendered page can remain visible until refresh, and this limitation is documented.

## Risks / Trade-offs

- Any new snapshot invalidates judgment content, even if only prices changed → preserve the established evidence contract and require explicit judging; never show old assessments against new facts.
- One unready member hides the group → protect complete comparisons and retain management evidence for repair; frontend image fallback handles failures after eligibility checks.
- Automatic selection exposes any accepted current judgment on a published group → group publication is the agreed gate; structural acceptance does not certify prose quality, so no quality guarantee is claimed.
- Eligibility checks scan candidate groups and inspect member assets → batch shared sources, bound concurrent file checks, reuse request-local results and document local-scale performance limits.
- Existing Bun production-build limitation may persist → run the documented build and record actual results; do not label historical failures as newly verified outcomes.

## Migration Plan

No schema migration or data backfill is needed. Implement and validate the additive API/contracts first, then connect the homepage and dynamic group renderer. Check live groups read-only without republishing or resubmitting judgments. Update frontend/catalog/guide/setup documentation and validation records. Rollback restores previous web wiring and removes additive public routes without deleting or rewriting stored judgments; reappearance of fixtures is a code rollback, not a runtime failure fallback.
