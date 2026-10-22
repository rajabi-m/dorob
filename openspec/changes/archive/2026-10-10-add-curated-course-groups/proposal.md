# Proposal

## Why

Dorob needs predictable, manually curated course destinations without the cost and complexity of AI-generated groups and automated placement. The fresh API has database connectivity but no product tables, making this a suitable first product-data change.

## What Changes

- Define the six existing categories as a fixed shared TypeScript registry with stable IDs and Persian labels; do not introduce a category table.
- Keep category SVG artwork and its ID-based mapping in the frontend. Labels are never lookup keys for artwork.
- Persist editor-defined course groups with a stable ID, unique slug, Persian title and scope description, category ID, optional target level, and publication flag.
- Introduce minimal provider-course reference records so existing courses can be registered and explicitly linked to groups without building full ingestion.
- Allow courses in multiple groups, preserve unassigned courses, and calculate counts from membership.
- Provide local management and read APIs documented in Swagger for group creation/editing, course registration, and membership assignment/removal.
- Keep drafts visible to local management; expose only published groups with at least two members through public read endpoints.
- Document repeatable migrations and the manual curation workflow. Replace the historical AI-grouping direction in affected project documentation when implementing this change.

## Capabilities

### New Capabilities

- `course-categories`: Fixed category identity and Persian labels, validated category references, and frontend-owned artwork selection.
- `course-group-curation`: Persistent group definitions, minimal source-course references, explicit membership, and management/publication APIs.

### Modified Capabilities

None. The existing backend-service and database-connectivity contracts remain applicable and unchanged.

## Impact

- Add a browser-safe shared contract package under `packages/core`, SQL migrations and catalog persistence/routes in `apps/api`, and migration scripts in the Bun workspace.
- Reuse PostgreSQL and native Bun SQL; no ORM, vectors, AI models, job queue, or external service is required.
- Category definitions may be extracted from the frontend's showcase module while preserving existing IDs and presentation. Frontend API integration, group-page redesign, reconciliation of Python prototype membership, admin UI, automatic seeding of course memberships, scraping/import pipelines, full course facts, rankings, AI comparison, authentication, and deployment are outside this change.
- Management operations are for the local development service. Public deployment needs a separate access-control decision.
