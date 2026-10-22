# Proposal

## Why

TopLearn, Sabzlearn and Roocket still return v2 exports and cannot use the existing resumable ingestion pipeline directly. Migrate them to rich, traceable v3 observations so their courses reach the existing homepage catalog, with work divided among one foundation/coordinating agent and three provider agents.

## What Changes

- Agent #1 implements and verifies the shared foundation, freezes its interfaces, then summons agent #2 for TopLearn, agent #3 for Sabzlearn and agent #4 for Roocket. Agent #1 integrates and validates their results; provider agents own separate files and tests.
- Add native v3 collectors and `ingest:toplearn`, `ingest:sabzlearn`, and `ingest:roocket`, using the existing worker, ingestion API and thumbnail lifecycle.
- Audit and maximize publicly supported extraction: comments/reviews, individual and aggregate ratings, rating-vote counts, all published instructors, ordered course contents, educational information, prices, access terms, enrollment and provider state. Preserve evidence and explicit unknown/partial/failed coverage.
- Support controlled supplementary requests and bounded feedback pagination, with persisted collection settings and provider-correct recovery commands.
- **BREAKING:** Retire the three providers' v2 entry points/outputs and legacy checkpoint support; introduce no compatibility adapters for them. Retire the standalone data dashboard and aggregation tool, their commands and obsolete documentation. Owner-approved exception (October 12): retain the pure `aggregateCourses` helper required by the protected Maktabkhooneh test; remove its executable CLI.
- Require each provider agent to demonstrate actual ingestion, hosted-image readiness, public API visibility and browser rendering in the existing homepage courses section. Frontend changes are limited to authentic missing provider logos/mappings and the owner-requested display rounding of course minutes in cards/details (October 12).
- Leave Maktabkhooneh source, entry points, existing behavior and checkpoints untouched. Retain shared legacy code it still uses. Broader v2 cleanup is deferred and has no tasks in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-course-collection`: Native v3 collection and rich extraction for the three providers; bounded supplementary requests/feedback; narrow retirement of their legacy workflows and the dashboard, retaining Maktabkhooneh isolation.
- `scraper-worker`: Shared ingestion invocation for the three providers, collection-setting resume validation, correct recovery commands, and required end-to-end catalog acceptance.

## Impact

Server-only utilities, additive shared collection helpers/types, worker configuration/reporting, provider-specific tests/fixtures, root and utility command registration, and affected docs. The existing v3 ingestion wire contract and public website contract remain unchanged. Frontend edits comprise optional logo assets/mappings and owner-requested nearest-whole-minute duration presentation; stored source precision and public contracts remain unchanged. Existing source fields not representable in v3 may use sanitized namespaced `providerData`; no new dependencies are assumed. No automatic scraping, AI, editorial group assignment, database redesign, Maktabkhooneh migration, or broad cleanup is included.
