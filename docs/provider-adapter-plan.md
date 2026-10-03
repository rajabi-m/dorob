# Additional MVP provider adapters — October 2, 2026

The owner explicitly authorized three parallel agents to add standalone provider adapters modeled on the Maktabkhooneh utility. This is a bounded extension of ingestion groundwork, not activation of phase 3 or frontend integration.

## Provider selection

- TopLearn: programming/web courses, free and paid offerings, overlap with existing comparison topics. https://toplearn.com/
- Sabzlearn: programming/web courses with overlapping comparison topics; inspect consistency across course pages before implementing. https://sabzlearn.ir/
- Roocket: programming/web courses overlapping MVP comparison topics. https://roocket.ir/

These are an editorial MVP shortlist based on the providers' public catalogs, not a market-share ranking. Check each provider's current robots rules and public-page availability before collection.

Quera is excluded at the owner's request because its varying course landing pages are unsuitable for the desired initial adapter workflow. Existing frontend samples are outside this task.

Faradars was assessed and deferred: fetched course-detail pages exposed client-rendered shells rather than extractable course facts; its published product sitemap covered public `/videos/` entries and robots disallowed `/product/`. A partial video-only feed would not meet the intended full-course adapter scope. Browser rendering or a verified permitted course feed can be evaluated later.

## Shared agent instructions

Read AGENTS.md, Plan.md, apps/utils/README.md, docs/course-data-format.md, and the existing Maktabkhooneh scraper/CLI/tests. Preserve other contributors' uncommitted changes. No commits, branches, pushes, frontend edits, dependencies, credentials, scheduling, or database integration.

Each agent owns only its provider scraper, CLI, fixtures, tests, and provider documentation. Root owns shared utilities/contracts, package exports/scripts, and top-level documentation. Use the shared public-provider transport and course contract; report needed changes rather than editing shared files.

1. Inspect robots, sitemap/catalog, and several actual public course pages. Prefer embedded JSON or explicit labeled HTML. Do not guess undocumented API endpoints or execute source scripts. No access-control bypasses; pause on 401/403 and respect robots and Retry-After.
2. Implement pure parseCoursePage and canonicalCourseUrl functions plus a provider scraper exposing initialize, discoverCourses, fetchCoursePage, scrapeCourse, and streaming scrapeCourses. Use shared transport with bounded sequential requests, timeout/size limits, retries, cancellation, strict HTTPS host validation, and safe redirects.
3. Return the complete version-1 course shape in docs/course-data-format.md. Unknown fields are null; free requires explicit evidence; preserve source currency and separate duration meanings. Keep source facts, field provenance, warnings, deterministic fact hashes, and derived:null. Reject identity/layout drift rather than fabricate records.
4. Provide a CLI with explicit URLs, limited/default collection, full catalog where supported, atomic JSON checkpoints, resumable runs, and failure exit status. Default outputs go in ignored apps/utils/output. Reuse the shared export CLI if available.
5. Save reduced, attributed public-page fixtures excluding reviews/identities/media. Test real-page facts, unknown/free/discount cases, drift, canonical URLs, discovery, access denial, and CLI partial/resume behavior. Synthetic cases must be labeled. Perform a small live discovery/detail smoke check, never a full catalog scrape during implementation.
6. Document field mappings, verified price units, public source URLs/date, discovery limitations, usage/backend import examples, and actual validation results. If access prevents a live check, state it clearly and do not claim live success.

## Acceptance and integration review

Root reviews all three adapters, common contract compliance, provenance and price semantics, safe request behavior, exports, CLI help, and offline tests. Run workspace lint, type checking, utility tests, and production build; record any environment/runtime blockers. Keep the frontend fixture and existing Maktabkhooneh output unchanged. Catalog coverage and ongoing suitability require further sampling before production deployment.
