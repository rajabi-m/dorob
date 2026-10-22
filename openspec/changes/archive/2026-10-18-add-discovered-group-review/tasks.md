# Tasks

## 1. Discovery recovery contract and read endpoint

- [x] 1.1 Add browser-safe promotion lookup and newly consumed run/evidence/history/overlap response types and validators in `packages/core`, reusing existing discovery guards; verify valid real wire shapes and rejection of malformed IDs, counts and page envelopes with focused contract tests.
- [x] 1.2 Add the candidate promotion GET using existing promotion/delivery tables and consistent read semantics; verify unpromoted versus unknown candidates, persisted draft recovery, cumulative partial/complete counts and read-only behavior with isolated API integration tests.
- [x] 1.3 Document the additive lookup response and recovery semantics in `docs/catalog-embeddings.md` and API documentation; verify examples match the handler and no migration or mutation is required for reads.

## 2. Scoped browser transport

- [x] 2.1 Add concrete same-origin discovery handlers and server-only client operations for paginated saved runs, candidates, evidence, overlap, history, needed frozen provenance, promotion lookup, review, promotion and delivery; verify paths, query/body validation and response guards with admin transport tests.
- [x] 2.2 Preserve bounded body sizes, no-store, timeouts and foreign-origin mutation rejection without enabling generic proxying or execution routes; verify malformed responses, unsupported operations, 404/409/422/503 and origin rejection before upstream fetch in handler tests.

## 3. Shared review components and showcase

- [x] 3.1 Implement shared collection preview, evidence summary and discovery decision variants using existing tokens/components, own discovery-status vocabulary and course-stack composition; verify meaningful status text, missing-data behavior and keyboard-accessible controls in component tests.
- [x] 3.2 Add isolated interactive discovery specimens to the existing admin showcase using the same exports, including selected, pending/approved/dismissed, busy, stale, partial, missing-field, loading/empty/error cases; verify specimen actions produce no network requests and document usage in `docs/design-system.md`.
- [x] 3.3 Review rendered specimens at desktop and 360px mobile width with long Persian text, Latin identifiers, Persian decimals/Jalali dates, focus visibility and reduced motion; run the RTL skill detector on touched UI files and resolve findings, recording visual evidence and limitations in `docs/validation.md`.

## 4. Saved discovery browsing and evidence

- [x] 4.1 Add `/admin/discoveries`, admin navigation and paginated run/retained/suppressed selection with addressable run/page/candidate state and browser back/forward; verify reload, page changes, direct links and empty/incomplete runs using admin UI tests.
- [x] 4.2 Build the desktop right-side queue and selected detail view, with mobile queue/detail navigation and focus restoration; verify navigation remains reachable without page overflow and stale responses cannot replace the newly selected collection.
- [x] 4.3 Hydrate member inspections with at most four concurrent requests and scoped per-ID reuse, preserving failed/unready identities; expose experimental mean/minimum scores, model/run/frozen evidence, existing-group reconciliation, paginated overlap and history; verify bounded requests, member-level retry and frozen-versus-current labels in UI tests.
- [x] 4.4 Update README navigation/setup and `docs/catalog-embeddings.md` with saved-results review, empty states and separately invoked CLI discovery; verify links and descriptions against the delivered routes without implying browser generation or AI-created titles.

## 5. Decisions, draft creation and recovery

- [x] 5.1 Wire approval, dismissal and return to pending with optional title/note, observed versions, stable request IDs and refreshed history; verify approval creates no draft/member and conflicts preserve unsaved input rather than overwriting newer decisions.
- [x] 5.2 Add separate promotion fields using existing group validation, requiring saved approval and explicit partial acknowledgement while blocking stale/suppressed promotion; verify missing/invalid fields, slug conflicts and currentness/partial gates in UI tests, retaining existing form regression tests if fields are extracted.
- [x] 5.3 Persist unresolved promotion request ID/payload before sending, reconcile by candidate lookup on reload and permit only identical replay while uncertain; verify lost responses, reloads and an already promoted candidate resolve to one original draft without duplicate creation.
- [x] 5.4 Show recovered draft link and cumulative delivery counts, with explicit delivery/retry and separate creation/delivery feedback; verify interrupted delivery recovery and handoff to existing membership review without assigning members or publishing.
- [x] 5.5 Update README, `docs/catalog-embeddings.md` and affected `Plan.md` status/limitations for the delivered decision and recovery flow; verify documentation distinguishes candidate approval, draft creation, suggestion delivery, member approval and publication.

## 6. Integration acceptance

- [x] 6.1 Exercise saved-run browsing through decision, promotion, reload recovery, explicit delivery and group-management handoff using isolated records; verify no real editorial records are altered, no inference starts, and unchanged course-to-group inbox/provenance regression tests pass.
- [x] 6.2 Run `bun run lint`, `bun run typecheck`, `bun run build`, `bun run build:api` and relevant web/core/API tests; record exact results in `docs/validation.md`, including any persistent frontend Bun production-build failure or unavailable database checks.
- [x] 6.3 Inspect the integrated panel and `/design-system` on desktop/mobile with keyboard and mixed-direction content, run the RTL detector on every touched UI file, and verify all newly reusable components/variants have matching specimens before completing the checklist.


## 7. Run-wide collection sorting

- [x] 7.1 Add shared allowlisted discovery sort/query contracts and SQL ordering before pagination, preserving omitted-sort compatibility; verify numeric similarity/count order across pages, stable ties, run/type filtering, invalid/repeated inputs and read-only behavior in isolated API and contract tests.
- [x] 7.2 Forward and validate sort through concrete browser transport; add a shared Persian select and isolated showcase, persisting URL/history/link sorting and resetting page/selection on change; verify navigation, safe errors and no-network specimens with focused web tests.
- [x] 7.3 Update setup/design/status/validation documentation, run lint/type checks/web and API builds plus relevant tests, inspect sorting at desktop and 360px mobile widths, and run the RTL detector on touched UI; record exact results and the known Bun build limitation.
