# Proposal

## Why

Dorob now retains real provider courses, current source observations, and hosted thumbnails in its backend, but the homepage course grid still imports dated fixtures. Connecting that grid is the first focused product integration and establishes a reusable public API boundary without changing the rest of the frontend.

## What Changes

- Add read-only public course list and detail endpoints, with compact presentation contracts shared through `packages/core`, documented validation, safe errors, catalog-wide search/filtering, and bounded pagination.
- Automatically expose courses whose current observation is presentation-ready, independently of editorial group membership. Do not introduce a course publication workflow in this change.
- Fetch the first course page through the Next.js server and centralize backend access, validation, timeouts, and configuration. Supply same-origin web access for subsequent list/detail requests and hosted thumbnails.
- Replace only the homepage `#courses` grid's fixture data and its associated results, paging, loading/error/empty states, and course-detail interactions. Show source facts and per-course collection timestamps, with explicit missing information and accountable price statuses.
- Connect existing search/category/free controls to the real course results through minimal handler wiring; preserve their appearance and placement. Filtering occurs before pagination across the eligible catalog.
- Preserve the homepage hero (including its sample shelf and provider strip), sample groups, topic/category presentation, header/navigation/footer, other routes, and design-system previews. Preserve their fixture data and sample-detail behavior. No homepage redesign, new course route, grouping migration, AI, scraping, or deployment is included.

## Capabilities

### New Capabilities

- `public-course-catalog`: Website-facing current course facts, eligibility, paginated discovery, pricing accountability, and safe read-only API behavior.
- `homepage-course-catalog`: API-backed homepage course results and details, resilient loading and recovery, and compatibility with the surrounding sample frontend.

### Modified Capabilities

None. Existing management, whole-snapshot ingestion, thumbnail readiness, category registry, and editorial group publication contracts remain intact.

## Impact

- Backend: additive public routes and repository projections over existing courses, current snapshots, processed assets, and editorial category relationships; no new DB data or collection work is implied by reads.
- Shared package: browser-safe public course types and runtime boundary validation, without server dependencies.
- Frontend: the homepage course data boundary, scoped course display/detail components, and same-origin read/image handlers. Shared components may receive additive compatibility-preserving options only when needed for the course grid.
- Local setup: server-only backend origin configuration, launcher propagation of the selected API port, and documented frontend/API behavior. Existing frontend-only sample routes remain usable; the integrated course section explicitly reports an unavailable backend.
- Validation: API contracts, real database list/detail behavior, pagination/search semantics, course UI recovery and RTL/mobile checks, and a final diff review that preserves unchanged frontend regions. The owner narrowed browser acceptance on October 11 to the homepage course section; broader frontend review is deferred. No commits or implementation are authorized by this proposal.
