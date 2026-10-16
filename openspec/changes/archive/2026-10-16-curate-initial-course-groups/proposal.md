# Proposal

## Why

Dorob can ingest courses from four providers and persist editorial groups, but its real catalog still needs useful comparison sets before group frontend integration. Researching the existing courses and explicitly curating initial groups will establish concrete content and boundaries for the MVP and later automatic assignment.

## What Changes

- Before any curation writes, create and verify a full backup of the target PostgreSQL database, retaining it outside Git with documented steps to restore the pre-work state if requested.
- Run a one-time development-agent editorial research pass over the existing backend catalog, considering all six fixed categories and following pagination rather than inspecting only the first page.
- Identify focused topic/level groups from retained course evidence, consulting public source pages when needed to resolve fit; document gaps instead of inventing category coverage.
- Record proposed Persian titles, stable slugs, category IDs, descriptions, target levels, explicit course IDs, membership reasons, and supporting observation/source references in a reviewable curation report.
- Create supported groups as drafts and add individually selected existing courses through the current local management API. Read back persisted IDs, fields, and all memberships, and record partial work for safe continuation.
- Keep publication subject to owner review; preserve existing groups, provider facts, ingestion history, and unrelated memberships.
- Clarify that an external development agent may assist editorial research without introducing backend AI calls or automatic placement.
- Exclude automatic assignment/matching logic, runtime agents, AI rankings/comparisons, new collection runs, frontend integration, schema/API changes, and deployment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `course-group-curation`: Extend the local editorial workflow with a verified pre-work database backup, evidence-based agent assistance, six-category coverage reporting, draft application through existing APIs, and verifiable resumable manual assignments.

## Impact

- Uses existing category, management course/current-observation, group, and membership endpoints in `apps/api`; no new endpoints, migrations, packages, or application code are expected.
- During apply, adds real draft group records and explicit links to the selected local backend. Planning does not mutate that backend.
- Adds `docs/curation/initial-course-groups.md` during apply for evidence, scope decisions, category gaps, and a persistence ledger; updates relevant catalog/project documentation to describe the workflow and its limitations.
- Existing public group eligibility and course-category filtering remain unchanged. New drafts do not participate in public category results until publication is explicitly approved.
- Actual catalog size, category distribution, and selected group names will be determined from the reachable backend during apply; saved frontend samples and earlier sampling totals are not treated as the current catalog.
