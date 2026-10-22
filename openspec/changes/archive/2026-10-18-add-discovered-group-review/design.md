# Design

## Context

See `proposal.md` for motivation and the two delta specs for behavior. Phase 3 already contains persistent discovery runs and candidate review/promotion APIs. There are no active competing changes. The existing admin layout, concrete same-origin handlers, `adminRequest`, feedback/pagination/dialog components and isolated admin showcase establish the integration patterns.

`EmbeddingDiscovery` is browser-safe and validated in `packages/core/src/embeddings.ts`. Saved-run listing is paginated; candidate listing is run-scoped, separates retained/suppressed sets and has no server-wide review-status filter. Candidate reads include review, currentness, scores and reconciliation; evidence includes frozen pairwise/seed data and run/configuration references. Course management inspection supplies current retained facts, not necessarily the original run snapshot.

Promotion returns `{promotionId, groupId}` and delivery is a separate bounded POST. Neither the candidate response nor an existing GET exposes a promotion. The database already retains promotions and delivery rows, so recovery needs an additive read, not a new table. Review itself allows recording decisions on historical candidates; backend promotion is the authoritative currentness/suppression/partial gate.

The existing administration spec's unchanged-inbox compatibility requirement applies to course-to-group worker submissions. This adds a separate discovery workspace while preserving that inbox and its legacy reported-confidence wording.

## Goals / Non-Goals

**Goals:** Make course collections the focus of review; preserve backend review/promotion boundaries; keep network work bounded and state recoverable; share actual UI implementations with the showcase.

**Non-Goals:** Build a worker operations console, global cross-run inbox or search index, change algorithms, or extract the entire UI into a new package. No browser-triggered generation or live AI calls.

## Decisions

### 1. Run-scoped review desk with addressable selection

Add `/admin/discoveries` and a «پیشنهادهای گروه‌بندی» navigation link. Use URL state for selected run, collection and pagination, with browser back/forward support. Paginate saved runs as well as candidates. Select a completed run on initial entry when available; incomplete runs show their status rather than editable candidate results. Do not scan every run to compute a global queue or fetch the whole catalog.

On desktop the right/start column is a compact queue (roughly one third), with the selected collection's detail taking the remaining space. On mobile show queue or selected detail with an explicit return control and restored queue position/focus. Standard links/buttons provide keyboard operation rather than inventing a custom listbox. Selected links expose their current state; detail navigation focuses its heading after explicit selection. Independent reads ignore superseded responses when selection changes.

```text
+------------------------------------------------------+
| Admin navigation / saved run / run state              |
+------------------------------------+-----------------+
| Selected collection                | Collection queue|
| Course collection preview          | Candidate       |
| Members and available facts        | Candidate       |
| Evidence / overlap / history       | Candidate       |
| Editorial note and decisions       | Pagination      |
| Separate draft form when eligible  |                 |
+------------------------------------+-----------------+
```

Alternative: a table of all candidates is compact but hides the educational evidence. A global pending tab would require extra backend query semantics and counts. This release uses the actual run/page boundaries and status badges, with no misleading page-local global counters.

### 2. Spend visual emphasis on the course collection

Use existing tokens, without an independent admin theme:

| Role | Existing token/value |
| --- | --- |
| Selection and primary action | `--ds-primary` / `#304CB2` |
| Selected detail surface | `--ds-soft` / `#EAF0FF` |
| Page ground | `--ds-bg` / `#F5F7FC` |
| Main text | `--ds-ink` / `#202C48` |
| Pending accent | `--ds-accent` / `#F2C66D` |
| Content surface | `--ds-surface` / `#FFFFFF` |

Existing success, warning and danger tokens retain their meanings. Gold flags pending attention; a quiet pale-blue collection header connects course previews visually. Use a small overlapping cover treatment only when genuine retained thumbnails are available through an existing safe presentation contract; otherwise use an intentional course-stack motif with titles and provider labels. Do not expand the API solely for decorative covers or fabricate images/provider information.

Keep Vazirmatn, a clear 28/20/14/12px hierarchy consistent with the admin, heading line-height about 1.4 and Persian body line-height 1.9. Align text to logical start; avoid Persian letter-spacing. Use 8px component radii and spacing based on existing 18/24px conventions. Queue rows remain quiet, with selection outline and a text/icon status badge. Separate evidence with simple rules rather than identical nested cards. No large dashboard KPI strip, decorative gradients or ambient animation. Only user-triggered selection/disclosure transitions, respecting reduced motion.

