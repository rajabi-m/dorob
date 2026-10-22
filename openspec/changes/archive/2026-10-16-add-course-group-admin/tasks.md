# Tasks

Verification policy: test essential behavior and material regression risks. Reuse existing coverage and combine overlapping checks; each task's verification can be satisfied by a shared focused test or recorded observation. Avoid exhaustive permutations, implementation-mirroring tests, duplicate browser/API coverage of every edge case, and repeated passing suite runs. Preserve required lint, type checking, and build checks.

## 1. Persistent suggestions and shared contracts

- [x] 1.1 Add browser-safe submission/review/member-provenance types, pagination/filter parsing, and runtime guards in `packages/core`; verify focused tests cover confidence boundaries, invalid identities/status/version, and encoded course IDs.
- [x] 1.2 Add the next explicit SQL migration for immutable suggestions, pair reviews, transition history, constraints, replay uniqueness, and read indexes; verify isolated migration tests preserve legacy groups/members/publication and reruns, seeding manual provenance without invented confidence.
- [x] 1.3 Implement submission replay and paginated confidence/history/member-provenance repository reads; verify database tests cover exact replay, conflicting replay, multiple systems, tied sorting, matching totals, missing parents, and durable decisions after reconnection.
- [x] 1.4 Document the persisted data model and additive migration/rollback behavior in `docs/catalog.md`; verify the documented migration command and preservation claims against isolated tests.

## 2. Review actions and management API

- [x] 2.1 Implement transactional approve/reject/reopen with expected review versions and recorded retry outcomes; verify database tests cover atomic rollback, simultaneous conflicting reviews, sticky rejection, resubmission, reopening, and retry after an intervening transition.
- [x] 2.2 Synchronize existing membership PUT/DELETE with pair state/history while preserving idempotent status codes and provenance on no-op repeats; verify existing catalog tests plus manual add/remove/re-add and submission/review concurrency cases.
- [x] 2.3 Add suggestion submission/list/review/history and member-review routes with OpenAPI schemas and safe errors; verify injected-repository route tests for all success/error/replay codes and generated Swagger contracts without any AI invocation.
- [x] 2.4 Extend management group/course search and group filters with existing Persian normalization; verify filters apply before pagination/totals, matches beyond page one, invalid filters, and compatibility with old unfiltered clients.
- [x] 2.5 Add concrete curl/Swagger examples for submitting, inspecting confidence, approving, rejecting, reopening, replaying, and manual overrides to `docs/catalog.md`; verify examples against temporary records and explain caller-supplied attribution/local-only access.

## 3. Web management boundary

- [x] 3.1 Add a server-only management client and concrete same-origin admin handlers using validated `DOROB_API_URL`, bounded requests, no-store, runtime guards, and safe error mapping; verify web API tests cover method/path validation, foreign/missing Origin mutations, non-JSON input, timeout, oversized/malformed responses, 409 handling, and no arbitrary forwarding.
- [x] 3.2 Add bounded course inspection summaries from management current observations and member/suggestion provenance reads; verify minimal-reference, unready-thumbnail, missing-fact, and Latin-ID cases remain inspectable without exposing raw evidence or diagnostics.
- [x] 3.3 Document loopback admin startup, API configuration, browser transport, and deferred authentication in `README.md`; verify instructions match actual local routes and keep the existing frontend setup working.

## 4. Persian admin group management

- [x] 4.0 Inspect the existing design-system page and shared components, reuse suitable primitives, and extend shared components only where needed; verify admin pages use the existing tokens, typography, and component implementations without a separate visual system.
- [x] 4.1 Build `/admin/groups` and the admin shell with normalized search, category/publication filters, totals/pagination, member counts, eligibility, and loading/empty/error states; verify focused UI tests and browser navigation find draft results beyond the initial page.
- [x] 4.2 Build draft creation and editable group fields at `/admin/groups/new` and `/admin/groups/[id]`; verify valid persistence, slug conflict/input retention, unknown group state, and uncertain-create reconciliation without blind retries.
- [x] 4.3 Add persisted publish/unpublish actions and clear two-member eligibility feedback; verify UI/API behavior for drafts, one-member published groups, eligible groups, removal below threshold, and failed writes using temporary fixtures.
- [x] 4.4 Add a searchable existing-course picker, approved-member list, retained-course inspection, manual addition/removal, and provenance/history views; verify a management-only course can be inspected and membership changes preserve the correct manual/system provenance.
- [x] 4.5 Update `docs/catalog.md` with the group creation/publication/manual-membership workflow and public-fixture boundary; verify screenshots or recorded browser observations match the documented states.

## 5. Suggestion review interface

- [x] 5.1 Add pending/approved/rejected suggestion views with confidence-descending pagination, provider, system name/ID, Persian confidence/date, and retained course inspection; verify UI tests cover tied scores, multiple systems, long Persian titles, and manual members without confidence.
- [x] 5.2 Wire approve/reject/reopen and reviewed history with pending controls, pair-wide refresh, counts/eligibility refresh, 409 reconciliation, and safe retries; verify tests and a two-tab browser flow preserve the winning decision and require explicit reopening after rejection.
- [x] 5.3 Add the disabled judge-AI button with a visible Persian explanation; verify no request/job/result occurs and the normal submission/approval flow works without an AI provider.
- [x] 5.4 Document review semantics, system-reported confidence, sticky rejection as the proposed policy default, and manual override behavior in `docs/catalog.md`; verify examples match API and UI behavior.
- [x] 5.5 Add all new reusable admin components/variants to `/design-system` through the existing showcase pattern, using the actual shared implementation and labelled samples; verify representative states render and demo interactions cannot write real catalog data or invoke AI.
- [x] 5.6 Validate changed admin and showcase UI with the RTL detector and a short desktop/mobile keyboard review; check Persian text, focus/labels, mixed-direction names/URLs, dates/numerals, overflow, and one representative failure/recovery state, recording results in `docs/validation.md` without a broad browser or viewport matrix.

## 6. Integrated acceptance

- [x] 6.1 Run one isolated smoke flow from draft creation through attributed suggestion submission, confidence-sorted review, approval, and publication; confirm persistence and public eligibility, reusing earlier focused evidence for replay/rejection/reopening/manual overrides rather than repeating every scenario in the browser. Verify existing drafts and observations remain unchanged.
- [x] 6.2 Run the relevant focused API/core/web tests and isolated PostgreSQL integration coverage for this change, plus `bun run lint`, `bun run typecheck`, `bun run build:api`, and `bun run build`; use the documented Bun test entry points without running both the full default and full integration API suite redundantly. Record outcomes/blockers in `docs/validation.md`; rerun only checks affected by subsequent fixes and do not treat the known Bun build issue as a pass.
- [x] 6.3 Update `Plan.md` and review `README.md`/catalog documentation for the completed local admin scope, actual acceptance, and deferred auth/AI/public-group integration; verify `openspec validate add-course-group-admin --strict` and `git diff --check` pass and no implementation acceptance claims exceed the recorded evidence.
