# Design

## Context

See `proposal.md` for motivation. The workspace already has Bun/Elysia/native SQL, explicit migrations, `courses`, `course_groups`, and the unique `(group_id, course_id)` membership table. `catalog-routes.ts` exposes create/edit/publication/member operations. Management current-course inspection exposes retained observations independently of public presentation readiness. Public course categories depend on published groups with at least two members. Public group pages/cards still use fixtures.

The web app has server-only `DOROB_API_URL`, five-second bounded public API clients, runtime response validation, and same-origin route handlers. Extend these patterns without turning the public client into a generic management proxy. API tests use injected memory repositories plus opt-in PostgreSQL tests; web tests cover API boundaries and UI. Web production build has an existing documented Bun CommonJS page-data failure.

## Goals / Non-Goals

**Goals:** one implementable change spanning real persisted review state and a complete local Persian UI; explicit atomic approval; compatibility with existing manual operations; useful management inspection without requiring public eligibility.

**Non-Goals:** account/session architecture, production exposure, AI execution, confidence calibration, inference of course-to-course relationships, automatic publication, or replacing public fixture group destinations. The caller's `systemId` is attribution, not authenticated identity.

## Decisions

### 1. Keep submissions immutable and review the course/group pair

Add a suggestion table holding generated UUID, existing course/group foreign keys, `systemId`, `systemName`, `submissionId`, numeric `confidencePercent`, and server `receivedAt`. Bound IDs/names and reject non-finite/out-of-range confidence. Unique `(system_id, submission_id)` provides exact replay: 201 new, 200 same normalized payload, 409 different payload. Store confidence as numeric, not display text. Capture system name on each submission so later names cannot rewrite history.

Add a pair-review table keyed by `(group_id, course_id)` with pending/approved/rejected state, integer version, selected suggestion ID (nullable for manual provenance), origin, and decision timestamp. Add append-only transition records with prior/new version, action, selected suggestion, and server time. Suggestion reads join this state: several systems can submit independent scores, but one admin decision governs membership. This avoids contradictory approvals on duplicate proposals. Return all immutable submissions in paginated reads; do not aggregate confidence or overwrite earlier submissions.

Alternative: put review state on each suggestion. Rejected because approving one and rejecting another for the same pair would obscure the actual membership decision.

### 2. Preserve human decisions and make review retries deterministic

Proposed policy default from exploration: rejection is sticky across fresh submissions, even with higher confidence. Only explicit reopen returns a rejected pair to pending. Approve requires pending; reject requires pending; reopen requires rejected. An already approved member is removed using the membership removal operation. Manual addition explicitly approves from any state; removal explicitly rejects. Existing idempotent PUT/DELETE response behavior stays intact; no-op repeats do not append duplicate transitions.

Review action bodies include `expectedReviewVersion`. Lock the pair row, check version, apply decision/membership/transition together in one transaction. An identical completed action for that input version returns its stored result only if there has been no later transition; other stale or invalid actions return 409. Acquire locks in consistent group/course/pair order for suggestion creation, review, and legacy membership routes, including missing-pair creation. Use database uniqueness to resolve concurrent first submissions and replays without duplicate rows.

Selected suggestion provenance points to the exact immutable submission the admin reviewed, not the latest score. New submissions do not change approved membership or its provenance. Manual removal retains former approval history; manual re-add records manual provenance. No confidence is assigned to legacy/manual members.

### 3. Management endpoints and read contracts

| Method/path | Contract |
|---|---|
| `POST /api/v1/manage/groups/:groupId/suggestions` | Body: courseId, systemId, systemName, submissionId, confidencePercent; 201 new/200 replay |
| `GET /api/v1/manage/groups/:groupId/suggestions` | status=pending/approved/rejected, limit, offset; default pending, 20, 0; maximum 100 |
| `POST /api/v1/manage/suggestions/:id/approve` | expectedReviewVersion; atomic pair approval and membership, 200 outcome |
| `POST /api/v1/manage/suggestions/:id/reject` | expectedReviewVersion; pair rejection, 200 outcome |
| `POST /api/v1/manage/suggestions/:id/reopen` | expectedReviewVersion; rejected pair to pending, 200 outcome |
| `GET /api/v1/manage/suggestions/:id/history` | Paginated pair transition history, newest version first |
| `GET /api/v1/manage/groups/:id/member-reviews` | Paginated current members with manual/suggestion provenance, confidence/name when applicable, and review version |

All IDs use canonical validation and whole-course-ID encoding. Mutation responses include current pair status/version, selected provenance, and membership outcome. Lists return the established `{items,total,limit,offset}` shape with count/items from a repeatable-read snapshot. Suggestion order is confidence DESC, receivedAt DESC, UUID ASC. Live offset pages can shift as submissions arrive; refreshing is explicit and no frozen-inbox guarantee is made. Add indexes matching group/state joins and confidence ordering. History preserves local admin actions without inventing authenticated actor identity.

Extend existing management groups query with `q`, `category`, `isPublished`; course references with `q` matching title/provider identity. Reuse existing Persian letter/spacing search normalization. Validate filters and apply before counts/pagination; retain old default order and shapes. Use existing error conventions and OpenAPI registration. Existing group details remain compatible; member-review information is additive through a dedicated read.

Shared contracts and runtime guards go in `packages/core` without Bun, SQL, secret, or framework imports. Add frontend management summaries derived server-side from existing management course inspection. Expose only needed title/provider/source, observation time, readiness, available price/duration/instructor/description/syllabus fields; do not forward raw evidence or diagnostics. Minimal references render valid fallback rows. Avoid public-detail calls as the sole inspector because public readiness deliberately hides some candidates.

### 4. Pages and review presentation

