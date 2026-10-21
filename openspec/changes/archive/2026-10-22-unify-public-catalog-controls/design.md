# Design

## Context

See proposal.md for motivation. `GroupCatalog` and `CourseCatalog` already share `CatalogShell`, search/chip/paging primitives and `CatalogFilterDialog`. Their results markup and effects remain separate: groups render the count after the toolbar; courses render it inside. Group pagination focuses only when page is greater than one, while courses compare previous page and scroll in both directions. Pending groups retain cards; pending courses remove them.

Common styles currently live in `app/groups/catalog.css`, imported by both routes. `app/courses/catalog.css` adds toolbar-specific overrides. Existing happy-dom suites cover each catalogue's markup, URLs and modal wiring but cannot verify responsive computed geometry. Both domain specifications have been read; neither mandates the existing visual differences.

## Goals / Non-Goals

**Goals:** Give layout and interaction policy explicit shared owners; make route-level duplication unnecessary for the toolbar and paging effects; preserve domain boundaries and accessible semantics.

**Non-Goals:** A generic query engine, a single configurable catalogue page, backend changes, new filters, card redesign or homepage changes. Existing domain URL serializers and server routes remain separate.

## Decisions

### Compose shared presentation around domain-owned content

Introduce shared catalogue layout/results presentation components with slots for sidebar filters, active chips and result content. A shared results toolbar owns its accessible heading, count/status and mobile trigger. Callers supply IDs, labels, numeric count or unavailable state, pending state and filter content. The existing native modal remains the sole modal mechanics owner. Keep category links and course radio groups as distinct domain components; allow desktop/mobile identifiers to remain distinct.

Use one small shared catalogue interaction hook for transition navigation, close-before-navigation and page-change focus/scroll. It accepts the committed page and exposes the existing route-appropriate navigation callback; it does not serialize domain state. Compare the previous committed page, skip initial render and scroll the results container after a page change. This intentionally includes a condition change that resets a later page to page one, matching current course behavior.

Alternative: patch each page's JSX/CSS separately. Rejected because it retains multiple owners for the same visual and interaction policy. Alternative: merge pages and query handling. Rejected because distinct domain contracts would require unnecessary configuration and coupling.

### Use the courses toolbar arrangement with one neutral stylesheet

Count/status is first in RTL flow and mobile filter trigger second, giving count-right/trigger-left placement. Keep the hidden heading out of normal layout and anchor scrolling to the results container rather than its one-pixel heading box. At widths above 760px the trigger is hidden and sidebar visible; at 760px and below the reverse applies. Chips wrap beneath the toolbar. Remove empty-chip spacing and route-specific toolbar alignment/margin overrides.

Move common catalogue selectors to a neutral shared stylesheet imported by their component owner, including shared search, sidebar, toolbar, chips, paging and dialog rules. Keep course fieldset/grid styles and group-specific content styling separate. Retain the existing standalone dialog reference and add independent shared toolbar/layout examples to `/design-system`, without API calls. Alternative: continue importing the groups route stylesheet from courses; rejected because it obscures shared ownership.

### Retain committed content during transitions

Render prior committed result content while navigation is pending on both routes; replace the toolbar count with a single localized pending status and keep `aria-busy` on the results region. On commit show the new success, empty or failure state. Failure has no numeric count. Preserve error copy and retry semantics; retry refreshes the current committed conditions. This uses the existing React transition/router behavior without new data fetching or caching.

### Validate behavior and geometry separately

Share meaningful tests for status, modal/navigation and page-change focus, while retaining existing domain URL/card assertions. Browser acceptance compares both catalogues at 320, 390, 760, 761 and 1280px, including unfiltered, filtered, pending and error states. Verify toolbar element placement and computed spacing, keyboard access, Persian text, mixed-direction chips and absence of page overflow. Happy-dom assertions alone cannot catch CSS drift.

## Risks / Trade-offs

- Shared CSS movement changes cascade order -> review both route imports and reference consumers, then inspect computed layout at the breakpoint edges.
- Returning modal focus and pagination focus can conflict -> close before starting navigation; only move to results after a committed page change, while same-page selections leave focus on the trigger.
- Retained cards could be mistaken for newly filtered results -> announce pending state in the stable toolbar position and mark the region busy until commit.
- Shared abstractions could absorb domain logic -> keep URL serialization, filter content, result rendering and page-size calculations in the existing callers.

## Migration Plan

Introduce shared owners and migrate both routes together. Remove obsolete common route CSS and overrides only after checking consumers. Update frontend ownership/behavior documentation and validation evidence. No data migration or external deployment is needed; rollback restores the two callers and prior style imports together. Preserve unrelated working changes and do not commit or create a branch.