This refines the earlier overlapping-cover concept to work with actual management data: the collection composition remains memorable even when no cover exists. Distinction comes from the review task and course content, not additional ornament.

The delivered presentation prioritizes course thumbnails, titles, provider names,
duration and instructors. Ready asset UUIDs already present in management inspection
are exposed as the additive browser-safe `thumbnailAssetId` summary field and served
through the existing same-origin image handler. There is no backend thumbnail API
expansion. Stacked queue images and individual course images use a shared neutral
fallback. Optional title/note, scores, existing-group comparisons, overlap, history
and technical provenance use progressive disclosure. Pairwise evidence is presented
with readable course names rather than a raw JSON dump. Stable identities remain
visible for unavailable members and in technical provenance. On mobile, selected
detail hides run filters until the editor returns to the queue; focus is restored.

### 3. Reuse components and share specimens

Reuse existing buttons, `AdminFeedback`, `AdminPagination`, inspection/dialog primitives and common form-field styling. Discovery has its own pending/approved/dismissed vocabulary; do not coerce it into the pair-ledger's rejected state. Introduce shared `DiscoveryCollectionPreview`, `DiscoveryEvidenceSummary` and `DiscoveryDecisionBar` only where existing components do not fit. Keep page fetching/orchestration out of these presentational pieces.

Extend the admin showcase using those exact exports and controlled local state. Include long Persian titles, mixed Latin model/provider names, missing fields, selected/disabled states, approval/dismissal, stale/partial notices and loading/empty/error specimens. No fetch or mutation in showcase interactions. If promotion reuses group fields, extract the fields as a shared presentational block; keep promotion submission separate from `GroupForm`'s ordinary POST-to-groups path and retain regression coverage for existing forms.

Alternative: copying markup into the showcase risks divergence and does not satisfy the shared-component requirement.

### 4. Evidence explains what was measured

Hydrate candidate members through the existing management course inspection endpoint, with a small concurrency bound (at most four) and per-ID reuse for the current run/page. Never drop an unready or failed member; show its stable identity and missing-data state. Representative-course headings say they preview the collection until an editor supplies a title.

Mean and minimum scores are labelled experimental pairwise similarity; display Persian decimals, retain exact scores for decisions, and never relabel them as AI certainty or quality. Technical provenance is a disclosure: run, model/configuration, frozen revision/input references and pairwise evidence. Retrieve run configuration and frozen inputs through existing scoped reads as needed; validate the wire shapes actually returned rather than assuming every endpoint uses the same casing.

Show nearby existing groups with direct per-member passing/failing evidence and links; display any coverage conclusion as provisional. Paginate overlap and history using existing APIs. Suppressed sets can be opened through a separate retained/suppressed selector and overlap links, with an explanation of their retained counterpart and disabled promotion. Distinguish frozen run evidence from current management inspection data; source changes produce a stale notice with directions to run discovery separately, not an automatic refresh job.

### 5. Versioned decisions and explicit draft creation

Provide «تأیید پیشنهاد», «رد پیشنهاد» and «بازگشت به بررسی», plus optional editorial title/note. Labels and adjacent text explain that approval saves a review decision only. Record decisions using `expectedVersion` and a UUID request ID. Preserve a stable request body/identity while a mutation is unresolved; after 409, refresh the saved state and retain unsaved fields rather than automatically resubmitting.

Display stale/suppressed evidence before actions. Historical review annotations may remain available under existing API semantics, but «ساخت پیش‌نویس» requires an approved, current, retained candidate. For partial runs require a clearly explained, unchecked acknowledgement and persist it through the candidate review's `acceptPartial`; do not silently call run-wide partial acceptance. Changing review fields or acknowledgement after approval requires an explicit saved review before promotion.

Draft fields are title, Latin slug, scope, one fixed category and optional level; do not invent defaults claiming an AI-derived title/scope. Apply existing group validation. Promotion uses the latest saved review version and its own stable request ID. Store the in-flight promotion request identity and exact payload in session storage keyed by candidate before sending, clearing on confirmed reconciliation. A reload can read existing promotion without this state; if a request is still uncertain, replay only its identical saved request and payload. Disable altered promotion submissions until the uncertain result is reconciled.

