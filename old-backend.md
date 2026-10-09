# Lessons from the previous backend

Prepared October 9, 2026 for the backend restart. This document preserves useful knowledge from the first implementation; it is reference material, not a replacement specification or a requirement to reproduce its architecture.

The owner found that the milestone-based implementation did not fit Dorob's product and requested a new branch from the completed frontend. `backend-restart` starts at `22931f2`, before backend planning and implementation. The previous work remains in Git on `main` at checkpoint `a95f83f`. No history was rewritten and no database was rolled back. Provider adapters and the phase 2 frontend are already present on this branch.

## History and reference access

| Commit | Useful reference |
| --- | --- |
| `22931f2` | Completed phase 2 frontend and consolidated provider utilities; restart base. |
| `e22887a` | Backend product discussion, selected stack and proposed pipeline. |
| `7259729` | Backend/worker foundation, persistence, imports and factual publication. |
| `580cef2` | Bounded provider ingestion, retained revisions and recovery. |
| `a9294a4` | Jev placement, versioned inputs and hybrid candidate retrieval. |
| `8e61505` | Group proposals, retained definition edits, assessments and reviewed publication. |
| `a95f83f` | Public discovery/frontend integration, bounded refresh and final checkpoint documentation. |

Old backend paths below are Git references; they do not exist in the restart checkout. Inspect specific files without restoring the whole implementation:

```sh
git show a95f83f:docs/backend.md
git show a95f83f:docs/backend-operations.md
git show a95f83f:docs/placement.md
git show a95f83f:docs/group-discovery-assessment.md
git show a95f83f:docs/frontend-integration.md
git show a95f83f:docs/validation.md
```

## Useful product understanding

The prior discussion sharpened Dorob's promise: help people compare meaningful course alternatives and choose one that fits their learning needs. Comparison usefulness matters more than catalog size. Search and categories can lead to a comparison group, and a group page should also make sense to someone arriving directly from Google. Enrollment stays on the provider's site.

A shared topic does not establish comparability. Two Python courses may differ in prerequisites, outcomes, scope or level enough that they are poor alternatives. Topic was required in the prior group model; level was optional. Unknown level was kept distinct from explicitly multi-level coverage. Provider-stated level, AI classification and editorial membership were separate concepts.

The previous publication policy required at least two distinct, currently approved alternatives. Unmatched courses could remain internal. This is a useful policy to evaluate in the restart, rather than an assumption that collecting a course should automatically create a public listing.

There need not be a universal winner. Qualified differences in syllabus, practice, price and access can be useful without ranking. Missing evidence should remain visible and must not be interpreted as low quality. Accounts, payments, course hosting and personal learning agents were outside the initial scope.

## Decisions already discussed with the owner

The previous handoff records these selections: TypeScript/Bun in the existing workspace; a separate backend and worker, with separate Docker containers; PostgreSQL, Drizzle, pgvector and pg-boss; OpenRouter for model access; and Jev for classification and existing-group membership. Development was local first, with cloud hosting unresolved. These decisions deserve explicit consideration in the new specification; the branch's older Plan.md predates them.

The owner reported successful Persian testing of Jev. The implementation did not document a representative evaluation set or establish production thresholds. Jev's role was selecting/evaluating supplied options, while a generative model would author group definitions and explanations. No embedding or generative model was finally selected for production. Proposed model names in old documents should not be treated as current recommendations or defaults.

## Evidence and course data

The strongest reusable foundation is the existing version-2 provider contract and four standalone adapters in `apps/utils`: Maktabkhooneh, Roocket, TopLearn and Sabzlearn. Their mappings, tests and limitations are documented in [provider adapters](docs/provider-adapters.md) and [course data format](docs/course-data-format.md). Backend ingestion exercised Maktabkhooneh and Roocket with offline transports.

Useful data rules from the implementation:

- Preserve provider identity, canonical source URL, collection time, extraction coverage and original evidence alongside normalized facts.
- Keep provider facts, AI-derived output and editorial decisions separate.
- Distinguish free, paid, subscription and unknown offers. Missing price is not zero. Preserve source rial/toman units and avoid guessing unknown currency.
- Compare prices only when purchase type, currency and billing horizon are compatible. A one-time payment does not establish lifetime access or equal entitlements.
- Distinguish an explicitly empty syllabus/review list from partial extraction and unavailable information. Anonymous feedback samples are not all student reviews.
- Use stable source identities and idempotent imports. An unchanged successful observation can advance freshness without duplicating evidence; failed/older observations must not replace newer valid facts.
- Retain the exact source revisions used by a comparison so it can be explained and re-evaluated after source changes.

The old backend invalidated membership for every full-evidence revision. That conservative policy protected traceability but could demand review after noneducational changes, including expiring image URLs. The restart should distinguish changes that affect price, membership or educational analysis instead of copying this policy unquestioned.

## AI and retrieval lessons

The previous implementation separated candidate retrieval from membership decisions: retrieval suggested peers; focused Jev checks evaluated topic fit, prerequisites, intended outcomes and relevant level. No-fit, uncertainty and insufficient evidence were distinct outcomes. This is useful for avoiding the assumption that every uncertain course needs a new group.

