# Frontend integration and selected refresh

Milestone 5 is complete for local offline acceptance, October 5, 2026. Automated checks and the actual Next-to-backend journey pass. Native Chrome review covers desktop fixtures and 320px fixture/backend discovery, unknown/stale facts, keyboard skip/source controls, price/access text and URL wrapping. The computer-use surface initially failed, then recovered for these checks. The production Bun/Next build blocker remains separate. No live provider/model request, production educational-quality evaluation, schedule activation or cloud deployment was performed.

## Modes and configuration

The Next server consumes public HTTP contracts through `apps/web/src/services/server.ts` (marked `server-only`) and the testable `data-service.ts`. It imports no database, scraper or model service. Browsers receive rendered public data; neither backend connection configuration nor operator credentials are passed as props. There is no public proxy that can invoke operator commands. Read-only visitor requests never scrape, embed or generate.

From the repository root:

```sh
DOROB_DATA_MODE=fixture bun run dev
# Backend mode, after the existing DB migration/queue setup, API and worker setup:
DOROB_DATA_MODE=backend DOROB_BACKEND_URL=http://127.0.0.1:4000 bun run dev
```

When using an `apps/web/.env.local`, put these server-only settings there. Root `.env` remains the backend/worker setup file; avoid relying on Next to load it from another workspace directory. Do not use `NEXT_PUBLIC_`. The backend URL is an HTTP(S) origin without credentials, path, query or fragment. Omitted data mode defaults to the explicitly labeled fixture mode. Invalid modes/configuration fail unavailable. Backend mode requires the URL; it never falls back to fixtures on HTTP errors, connection failure, timeout or invalid/private response fields. Fetches are uncached, reject redirects, have a five-second deadline and a two-MiB response bound. A 404 group gets a distinct unavailable-publication explanation; other errors get a retry-later state. No error payload is echoed.

Fixture mode maps the retained October 1 provider snapshots into public factual DTOs. Only three editorial groups are exposed. Every page labels the sample mode and unreviewed membership. The Python card and `/groups/python-beginner` both contain the same three offerings, with group level unknown and individual provider labels intact. The eight-offering Python prototype/component/data remains retained as design history and is no longer routed as public group membership. Fixture grouping, order and prose are not imported as backend approvals. Backend slugs/members come exclusively from stored public publications.

## Public API and query contracts

Browser-safe schemas/DTOs live in `packages/core`, including runtime response validation. API and worker images need migration `0015_public_discovery_refresh` before using new discovery/refresh operations.

| GET endpoint | Result |
| --- | --- |
| `/v1/groups` | `{items,page,pageSize,hasNext}` with at most 24 group summaries. |
| `/v1/categories` | Only navigation categories containing eligible published groups; at most two. No query parameters. |
| `/v1/groups/:slug` | Current approved alternatives, current provider offer/freshness data, published definition, qualified current analysis or null. |

Discovery accepts only `q` (trimmed, at most 200 characters), `category` (`programming`/`other`), `level` (`beginner`/`intermediate`/`advanced`/`multi-level`/`unknown`), `page` (1–1000, default 1), and `pageSize` (1–24, default 12). Integers are plain positive decimal strings. Duplicate keys, unknown keys, invalid enums and excessive bounds return 400. Empty form fields are omitted by the frontend boundary before requesting the API. Example:

```text
/v1/groups?q=Python&category=programming&level=unknown&page=1&pageSize=12
```

Results sort by bytewise slug, with no popularity, quality, winner or ranking signal. Eligibility is applied **before** pagination, in a repeatable-read view shared with detail projection: explicitly published pointer, retained snapshot and at least two distinct current source identities with current revision/definition membership approval and availability not `unavailable`. Changed/unapproved/unavailable alternatives are omitted. Below the gate, details return 404 and discovery/categories omit the group. History remains retained.

