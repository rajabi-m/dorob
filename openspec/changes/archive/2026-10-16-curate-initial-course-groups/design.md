# Design

## Context

See `proposal.md` for motivation. `apps/api/src/catalog-routes.ts` already exposes paginated management references, draft group creation/editing, and idempotent membership PUT/DELETE operations. `ingestion-routes.ts` provides each reference's current accepted observation, readiness, and immutable snapshot reads. Public groups currently expose minimal references and use published status plus two stored memberships for eligibility; readiness is a separate course contract.

The category registry contains `code`, `design`, `data`, `business`, `language`, and `tools`. Group descriptions support 2,000 characters and nullable levels; there are no structured inclusion rules or evidence columns. Existing catalog tests cover drafts, repeated memberships, publication visibility, conflicts, persistence, and safe failures. This is editorial data work, not a missing CRUD implementation.

Design is included because one-time research, persisted mutations, evidence ownership, and interrupted-write recovery need explicit decisions. No current database inventory was taken during planning; reachable catalog contents are execution inputs rather than inferred from historic samples.

## Goals / Non-Goals

**Goals:** Use existing interfaces to produce defensible real draft groups, with a durable review record connecting editorial decisions to exact existing courses and verified persisted results.

**Non-Goals:** No reusable matching engine, bulk importer, runtime agent, backend AI dependency, schema migration, automatic collection, publication, or frontend change. The complete exclusions are in the proposal.

## Decisions

### 0. Back up and verify the target database before writes

Create a timestamped full PostgreSQL custom-format dump before any curation mutation. Use PostgreSQL 17 tools matching the existing Compose service; for the default local database, `docker compose exec -T postgres pg_dump -U dorob -d dorob -Fc` can stream the dump to a new file under the already-ignored `apps/api/storage/backups/`. Confirm the service/database actually matches the selected API target rather than assuming the default. Do not overwrite an earlier backup or expose credentials in commands/output.

Check successful dump exit, a nonempty archive, a readable `pg_restore --list`, and a SHA-256 checksum. Prove restoration with `pg_restore --exit-on-error --no-owner --no-privileges` into a newly created isolated temporary database, comparing the restored schema, migration ledger, record counts, group definitions and exact memberships with the backed-up state. Document validation and remove only that temporary verification database. If temporary database creation or restore validation is unavailable, report the blocker and do not begin curation writes.

Keep other database writers quiescent during the backup and baseline check so the saved state and verification inventory agree. Record the target identity, backup path, timestamp, checksum, tool version, and explicit restore procedure in the curation report. Stop writers before an owner-requested recovery; restore the full dump into a replacement database and verify it before reconnecting the API. Explain that this restores all database records to the backup point and discards subsequent database changes. The database dump does not include hosted image files; this change must leave image storage untouched.

Alternative: rely only on the membership ledger for undo. Insufficient for the owner's requested return to the full pre-work database state, especially because the API has no group-deletion endpoint.

### 1. Use a one-time development agent as an editorial assistant

Research is performed in the development session during apply. The assistant reads retained observations, researches public provider pages when necessary, chooses groups and explicit members, and performs individual API operations. It does not add agent code to the repository or place future courses automatically. A separate delegated researcher is permitted by the owner's requested agent workflow, but is optional; one coordinating writer handles mutations and the report to avoid competing writes.

Alternative: a reusable agent service or matching script. Rejected because it would expand this change into the deferred automatic-assignment work.

### 2. Inventory existing records independently of public filters

Read `/api/v1/categories`, every page of `/api/v1/manage/courses`, and current observation details at `/api/v1/manage/courses/:courseId`. Inventory existing groups and their complete memberships as well. Record the backend origin without credentials, research time, provider totals, observation availability/readiness, and failed reads. Use canonical IDs, with full URL encoding in paths. Stable ordering supports pagination; check totals/identities for concurrent catalog changes and repeat affected reads instead of declaring incomplete coverage complete.

Public course category filters depend on already-published groups and therefore cannot discover initial category membership. Public lists also omit unready courses. Do not use either as the sole inventory. References without accepted observations are documented as gaps and not selected for the initial sets. Prefer presentation-ready members; otherwise record readiness limitations explicitly without changing existing eligibility semantics or silently processing images.

Alternative: inspect snapshot fixtures or run fresh collection. Rejected because the requested scope is the existing backend courses.