It combined normalized PostgreSQL lexical search and exact vector similarity with reciprocal-rank fusion. Explicit Persian/Latin aliases helped terms such as Python and n8n. This was neither BM25 nor a validated semantic discovery system. Vector compatibility included model identity, dimensions and input-bundle version. Those details are worth retaining if retrieval becomes necessary.

Model results were bound to course revisions, group definitions, taxonomy, prompts, model identity and decision policy. Group proposals and editorial corrections retained history. Assessment outputs accounted for every candidate, including missing/failed results, instead of silently dropping unsuccessful courses.

Structured schemas, exact evidence references and excerpt checks reduced unsupported output. They did not prove that a claim followed from its evidence. Human semantic review remained necessary. Provider content was treated as untrusted evidence, including instruction-like text. Teaching quality, employment outcomes, reputation and an overall winner were not established by public syllabi. Ranking/badges stayed disabled, and feedback was excluded from the first generative evidence bundle.

Reference files: `packages/backend/src/model-clients.ts`, `placement-contracts.ts`, `placement.ts`, `retrieval.ts`, `group-ai-contracts.ts` and `group-ai.ts` at `a95f83f`.

## Reliability patterns worth reusing when needed

Visitor reads used stored results; ingestion and model work happened outside the request path. Backend and worker lifecycles were independent, and browser-safe contracts were separated from database, scraper and credential-bearing code.

Domain changes and queue insertion shared a database transaction. Durable outboxes covered downstream invalidation. Idempotency identities and immutable results made duplicate delivery safe. Generation/ownership checks fenced late results after cancellation, source changes or worker restart. These patterns address real failures and can be introduced as a small experiment gains background work.

Provider requests used shared PostgreSQL coordination across workers, bounded bodies/timeouts, preserved retry counters and provider-wide access-denial pauses. Session locks plus persisted host-loss reservations prevented overlap during slow calls and abrupt worker loss. Standalone scraper tools did not participate in this shared limiter, an important operational distinction.

Model work retained attempts and responses, explicit call/USD reservations, cancellation and bounded resume. Response reuse avoided some repeated calls after persistence failure. Unknown remote outcomes could still have been billed; reservations were admission controls, not hard provider billing caps or exactly-once guarantees.

Keep these guarantees proportional to the experiment. The previous database schema, CLI surface, queue ledger and review steps are examples to consult, not mandatory foundations for the first new comparison.

Reference files: `packages/backend/src/importer.ts`, `ingestion.ts`, `provider-transport.ts`, `queue.ts`, `refresh.ts`, plus `apps/worker/src/index.ts` and the SQL migrations at `a95f83f`.

## Frontend boundary and operating lessons

The last iteration used explicit fixture/backend modes and a server-only data service. Backend errors produced an unavailable state instead of silently showing samples. Runtime-validated public DTOs excluded raw evidence, internal model payloads and secrets. Current facts could remain usable while stale analysis was hidden.

Discovery applied publication eligibility before pagination and used a consistent database view for summaries and details. Search/filter state lived in URLs. Persian output used Jalali dates, Persian display digits, logical CSS and isolated Latin titles/source URLs. These are useful integration requirements; the restored phase 2 UI remains the starting experience.

Separate images, non-root execution, explicit migrations and a private authenticated queue dashboard were exercised locally. Docker dashboard/queue compatibility was version-specific. Production TLS, backups/restore, monitoring and least-privilege database access remained unfinished. Old dependency pins are historical compatibility evidence, not a reason to adopt those versions without checking them.

Reference files: `packages/core/src/discovery.ts`, `public-validation.ts`, `packages/backend/src/discovery.ts`, `queries.ts`, `apps/web/src/services/`, `apps/web/src/components/public-discovery.tsx` and `infra/` at `a95f83f`.

## What validation established

The old validation document records 70 PostgreSQL integration tests and separate API/two-worker container journeys, including migrations applied twice, rollback, concurrent submissions, retry/resume, worker loss, stale inputs and publication gates. These are historical recorded results.

The October 9 checkpoint freshly passed lint, type checking, 72 utility tests, 25 backend tests, four frontend tests, both Bun backend/worker builds and the integration UI RTL detector. Database/container checks could not be repeated because Docker was stopped; browser review was not repeated.

No live provider/Jev/embedding/generative integration or representative Persian educational-quality evaluation was established by the backend tests. Synthetic transports proved orchestration and contracts. Earlier standalone provider samples are evidence of collection work, not proof of production ingestion coverage.

The frontend production build compiled and type-checked but failed during Next page-data collection with Bun's `Expected CommonJS module to have a function wrapper`. This was an existing runtime blocker, not a validated production build. Offline tests and screenshots did not establish product acceptance, operational readiness or useful comparisons.

## How to use this in the restart

Use this document as context for small OpenSpec changes, alongside concrete course examples and owner review. Avoid converting the entire old pipeline into one new specification. Begin by identifying the useful comparison behavior, uncertainties and acceptance examples for one real group. Implement enough to inspect that result through the frontend, evaluate it, then revise the specification from what was learned.

Retain reusable adapters and evidence conventions. Retrieve individual old implementation files only when a validated requirement needs them. Revisit taxonomy, model selection, review policy, revision invalidation and discovery behavior explicitly. A successful restart should first demonstrate educational usefulness; more infrastructure and a larger test count are not substitutes for that evidence.

OpenSpec has not been installed or initialized by this branch preparation. The new backend implementation has not started.