After promotion, explicitly report an empty unpublished draft and the planned suggestions. Offer an explicit «ارسال پیشنهادهای دوره»/«تلاش دوباره برای ارسال» action using the existing delivery endpoint, then refresh cumulative counts. This avoids hiding draft success behind delivery failure. Link to `/admin/groups/:id` for existing course approval/publication. Do not auto-approve or publish.

### 6. Add minimal read recovery and scoped web transport

Add `GET /api/v1/manage/embeddings/discoveries/:id/promotion` with `{promotion: null}` for a known unpromoted candidate, or `{promotion: {id, groupId, planned, delivered, pending, complete}}`. Validate UUIDs and integer invariants; `planned = delivered + pending`, `complete = (pending === 0)`. Use a consistent read transaction over existing tables; unknown candidate is 404. Do not expose request hashes, internal SQL or mutable ownership tokens. This is additive and requires no migrations.

Add concrete `/api/admin/embeddings/...` routes only for saved runs, candidate/detail/evidence/overlap/history/promotion lookup, required configuration/manifest/frozen-input inspection, review, promotion and delivery. No arbitrary-path proxy or worker execution endpoints. Reuse server-only origin configuration, bounded responses/timeouts, no-store and foreign-origin mutation checks from `admin-api.ts`; do not forward the browser Origin to a different backend origin. Add browser-safe validators for newly consumed wire shapes, preserving strict existing contracts. Continue trusted loopback-only setup.

Alternative: browser-local promotion state alone cannot recover drafts created from the CLI or another browser session; using a mutation as a status read could advance deliveries unintentionally.

## Risks / Trade-offs

- Current facts may differ from frozen inputs -> Explicitly separate their labels, expose evidence and honor backend promotion conflicts.
- Per-member hydration adds requests -> Bound concurrency/cache scope; keep partial inspection failures local to a member and cancel irrelevant reads.
- Run-scoped navigation is less convenient than a global inbox -> Paginated run selection and stable URLs avoid unbounded scans; global filtering is deferred.
- Promotion response can be lost -> Read persisted promotion state, retain identical in-flight request payload/ID and keep delivery separate.
- Partial acceptance can be misunderstood -> Require a deliberate acknowledgement; preserve candidate-scoped acceptance rather than approving an entire run implicitly.
- Existing frontend production build has a documented Bun page-data failure -> Run required build and report observed results precisely; do not conflate compilation with successful production output.

## Migration Plan

Implement the additive recovery read/contracts first, then scoped web handlers and the review desk/showcase. No database migration, inference, catalog mutation or seed data is required to install the UI. Verify mutations against isolated fixtures or explicitly created test records, preserving real editorial records. Update README, `docs/catalog-embeddings.md`, `docs/design-system.md`, `docs/validation.md` and affected Plan status during implementation. Rollback can remove the frontend routes and additive read endpoint without deleting discoveries, decisions or drafts already persisted.


### 7. Run-wide collection sorting

Extend the existing candidate listing with optional `sort=id|similarity|course-count`.
Omission preserves the existing ID-ascending order. Similarity sorts the frozen
numeric `body.mean` descending; course-count sorts the frozen members array length
descending. Both use candidate ID ascending for ties. Apply the selected run and
retained/suppressed filter, then order in SQL before LIMIT/OFFSET. Use a fixed
allowlist of SQL expressions; never interpolate client-provided SQL. No inference,
new data, migration or change to discovery/suppression algorithms is required.

Use a labelled shared select alongside run/type filters: «ترتیب پیش‌فرض»،
«بیشترین شباهت»، «بیشترین تعداد دوره». Persist `sort` in candidate/pagination links
and browser history. Changing sort clears the candidate and candidate-page offset,
returning to the first queue page. Keep the chosen sort when changing run or type.
Cache scope includes the sort. Showcase the same select with local state only.
Test global ordering across pages, numeric (not lexical) comparisons, stable ties,
retained/suppressed separation, unchanged omission behavior, rejected unknown or
repeated query values, reload/history persistence and page/selection reset.
