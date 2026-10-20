# Proposal

## Why

Dorob already retains real curated groups and revision-bound AI judgments, but visitors still see fixture groups and hardcoded assessments. Connect the homepage and group destinations to those retained results so visitors can discover and compare actual courses without running inference on page visits.

## What Changes

- Add read-only public judged-group discovery and detail APIs, selecting the newest current judgment automatically for explicitly published groups with at least two members. Group publication remains the only editorial gate; no separate judgment approval workflow is added.
- Require complete presentation-ready membership so a comparison never silently drops a judged course. Return provider facts separately from generated hero text and assessments.
- Replace homepage fixture group cards with actual counts, providers, hosted covers and links to stored group slugs; provide independent loading, empty and retry states.
- Generalize the selected Python page layout for every eligible group, preserving judge order, four supported tags and optional assessment bullets, alongside traceable retained provider facts and purchase options.
- **BREAKING**: Public fixture-only group destinations stop rendering fixture comparisons. The known Python and n8n legacy links redirect to their corresponding real slugs; unrelated or ineligible destinations return 404.
- Preserve strict existing judgment freshness, including publication status. Publish before judging; publication or source changes can require a new explicit judgment. Reads never generate or submit one.

## Capabilities

### New Capabilities

- `public-group-judgments`: Public selection, consistent course presentation, homepage judged-group discovery and reusable judgment-backed group pages.

### Modified Capabilities

- `homepage-course-catalog`: Narrow the preservation requirement to allow replacing fixture groups and their destinations while retaining independent course discovery, hero sample interactions and design-system fixtures.

## Impact

- Browser-safe contracts in `packages/core`; additive API repository/routes and OpenAPI documentation in `apps/api`; server-only web client, same-origin retry handlers, homepage group section and `/groups/[id]` in `apps/web`.
- Reuse existing catalog, immutable judgment ledger, hosted thumbnails, semantic design tokens and course presentation helpers. No database migration, provider ingestion, AI execution, publication mutation, authentication or deployment is planned.
- Update `Plan.md`, `README.md`, frontend/catalog/judge documentation and validation records during implementation. Existing management APIs, public group reference APIs and public course eligibility remain compatible.
- Live read-only discovery on October 19, 2026 found eight published groups, each with one current judgment. These are acceptance candidates, not hardcoded IDs or a permanent expected count.