Search uses only published definition title/topic/criteria, never draft metadata, reviews or raw evidence. PostgreSQL `simple` full-text search matches all normalized query tokens; explicit whole-phrase Persian/Latin Python, JavaScript/JS and n8n aliases expand published search text. NFKC/lowercase, Arabic yeh/kaf, both digit sets, diacritics, tatweel, punctuation and ZWNJ/spacing normalize only search text. Original provider/published text is retained. This is a small deterministic navigation policy, not semantic retrieval, Persian stemming or a reviewed production taxonomy. The two broad navigation categories map exactly recognized topics to «برنامه‌نویسی و اتوماسیون» and all other topics to «سایر موضوع‌ها»; they do not infer educational equivalence. Categories are not provider-category facts. Expanding this registry requires product review.

Public summaries expose slug/title/topic/category/level, eligible count, publication snapshot time, stale flag and `analysisState`: `approved`, `partial`, `stale`, `none`. Detail analysis is dropped whenever snapshot inputs or current definition/membership/taxonomy/policy bindings fail current approval checks. Stale output is never presented as current analysis. Facts remain usable above the eligibility gate. Partial approved analysis retains every candidate and explicit null/insufficient assessments; missing analysis does not imply a worse course. Browser validation also rejects stale non-null analysis and unknown private fields.

## Presentation and accessibility

`/` is the homepage, category/search results and paginated discovery route. GET form state survives reload/share; pagination preserves active query/filter state. `/groups/:slug` compares every public alternative using reusable public shell, notices, offer facts and comparison components. Native source-address disclosures support further detail. Supporting standalone course routes remain deferred.

The accepted blue hero, local Vazirmatn, logo, semantic tokens and reusable button/focus styles remain. Provider imagery, ratings and editorial sample badges are not fabricated to fill fields absent from the public contract. Source/derived claims render as React text with bidi isolation, never HTML or executable model output. Links require validated HTTPS without credentials. Source URLs are LTR islands and wrap; dates use the Persian calendar and Tehran time, numeric prices/durations use Persian digits. Provider levels remain separate from unknown/multi-level group levels.

Offers retain source currency, original/current amounts, offer type, billing period, explicit access text and certificate unknowns. Missing price is not free; unknown currency is not guessed; a one-time price does not prove lifetime access. Compatible reviewed price differences retain qualifications and do not establish equal entitlements or value. Candidate claims are labeled provider-fact or AI inference with human review and retained excerpts/limitations. Ranking and badges remain disabled. Feedback is excluded from generation v1. There are route loading, invalid-query, empty, backend-unavailable, missing-publication, stale and partial-coverage states.

