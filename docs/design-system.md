# Design system

Phase 1 was accepted on September 30, 2026. `/design-system` presents the selected سنجش direction, لاجورد palette (`#304CB2` primary), supplied ring-and-cap logo, and locally bundled Vazirmatn. Direction, palette, and logo selectors are removed. Exploration remains in commit `f56b49f`; checkpoint `0d9f509` preserves the component preview before interaction refinements.

Semantic tokens live in `apps/web/src/app/globals.css`; shared showcase styling is in `apps/web/src/app/design-system/preview.css`, with reusable components and colocated CSS modules under `apps/web/src/components/`. Logo exploration assets remain under `apps/web/public/logos`, with a reusable prototype renderer; the selected page uses the supplied mark. The approved logo can be downloaded as SVG from the showcase.

The showcase includes typography, colors, buttons, badges, price states, source/freshness notices, sample filters/search/sort, removable chips, pagination, selection/comparison, course-detail dialogs, native accordions, and loading/empty/error examples. Retry is a visual example without a live request. Decorative category/course artwork makes no provider claims. Most examples are fictional; the shared homepage course-card examples use clearly dated provider snapshots.

Search focus outlines the complete field. Dialogs are centered and scrollable; Escape closes them and restores trigger focus. Removing filters restores the corresponding control's focus; opening comparison focuses its heading. Responsive rows reflow and comparison tables allow horizontal scrolling. Shared cards include compact categories, individual courses, and large groups; the homepage's selected cycling cover treatment is documented in [frontend](frontend.md).

The document root uses `lang="fa"` and `dir="rtl"`; styles use logical properties and explicit direction for Latin islands. Prices use Persian digits and distinguish free, paid, discounted, and unknown amounts. Original discounted prices are muted and struck through above the current amount. Fonts and supplied skills retain their license/attribution.

Acceptance covers the implemented showcase. Additional core-component coverage, shared UI-package extraction, and complete screen-reader/all-breakpoint review remain follow-ups. Current automated results and historical browser-review limits are in [validation](validation.md).
# Discovery review specimens

`/design-system` includes isolated saved-discovery specimens from the production
`DiscoveryCollectionPreview`, `DiscoveryEvidenceSummary`, `DiscoveryDecisionBar`
and `DiscoveryBadge` exports. They use existing semantic tokens and a course-stack
composition without invented covers. Pending/approved/dismissed, selected, busy,
disabled, stale, partial, suppressed and missing-course states are visible, along
with shared loading/empty/error feedback. Interactions use local state only.
Experimental similarity uses Persian decimals, independently of inbox confidence.
Latin identifiers are isolated and the sample date is Jalali.

`GroupFields` is shared by the existing group create/edit form and discovery
promotion. Its explicit-category variant is also rendered in the isolated
discovery specimens; submission there only validates local fields.

Compact queue previews use retained thumbnail stacks; `DiscoveryThumbnail` has
loaded, missing and image-error fallback behavior. The showcase uses a labelled
saved-snapshot image and a neutral missing-image example, without management reads.
Course details put images/title/provider/duration/instructor first. Optional notes,
scores and provenance remain available through keyboard-accessible disclosures.
Both ordinary and explicit-category `GroupFields` variants have labelled specimens.

`DiscoverySortControl` is shared by the review desk and isolated showcase, with
Persian choices for default order, highest similarity and most courses. Its label
uses an explicit accessible association. The showcase updates a local selected-order
caption without network requests. The control wraps with existing toolbar fields
and stacks at narrow mobile widths.
