# Proposal

## Why

Visitors need a dedicated place to browse all course groups and narrow them by topic. The homepage currently paginates groups while category cards filter individual courses, making category-based group discovery unavailable.

## What Changes

- Add `/groups` as one shared, server-rendered group catalogue with search, one optional category, and twelve groups per page. Category entry uses `/groups?category=<id>` rather than a separate category implementation.
- Keep search, category and page in shareable URLs, with matching totals, active-filter removal, clear-all, and distinct loading, empty and retryable error states.
- Extend the existing judged-group list API with normalized text search and category filtering before pagination, preserving public eligibility and stable ordering.
- Replace homepage group pagination with up to three actual group cards and «مشاهده همه مجموعه‌ها» linking to `/groups`.
- Change homepage category cards into links to the corresponding filtered group catalogue. Keep homepage individual-course search/free filtering and group detail destinations intact.
- Limit discovery controls to search and category; provider, price, level and sort controls are outside this change.

## Capabilities

### New Capabilities

- `course-group-catalog`: Shared public group browsing route, category entry, URL-backed discovery controls, pagination and accessible result states.

### Modified Capabilities

- `public-group-judgments`: Add list search/category parameters and replace the homepage pagination requirement with a three-group showcase and catalogue link.
- `homepage-course-catalog`: Amend course-filter and surrounding-frontend preservation requirements to allow category navigation and the compact group showcase.
- `course-categories`: Preserve category identity and presentation while changing homepage cards from course filtering to group-catalogue navigation.

## Impact

Browser-safe query contracts in `packages/core`; judged-group repository/routes/OpenAPI in `apps/api`; group clients, same-origin handler, shared cards, homepage and new `/groups` route in `apps/web`. Existing `/groups/[id]` comparisons, public course APIs, judgment freshness and fixed category IDs remain compatible. No migration, data mutation, scraping, model execution or new dependency is planned. Implementation will update `Plan.md`, `README.md`, frontend/public-catalog documentation and validation records. This proposal changes planning artifacts only.