Shared CSS uses logical properties, responsive single-column cards and wrapping content. Static RTL checks pass for all new UI/service files. Historical browser review covers desktop discovery/Python search and 320px fixture/backend layouts, including skip/source controls and disclosures. Every keyboard path, screen readers and every breakpoint remain follow-ups; automated rendering is not a substitute. The October 9 checkpoint reran static checks but did not repeat browser review; see [current checks](validation.md#october-9-checkpoint-checks).

## Opt-in refresh and review

Refresh is a **private manual operator command**, not a visitor control. `REFRESH_ENABLED=false` and `LIVE_REFRESH_ENABLED=false` default on all hosts. `SCHEDULES_ENABLED=true` still fails closed: no scheduler is implemented or activated. Enable scheduling only after separately authorized bounded live acceptance, access/educational-quality review and an agreed schedule policy; offline acceptance does not approve schedules.

A refresh request selects existing supported provider identities and explicit retained courses and/or group IDs, with a total selected-course bound and idempotency key. No sitemap/catalog expansion, implicit provider selection, model default, automatic downstream model spending or automatic definition/membership/assessment/publication approval occurs.

```json
{
  "requestKey": "reviewed-refresh-001",
  "mode": "offline",
  "providers": ["roocket"],
  "courseIds": ["roocket:RETAINED_COURSE_ID"],
  "groupIds": [],
  "maxCourses": 1,
  "operator": "YOUR_OPERATOR_ID"
}
```

Use actual retained IDs; the example authorizes no live request. Bounds: 1–2 explicitly selected supported providers (Maktabkhooneh/Roocket), at most 100 course IDs and 12 group IDs, union of selected memberships/courses at most `maxCourses` (1–100). Every provider must have a selected course; unsupported/missing courses/groups and noncanonical provider URLs fail. Groups select their retained membership identities for collection, including members requiring review, without approving them.

```sh
# Synthetic/offline worker injection only; production startup has no fixture switch.
REFRESH_ENABLED=true bun run backend:cli refresh /absolute/path/refresh.json
bun run backend:cli refresh-inspect REFRESH_UUID
bun run backend:cli collection COLLECTION_UUID
bun run backend:cli collection-cancel COLLECTION_UUID
bun run backend:cli resume COLLECTION_UUID
```

The immutable `refresh_requests` ledger retains the reviewed explicit input, selected source revisions/URLs, operator, idempotency key and collection IDs. PostgreSQL advisory transaction locks plus uniqueness coalesce identical submissions across hosts; the same key with different inputs is rejected. All per-provider collections, selections, retained refresh input and pg-boss jobs commit atomically. Queue failure rolls back the entire submission. Outcomes remain in existing collection/attempt tables, independently of queue retention.

An offline collection cannot reach a live transport: production workers record a disabled transport state without attempts/network work; resume only after an injected synthetic worker is available. Tests inject the same fixture transport as ingestion. Live refresh needs `mode: "live"`, explicit independent live authorization and both flags enabled in the operator process **and** worker environment. Never turn them on for these offline acceptance examples. A missing live model/key does not block factual refresh implementation; refreshing facts queues only existing invalidation/manual-placement outboxes. Later models require the existing explicit model budgets/configuration and review commands.

Refresh reuses provider-wide PostgreSQL admission/spacing/denial pause, per-URL three-attempt budget, per-attempt 12-request cap, bounded transport bodies/timeouts, immutable revisions and transactional downstream handoff. At most 100 × 3 × 12 transport requests can be attempted; this is a ceiling, not a request target. There is no collector/model retry loop in a visitor request. Resume skips accepted URLs and never resets attempt budgets. Collection cancellation advances a durable generation, records interrupted in-flight outcomes, and fences late imports/continuations/finalization. It cannot promise to stop a remote request already admitted. Explicit resume creates another generation within the same budget. A new idempotency key starts a new separately bounded refresh only after investigation; repeated identical keys never recollect accepted results.

Unchanged source observations advance freshness without duplicating revisions. Changed source evidence preserves history, invalidates affected current membership/analysis/publication eligibility and creates existing durable outboxes. Inspect `placement-pending` and group invalidations; review taxonomy/membership and retained definition corrections, create bounded assessment requests where appropriate, review claims/outcomes, then explicitly publish. No step of refresh approves any of these. Keep original budget/attempt counters during recovery and use existing cancellation/admission/model response-reuse controls. See [operations](backend-operations.md), [placement](placement.md) and [assessment](group-discovery-assessment.md).

## Acceptance and limits

`bun run test:web` covers response failures/no fallback, private/oversize DTO rejection, fixture labeling/membership, search/filter/pagination, hostile text, unknown currency/access/levels and stale/partial rendering. Real PostgreSQL tests cover publication visibility, pre-pagination eligibility, alias/category/level contracts, current alternative projection, refresh coalescing across connections, queue rollback, offline transport fail-closed behavior, cancellation fencing and bounded resume. The full actual backend/two-worker container suite checks reviewed synthetic publications, actual Next HTTP rendering, unavailable API behavior and selected refresh CLI handoff. All synthetic review identities certify test exercises only.

See [measured results](validation.md). Live availability, Persian educational quality/calibration, production taxonomy, paid models/prices, broader provider collection and cloud release remain untested/later work. Frontend production compilation and types pass, but Bun 1.3.8 still fails during Next page-data collection with `Expected CommonJS module to have a function wrapper`. These bounded browser checks do not establish every breakpoint or comprehensive screen-reader coverage. Do not claim production build readiness.