Use `/admin/groups`, `/admin/groups/new`, and `/admin/groups/[id]` under a dedicated admin layout linked back to the main site. Reuse existing tokens, locally bundled Vazirmatn, semantic controls, providers, and dialog patterns. The list has server-backed query/filter/pagination state. Details offer editable group fields, publish/unpublish, approved members, manual course picker, and pending/reviewed suggestion tabs.

Treat the existing `/design-system` page and shared components as the frontend source of truth. Extend existing primitives before creating new ones; keep genuinely reusable additions in shared component modules, and keep page-specific orchestration in the admin feature. Add every new reusable component/variant to `apps/web/src/app/design-system/page.tsx` through the established showcase pattern. Render the same component used by the admin page, with labelled samples and representative applicable states (for example pending/approved/rejected, manual/system provenance, disabled/loading/error). Showcase interactions use local demo state and never real management writes. Reuse semantic tokens and established typography rather than creating an admin-only styling system or duplicating component markup.

Each suggestion row shows course/provider, system display name (with system ID available), system-reported percentage, submission date, and actions. Multiple submissions remain distinct; same-pair rows update together after a decision. Default order is confidence, not price or course quality. Reviewed rows expose history and reopen where valid. Approved member rows show the selected submission's provenance or manual label. Judge button is disabled with an adjacent explanation; there is no judge endpoint in this change.

On mutation success, refresh affected inbox/member counts and group eligibility. On 409 refresh state and explain that the review changed. Preserve form input on validation/network failure. Avoid optimistic publication/approval and automatic retries of create POST; on uncertain create, reconcile by the submitted unique slug before offering another create. Suggestion/review API replay semantics permit safe retries of their exact requests.

Use root `lang=fa`, `dir=rtl`, logical CSS, LTR-isolated slugs/IDs/URLs/system names, Persian numeric formatting and Jalali presentation dates. Keep timestamps ISO in storage. Show missing facts explicitly. Support narrow-screen stacked rows, visible keyboard focus, labelled actions, live feedback, and long Persian text.

### 5. Local transport boundary

Authentication is explicitly deferred. Keep the API loopback-bound and document loopback web startup for the panel. A small server-only admin client uses the existing validated API origin and five-second deadlines with bounded JSON reads, no redirects, and runtime guards. Concrete `/api/admin/...` handlers allow only required methods/validated parameters, never arbitrary upstream paths. Do not forward browser credentials, raw internal response bodies, or ingestion actions. Set management responses to no-store. Require matching request Origin for browser mutations, rejecting absent/foreign Origin and inappropriate content types. Direct local API/Swagger callers are unchanged.

This origin check reduces accidental cross-site writes; it is not authentication. Host/network enforcement for a future deployment belongs with the future admin auth change. Do not advertise this panel for a shared/untrusted network.

### 6. Focus verification on essentials

Use a small set of meaningful tests around confidence validation/order and attribution, replay safety, atomic approval and conflicting decisions, sticky rejection/reopening, manual membership compatibility, migration preservation, and publication eligibility. Cover the transport's important validation/origin/error boundary with representative cases. Reuse existing tests and consolidate scenarios into a few coherent fixtures; task-level verification does not require a separate new test for every clause.

Use one short integrated browser walkthrough of the primary workflow, plus desktop/mobile keyboard and mixed-direction checks including the new showcase examples. Reuse evidence from earlier task verification instead of repeating it in final acceptance. Do not introduce a new test framework, exhaustive viewport/browser matrices, snapshot sweeps, artificial permutations, or tests that merely duplicate implementation. Run appropriate focused suites and required lint/typecheck/build checks once after relevant work; rerun only affected checks after fixes, failures, or new material changes. Record environmental limitations clearly and stop expanding validation once essential checks pass.

## Risks / Trade-offs

- Caller-supplied system names and confidence are unverified -> label them as submitted values; add authenticated system identity later with admin auth design.
- Sticky rejection is a proposed default, not a previously confirmed product decision -> make it visible in review and acceptance; reopening preserves admin control.
- Different systems' percentages may not be comparable -> honor requested numeric ordering while showing source; never call the value a calibrated probability or quality score.
- Historical submissions can grow -> bounded pagination and indexes; no automatic deletion/retention policy in this change.
- Manual API callers can intentionally change review decisions -> keep legacy operations compatible and record their manual provenance atomically.
- Publishing affects real category eligibility while group destinations remain fixtures -> explain the boundary in panel/help and docs; do not alter existing drafts during validation.
- Current management observations may be large -> project a bounded UI view and validate upstream responses; do not ship raw evidence to the browser.
- Existing Bun web-build failure can limit production acceptance -> run the build, record exact outcome, and validate dev flows without claiming a successful production build.

## Migration Plan

1. Add the next numbered explicit SQL migration with constraints/indexes for suggestions, pair reviews, and transitions. Seed approved/manual pair records from existing memberships only, without changing any membership or publication flag. Seed a baseline transition for those existing rows without fabricating a human identity or historical timestamp.
2. Apply through `bun run db:migrate`; prove rerun safety and preservation of existing catalog records in isolated PostgreSQL tests. Do not run migrations at API startup or reset volumes.
3. Ship repository/API/core additions, then web transport and pages. Verify the local end-to-end flow using uniquely identified temporary records; retain existing seven drafts untouched.
4. Update `Plan.md`, `README.md`, `docs/catalog.md`, and `docs/validation.md` with setup, curl/Swagger submission and review examples, policy defaults, confidence meaning, local-only limits, and actual validation outcomes during implementation.
5. Roll back application wiring while retaining new tables/history and existing catalog data. No destructive down-migration or automatic deletion is included. If older binaries mutate memberships, reconcile pair state from actual memberships before re-enabling this feature; old binaries cannot maintain the new review ledger.
