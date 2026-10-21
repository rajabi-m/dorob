# Tasks

## 1. Protect the current product baseline

- [x] 1.1 Record the apply-time working-tree changes, active route/asset references and pre-refactor screenshots for `/`, `/groups`, a real comparison, `/courses` and `/design-system`; verify the record includes newer product edits and does not stash, overwrite or commit them.
- [x] 1.2 Capture the existing lint/types/web-core test/build results and navigation/request behavior, including homepage group search, bounded shelves, real hero failure state, provider links, repeated `#groups` jumps and price provenance; verify the record distinguishes existing environment failures from regressions.

## 2. Give shared presentation clear owners

- [x] 2.1 Extract the selected brand mark/lockup and migrate public/admin/reference consumers while preserving their link destinations and logo download; verify header/footer rendering and SVG download, and document the selected-brand owner in frontend notes.
- [x] 2.2 Extract browser-safe provider/category presentation and migrate live and showcase callers; verify five provider identities, unknown/failed-logo behavior, core registry IDs and `/groups?category=<id>` links with focused existing or extended presentation tests.
- [x] 2.3 Extract Persian number/duration/Jalali-date helpers and shared public price/offer presentation from card/section files; verify null, zero/free, paid discount, subscription and unknown semantics with focused tests and document the shared owners and fixture adapters.

## 3. Consolidate active discovery UI and transport

- [x] 3.1 Move the already-shared catalogue shell to neutral ownership and extract duplicated search/chip/paging presentation where equivalent; verify course and group catalogue tests retain distinct queries, headings, counts, 18/12 page sizes, clear/reset behavior and navigation destinations.
- [x] 3.2 Extract duplicated mobile filter-dialog mechanics without merging course and category controls; verify focus containment, Escape/selection dismissal, trigger focus return, pending state and course page-change focus/scroll tests; document the shared control boundaries.
- [x] 3.3 Consolidate equivalent public request/body-reading mechanics while preserving server/browser separation and domain validators; verify bounded bytes, deadlines, cancellation, invalid JSON/content, identity/page checks, 404/409/422/503 handling and judgment pins using existing transport suites with targeted additions where needed.
- [x] 3.4 Verify admin/discovery forms, inspection and recovery still work after shared presentation imports move, using the existing admin/discovery UI suites; record that mutation transports, persisted replay and backend contracts remain unchanged.

## 4. Retire obsolete flows and separate reference code

- [x] 4.1 Remove unreachable `Homepage` fixture comparison/filter/dialog/artwork branches and the unselected hero variant/saved fallback; verify public entry points require the real flows and regression coverage preserves shelves, group search, provider navigation and hero unavailable/retry behavior; update the frontend behavior notes.
- [x] 4.2 Remove the orphan Python preview TSX, old brand implementation and any remaining unused legacy section exports only after recording callers; verify static/dynamic imports, tests and conventional route entries have no surviving consumer and retain the public course-detail API endpoints.
- [x] 4.3 Remove fixture snapshots, old logo/artwork assets and obsolete selectors made unreferenced by the preceding changes; verify asset URL references, CSS-module exports and design-system examples before deletion and record each retained exception or deletion reason.
- [x] 4.4 Separate shared product styles from design-system lab layout and move the active Python-named comparison stylesheet to a neutral location; verify imports, CSS order, responsive rules and before/after public/reference screenshots retain the approved appearance, and document the new style ownership.
- [x] 4.5 Update `/design-system` to demonstrate maintained shared components, including brand/breadcrumb/provider/filter primitives where appropriate; verify it remains usable with the API unavailable, fixture interactions/provenance remain independent, and current card/admin/discovery examples remain operable.

## 5. Verify the complete refactor

- [x] 5.1 Run root lint, type checking, all applicable web/core suites in isolated processes, touched-file RTL audit, whitespace checks and production build; verify no new failures and record exact results or the known Bun page-data blocker in `docs/validation.md`.
- [x] 5.2 Compare public/reference layouts at desktop, 659px, 390px and 320px using long Persian/Latin text; verify no horizontal overflow, visible keyboard focus, native repeated-hash scrolling, provider animation/reduced-motion behavior without pause controls, catalogue filter/history behavior and unchanged group course order.
- [x] 5.3 Reconcile `Plan.md`, `README.md` and affected frontend documentation with the completed removals/shared owners; verify links, retained public contracts and removal inventory are accurate, then run `openspec validate refactor-frontend-components --strict` and review the final diff against the protected baseline.

## Workflow follow-up

- The owner explicitly requested implementation through the apply workflow on October 21, 2026.
- Commit, push and branch operations require the project's separate user authorization; planning does not provide it.
- Sync/archive only after implementation and verification are complete and the owner requests finalization.
