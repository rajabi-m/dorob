# Tasks

## 1. Shared contracts and examples

- [x] 1.1 Add browser-safe judge-context, member-page, evidence, feedback-page, submission, history and readback types/schemas in `packages/core/src/group-judgments.ts` and exports; verify core/API type checking and that imports contain no server or scraper runtime dependencies.
- [x] 1.2 Implement strict content/envelope validation and the four-tag registry, using canonical course IDs and the design's text/body bounds; verify tests for missing/extra properties, null arrays, duplicate/unknown tags, blank/oversized strings, forbidden fact/layout fields and unsupported versions.
- [x] 1.3 Add valid synthetic JSON examples demonstrating two courses, expensive-first ordering and empty weakness/tag arrays; verify examples pass shared validators and document field ownership and qualitative ordering semantics beside the exported contract.

## 2. Read-only judge evidence

- [x] 2.1 Add a whitelisted v3 evidence projection and versioned inputRevision computation across group definition, all members/references and current snapshot IDs; verify deterministic hashing, null/missing/failed section handling and invalidation on member, group, pricing-only or comments-only changes.
- [x] 2.2 Add repeatable-read context/member/detail repository reads, preserving all members, canonical paging and encoded IDs; verify tests beyond one page, draft and small-group reads, reference-only members, revision conflicts and absence of writes/network/model/image processing.
- [x] 2.3 Add feedback paging for every retained comment and review, with original sourceType/text/rating/date/verification, itemsKnown and upstream collection metadata; verify comments-only, mixed types, more than 100 items, empty versus unknown, partial collection, full retained text and no silent filtering/truncation.
- [x] 2.4 Add projection tests excluding raw/providerData, feedback identity fields, source locators and ingestion diagnostics while retaining source coverage and treating hostile text as data; verify no mutation of the original source snapshot.
- [x] 2.5 Document the evidence traversal sequence and retained-versus-provider-complete feedback distinction in backend catalog documentation; verify documented member/course/comment requests agree with the schemas and use one revision throughout.

## 3. Persistence and acceptance semantics

- [x] 3.1 Add the next available additive migration for immutable judgments, globally unique system/submission keys, group foreign key, hash constraints and retained group/input manifest/content; verify fresh migration, rerun and constraint tests in the existing isolated PostgreSQL helper without changing catalog data.
- [x] 3.2 Implement atomic submission using a dedicated consistent transaction and exact member-set validation; verify stale source/definition/membership rejection, missing/duplicate/nonmember course rejection, small-group rejection, rollback and preserved AI order including expensive-first results.
- [x] 3.3 Implement canonical request hashing and concurrent idempotency handling, checking accepted replays before current-input eligibility; verify exact replay after staleness, JSON-key reorder equivalence, array-order conflicts, cross-group/key conflicts, concurrent identical creation and safe transaction retry behavior.
- [x] 3.4 Implement paginated history summaries and by-ID readback with computed isCurrent and retained input manifest; verify freshness changes after refresh, unchanged content/order across repository reconnection, stable history ties and 404 for cross-group lookups.
- [x] 3.5 Document acceptance versus quality/publication, replay recovery, stale-result meaning and non-destructive rollback; verify examples never claim model verification or change source facts/membership/publication.

## 4. HTTP integration and Swagger

- [x] 4.1 Add judgment routes and dependency wiring in `apps/api/src/app.ts` with the documented paths, strict queries, shared schemas, body bound, no-cache reads and safe 404/409/413/422/503 errors; verify offline route tests for every path and failure class.
- [x] 4.2 Add Swagger tags, examples and schemas for context, courses, feedback, submit and history/readback, reusing existing group discovery; verify `/docs/json` exposes all seven new method/path operations and examples match runtime contracts.
- [x] 4.3 Add isolated HTTP/PostgreSQL acceptance that discovers a draft, traverses members and comments at one revision, submits a complete expensive-first judgment, replays it, refreshes source feedback and reads stale history; verify exact order/content and unchanged group, membership, ingestion, suggestion and public responses.
- [x] 4.4 Update README, Plan, catalog docs and the historical assessment draft to reference this backend standard and explicitly supersede deterministic ranking/old tag proposals; verify frontend rendering, model execution and judgment publication remain documented follow-up scope.

## 5. Integrated verification

- [x] 5.1 Run `bun run lint`, `bun run typecheck`, `bun run test:api` and `bun run build:api`; verify all new contract, source, repository and route suites pass without a judge or external network, and record exact results in `docs/validation.md`.
- [x] 5.2 Run `API_INTEGRATION=1 bun run test:api` against an isolated local PostgreSQL setup using the documented workflow; verify migration persistence, concurrency, rollback, comments pagination and the end-to-end HTTP case, recording any environmental blockers.
- [x] 5.3 Run strict OpenSpec validation and review the final diff against scope; verify only backend/contracts/docs for this change are included and unrelated uncommitted badge preview work is preserved.
