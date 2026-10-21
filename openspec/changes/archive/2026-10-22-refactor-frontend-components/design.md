# Design

## Context

See proposal.md for motivation. The October 21 frontend now serves `/`, `/groups`, `/groups/[id]`, `/courses`, `/design-system` and trusted local `/admin` pages. Homepage search targets groups; the individual-course shelf is bounded to three; public course links open providers rather than a local modal. Earlier exploration predates that catalogue migration and must not be treated as the acceptance baseline.

Observed dependencies:

- `homepage.tsx` still contains `groupId` fixture mode, local filtering, a sample dialog, comparison selection/tray/table and an old artwork hero although the public entry supplies the real hero and shelves.
- `home-hero-variants.tsx` retains an unselected comparison variant and a saved-course fallback. The actual page supplies a real-group request.
- `discovery-showcase.tsx` owns category presentation consumed by production; `public-course-card.tsx` exports formatting and price rendering consumed by group/admin views; `public-group-section.tsx` exports provider lookup consumed elsewhere.
- `course-catalog.tsx` already reuses `CatalogShell` from `group-catalog.tsx`, and both use `Breadcrumb`. This is existing reuse to preserve, not rebuild.
- Product routes import `design-system/preview.css`; real comparisons use `python-group-preview.module.css`. Names and ownership obscure shared production dependencies.
- The prior import audit found the Python preview TSX, its snapshot JSON and `brand.tsx` unreachable from app entries. These are removal candidates, not permission to delete their still-used sibling CSS or every similarly named fixture.
- Uncommitted edits currently affect the icon, category styling, featured shelf, hero CSS and frontend notes. Their content belongs to the product baseline and must survive implementation.

## Goals / Non-Goals

**Goals:** Simplify the active dependency graph, give repeated behavior a clear owner, separate production primitives from fixture demonstrations, and prove no unintended UI/data/navigation regression.

**Non-Goals:** Redesign; unify unlike course/group cards; remove the design-system route or trusted admin tools; alter public API contracts, endpoint availability, validation semantics, database data, provider facts or AI judgment ordering; add a dependency or broad automatic formatter; fix the Bun production runtime issue as part of this cleanup.

## Decisions

### 1. Establish removability from entry points and actual exports

Use application pages/layouts/loading/error/route conventions, runtime/dynamic imports, design-system examples, tests and asset URLs as roots. Remove the confirmed orphan Python preview and old brand implementation; remove snapshot data and assets only when remaining references are absent. Remove unused branches/props/state inside `Homepage` and the unused hero variant, retaining the selected real shelf's unavailable/retry behavior. Keep shared modules still needed by maintained showcase examples. Inspect `public-course-section.tsx` against the new shelf/catalogue and tests rather than assuming it remains a live consumer.

Alternative rejected: deleting every file labelled preview/showcase/sample. Several currently supply product styles, metadata or actively maintained reference examples.

### 2. Create focused owners without a universal component framework

Proposed ownership (exact filenames can follow nearby conventions):

- Shared brand mark/lockup owns the accepted reference logo and wordmark. Header/footer consumers supply their existing destinations and layout. Keep logo SVG download behavior in the design system; retire alternate logo definitions only after reference verification.
- Browser-safe provider presentation owns the five identity/logo mappings and reusable failure handling. Backend-owned provider/filter contracts remain authoritative; do not replace a richer catalogue registry with a divergent frontend list.
- Category presentation owns icons, artwork mapping and descriptions while `@dorob/core` retains IDs/labels. Showcase consumers import this module, not the reverse.
- Pure Persian formatting owns numbers, content-minute display and Tehran/Jalali dates. Price presentation owns existing free/paid/subscription/unknown semantics and any genuinely repeated offer rendering. Different fixture contracts remain behind explicit adapters.
- Catalogue shell, search form, chip/paging presentation and mobile filter-dialog mechanics become shared where duplicated. Course and group query parsing, counts, result copy, filters and page sizes remain separate. Preserve course catalogue's page-change focus/scroll handling when extracting shared UI.

Alternative rejected: a single configurable page/card/dialog with many conditional props. Public courses, assessed group rows and admin inspection have meaningfully different contracts.

### 3. Share request mechanics while preserving domain policy

Reuse bounded body reading, content-type checks, cancellation and fixed-origin request plumbing between existing public clients where equivalent. Keep course/group validators, identity/page checks, response limits, deadlines, status mappings and localized errors explicit. Group conflict and judgment pinning must survive. Browser-safe helpers cannot import server-only clients, environment configuration or management code. Admin/discovery mutation transport and recovery semantics remain separate; only safe pure formatting/presentation reuse crosses that boundary.

Alternative rejected: combining public and management requests into one permissive generic proxy. That would expand risk without helping this UI cleanup.

### 4. Separate production styling from showcase scaffolding

Extract production tokens/primitives from `preview.css` before removing imports, leaving lab/demo layout local to `/design-system`. Root tokens remain the semantic source of truth. Rename/move the active Python-named comparison stylesheet to a neutral group-detail location, updating every consumer. Remove obsolete selectors after checking JSX, dynamic class composition, responsive variants and CSS-module exports. Preserve breakpoint behavior and specificity rather than reorganizing the entire style system.

### 5. Maintain a current component reference

Retain backend-independent examples of maintained cards, category presentation, filters, admin/discovery controls and shared primitives. Add focused examples for the shared brand/breadcrumb where missing. Obsolete alternatives can be retired, but active examples must not lose keyboard, local interaction or provenance behavior. Fixtures stay explicitly confined to reference screens; no live public error state gains fixture fallback. Update the delta's preservation requirement rather than inventing a new architecture capability.

## Risks / Trade-offs

- Shared CSS extraction changes specificity or order -> compare before/after screenshots at desktop, 659px, 390px and 320px, including catalogue drawers and long text.
- Static imports miss dynamic/asset use -> record a removal inventory with callers and reason, then scan final references and exercise `/design-system` plus admin routes.
- Over-generalization erases domain differences -> extract only demonstrated repetition and keep adapters/validators at domain edges.
- Concurrent product edits invalidate the baseline -> compare against the working tree at apply time and preserve those edits; pause only for an actual conflicting requirement, not ordinary path moves.
- Known Bun page-data collection failure -> run the production build, record exact outcome and compare with the pre-refactor result; do not claim production startup is validated if blocked.

## Migration Plan

1. Capture current working-tree route/dependency and browser behavior baselines, preserving unrelated edits. No branch, commit or stash without user authorization.
2. Extract shared primitives/helpers and migrate callers in small reversible groups.
3. Remove confirmed orphan code, unused branches, fixture assets and obsolete styles only after consumers are migrated.
4. Refresh maintained reference examples and documentation; run focused regressions and route/browser acceptance.
5. Ship through the existing frontend workflow after review. No migration or data operation is required. Rollback reverts only refactor changes, retaining prior product work and data.

## Open Questions

None blocking planning. Exact helper filenames and safe extraction boundaries can follow the demonstrated consumers during implementation without changing scope or product behavior.