### 3. Define groups around comparable learning intent

Review substantive description, ordered syllabus, prerequisites when present in retained source facts, provider level, and delivery/access distinctions. Use titles as discovery hints rather than sufficient membership evidence. Favor focused scopes and cross-provider options; keep justified single-provider groups possible. Each selected group needs two distinct supported existing members. Evaluate every fixed category, but do not impose a fixed number of groups or create placeholders when evidence is weak.

Represent the group's learning scope and key exclusions in its Persian description within the existing limit. Put detailed inclusion/exclusion reasoning and uncertain candidates in the report. Use null for unspecified target level and `mixed` only for intentionally mixed coverage; editorial target level must not overwrite provider-stated facts. Price, popularity, duration, and shared keywords do not by themselves establish fit or quality.

Alternative: topic keyword rules or one broad group per category. Rejected because this would hide material learning differences and approximate the future matching engine prematurely.

### 4. Keep evidence and application state in a reviewable report

Create `docs/curation/initial-course-groups.md` during apply. Include:

- Dated inventory scope, provider totals, all six category outcomes, and limitations.
- Each group: Persian title, slug, category, target level, description, inclusion/exclusion scope, and canonical member list.
- Each member: retained snapshot ID, collection date, source URL, concise evidence-based fit reason, and readiness at review time.
- Any supplemental public-page findings with research date and URL, clearly separated from retained observations.
- Exclusions/unresolved candidates and their reasons, especially sparse or conflicting evidence.
- A persistence ledger: backend group ID, proposed versus persisted state, confirmed memberships, uncertain responses, and pending operations.
- Owner-review status and later publication/frontend/automatic-assignment handoff.

Store concise evidence summaries rather than raw HTML, personal feedback identities, credentials, or full management payloads. No new backend fields are needed. Documented inclusion boundaries can inform later automation but are not executable rules or model-training claims.

Alternative: store evidence in new database fields. Deferred until a future feature needs a runtime evidence contract.

### 5. Apply drafts conservatively and verify every result

Prepare the definitions and ledger and complete verified database backup before mutation. Create each new group with `isPublished: false`; attach only its explicitly selected existing course IDs through membership PUT. Do not re-register courses or patch provider facts. Do not publish as part of this change.

Before each create, reconcile the slug against existing management groups and the ledger. Reuse an ID only when the record is demonstrably this change's previously created draft with matching definition; leave other records untouched and choose a reviewed distinct slug or report the conflict. After an uncertain POST response, inspect the backend before retrying. Repeated membership PUTs are safe; group POSTs are not idempotent.

Read back fields and all membership pages, checking exact member IDs, distinct count, and draft status. Record verified state after each group. On failure, stop mutation, retain completed work and pending operations, and resume only after reconciliation. Avoid new generic retry/import tooling for this one-time operation.

## Risks / Trade-offs

- [Sparse category coverage] -> Report honest gaps; collecting missing courses is a separate change.
- [Research bias or ambiguous scope] -> Cite substantive evidence, document exclusions, and keep drafts for owner review.
- [Provider pages differ from observations] -> Record supplemental research separately; never rewrite retained facts during curation.
- [Backend downtime or uncertain writes] -> Maintain the ledger and reconcile before continuation; never reset the database to recover.
- [Concurrent edits or ingestion] -> Recheck referenced records and definitions before writes; stop on unrelated changes rather than overwriting them.
- [Draft groups do not populate public category filters] -> State this explicitly in the handoff; publication remains a separate instruction.
- [Publication later exposes groups with unready members] -> Record readiness and recommend ready members; a website-facing eligibility contract belongs to later frontend integration.
- [Unauthenticated management] -> Use the existing local loopback service and keep deployment/authentication outside this change.

## Migration Plan

No schema migration or application deployment is required. Apply adds only researched draft definitions and explicit memberships through current APIs, then updates the curation report and relevant documentation. Verify persistence through a normal API restart where available without resetting database volumes.

Ordinary interruption recovery preserves all successful work and resumes pending operations from verified state. If the owner requests return to the full pre-work database state, use the verified backup and recorded restore procedure with writers stopped. Restoration is not automatic error handling and must not happen without that request. No deletion endpoint or ad hoc destructive SQL is needed; retain the backup until the owner requests its removal.
