# Proposal

## Why

Dorob already has backend and frontend support for reviewing course-to-group assignment suggestions. The owner wants to feed that workflow from a CLI embedding worker and add the missing backend for discovering potential new groups. The completed lab remains available independently; this change integrates its selected approach without building another frontend.

## What Changes

- Add one explicitly invoked CLI worker that communicates with backend HTTP APIs, prints stage/count progress, performs the selected operation and exits. Support generation-only, matching-only, discovery-only and combined matching/discovery, whole-catalog or selected scope, status, cancellation, explicit retry/resume and fresh-input runs. No daemon, scheduled work or automatic ingestion/edit/startup triggers.
- Store embeddings in PostgreSQL using pgvector. Keep immutable embedding revisions linked to existing courses/groups, model name and exact digest, dimensions, educational input hash and processing version. Reuse compatible vectors by default; explicit forced regeneration creates another revision without replacing history. Compare only compatible representations.
- Use local BGE-M3 and exact bounded algorithms. Initial matching minimum is .60; discovery uses .60 neighbors, .70 pairwise coherence, k=12, minimum size 2, suppression only above Jaccard .80 and at most five reconciliation groups. These are provisional experimental settings.
- Reuse the existing percentage suggestion API, inbox and pair review ledger. Matching submissions use cosine × 100 in the existing confidencePercent compatibility field; exact cosine, model/input/run provenance and score meaning are retained separately in backend evidence. Existing UI wording is a documented limitation, not a calibrated confidence claim.
- Add backend storage/APIs for discovered overlapping sets, evidence, pagination, approve/dismiss review and explicit draft creation. Creating a draft also submits every discovered course to its existing assignment inbox using a documented discovery-based percentage, without scoring against the new group definition. No course becomes a member automatically; publication remains separate.
- Preserve the lab, its commands/evidence and existing catalog facts/decisions. No new frontend pages, handlers, components or showcase work is included. Generative judging/naming, remote inference, automatic placement/publication, authentication/deployment and public fixture integration remain deferred.

## Capabilities

### New Capabilities

- `catalog-embedding-worker`: CLI execution through backend HTTP APIs, independent generation, versioned pgvector persistence, compatible reuse, bounded matching/discovery and explicit recovery.
- `course-group-discovery`: Durable overlapping candidates, evidence, backend review and idempotent draft creation with discovery-derived assignment suggestions.

### Modified Capabilities

- `course-group-suggestions`: Reuse percentage submissions and pair decisions with linked immutable matching/discovery score evidence and currentness checks for embedding-origin approvals.
- `course-group-administration`: Preserve existing frontend contracts and document how worker submissions are reviewed using the unchanged inbox.
- `course-group-curation`: Permit explicitly requested local inference and reviewed discovery-to-draft creation while preserving editorial assignment/publication.

## Impact

Implementation affects backend routes/repositories/additive migrations, a server-only embedding engine and CLI entry point, browser-safe additive contracts, root commands, PostgreSQL extension/image setup and documentation. The worker has no database credentials or direct SQL access; the backend owns persistence. Preserve PostgreSQL 17 and existing data, use a tested pinned pgvector-capable image/build, and verify backup restoration before owner-database changes. This revision changes planning artifacts only; no implementation, migration, inference, commit or publication occurs.
