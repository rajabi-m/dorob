# Design system

Phase 1 was accepted on September 30, 2026. `/design-system` presents the selected سنجش direction, لاجورد palette (`#304CB2` primary), supplied ring-and-cap logo, and locally bundled Vazirmatn. Direction, palette, and logo selectors are removed. Exploration remains in commit `f56b49f`; checkpoint `0d9f509` preserves the component preview before interaction refinements.

Semantic tokens live in `apps/web/src/app/globals.css`; shared showcase styling is in `apps/web/src/app/design-system/preview.css`, with reusable components and colocated CSS modules under `apps/web/src/components/`. Logo exploration assets remain under `apps/web/public/logos`, with a reusable prototype renderer; the selected page uses the supplied mark. The approved logo can be downloaded as SVG from the showcase.

The showcase includes typography, colors, buttons, badges, price states, source/freshness notices, sample filters/search/sort, removable chips, pagination, selection/comparison, course-detail dialogs, native accordions, and loading/empty/error examples. Retry is a visual example without a live request. Decorative category/course artwork makes no provider claims. Most examples are fictional; the shared homepage course-card examples use clearly dated provider snapshots.

Search focus outlines the complete field. Dialogs are centered and scrollable; Escape closes them and restores trigger focus. Removing filters restores the corresponding control's focus; opening comparison focuses its heading. Responsive rows reflow and comparison tables allow horizontal scrolling. Shared cards include compact categories, individual courses, and large groups; the homepage's selected cycling cover treatment is documented in [frontend](frontend.md).

The document root uses `lang="fa"` and `dir="rtl"`; styles use logical properties and explicit direction for Latin islands. Prices use Persian digits and distinguish free, paid, discounted, and unknown amounts. Original discounted prices are muted and struck through above the current amount. Fonts and supplied skills retain their license/attribution.

Acceptance covers the implemented showcase. Additional core-component coverage, shared UI-package extraction, and complete screen-reader/all-breakpoint review remain follow-ups. Current automated results and historical browser-review limits are in [validation](validation.md).


Milestone 5 public pages reuse the accepted blue hero/abstract learning-path artwork, logo, local font, semantic tokens and existing button/focus styles. Public discovery, factual offers and qualified unranked comparison use reusable semantic components and logical responsive CSS. Fields absent from the public contract are not filled with prototype imagery/ratings/badges. Search/filter state is a GET URL form; loading and public-data notices are integrated. The new UI/service RTL detector passes. Desktop fixture discovery was inspected in Chrome; narrow visual/focus review remains pending due the Computer Use surface failure. See [integration](frontend-integration.md) and [validation](validation.md).
