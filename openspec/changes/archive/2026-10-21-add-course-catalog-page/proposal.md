# Proposal

## Why

The homepage currently acts as a paginated individual-course catalogue even though Dorob's main value is comparison within course groups. A dedicated course catalogue lets visitors search retained offerings without competing with the homepage's group discovery path.

## What Changes

- Make homepage header search navigate to `/groups?q=...`; retain category links to the group catalogue and the group-focused hero.
- Replace the full homepage course results with up to three recently accepted eligible courses and «مشاهده همه دوره‌ها» linking to `/courses`, without homepage course filters or pagination.
- Add `/courses` with server-rendered results, normalized search, provider, pricing-status and content-duration filters, matching totals and eighteen results per page.
- Persist submitted course search, filters and pagination in the URL, with removable chips, clear-all, mobile filters, and distinct loading/empty/error/invalid states.
- Reuse real course cards and price provenance; titles and «مشاهده دوره» open the provider course page directly in a new tab, replacing the early-stage details modal. Make both catalogues discoverable through public navigation and direct the group catalogue's course fallback to `/courses`.
- Extend the public course query contract additively for the new filters; retain existing API category/free-only behavior. No category or level control on `/courses`.

## Capabilities

### New Capabilities

- `course-catalog`: Public individual-course browsing page, URL state, filters, pagination, accessible controls and navigation between discovery destinations.

### Modified Capabilities

- `homepage-course-catalog`: Bound the homepage course shelf and direct primary search to groups while preserving real-card behavior and surrounding presentation.
- `public-course-catalog`: Add validated provider, pricing-status and duration filtering across the eligible catalogue before totals/pagination.

## Impact

Touches the homepage, new `/courses` route, shared public navigation/catalogue controls, group catalogue course fallback, server/browser course clients and same-origin handler, browser-safe core query types/validation, public API route schemas and repository filtering. Requires focused core/API/frontend tests, Persian RTL/mobile/keyboard checks, and documentation updates during implementation. No new dependencies or database migration are planned. No scraping, source refresh, group publication, AI execution, relevance ranking, price-range filtering, rating filters, new course-detail route, or broad frontend cleanup. The separate scraper extraction change remains independent.
