# Design

## Context

See proposal.md for motivation. `apps/api` runs Elysia with a native Bun SQL pool and injectable health dependency; it has no catalog schema or migration mechanism. Existing tests exercise app handlers offline and PostgreSQL/process behavior with `API_INTEGRATION=1`. Root Bun workspaces already include `packages/*`.

The frontend's six categories live in `discovery-showcase.tsx`, with icons, descriptions, and SVG artwork keys. `homepage-data.ts` defines three editorial groups by explicit snapshot course IDs. The Python route has a separate broader prototype. Neither source is a database catalog. Standalone adapters use provider identity `${providerId}:${providerCourseId}`; frontend snapshots use older IDs and must not be silently imported or conflated.

The existing durable specs cover service bootstrap and connectivity only. Plan.md's AI grouping roadmap is historical and must be reconciled during implementation rather than restored as a requirement.

## Goals / Non-Goals

**Goals:** Establish a small durable curation boundary, let the owner inspect the whole workflow in Swagger, and make shared category identity usable by both apps.

**Non-Goals:** Full provider-course storage, collecting or importing live data, assessment/ranking, backend image serving, automatic group generation, and connecting existing frontend group pages to the API. No category hierarchy, taxonomy editor, revision pipeline, or event history is introduced.

## Decisions

### 1. Fixed registry and frontend presentation

Create `packages/core` with a dependency-free ordered category registry and derived `CategoryId` literal union. Preserve `code`, `design`, `data`, `business`, `language`, and `tools`. Keep icons, descriptions, and SVG selection in a frontend mapping typed against those IDs; extract only identity and labels from the showcase. Add `GET /api/v1/categories` returning `{ items: [{ id, label }] }` from code.

A categories table would require seed and edit semantics for a deliberately fixed list. A TypeScript enum adds little value compared with a registry that also supplies labels. PostgreSQL stores text with a CHECK constraint for the same IDs; prefer a CHECK over a PostgreSQL enum to keep future vocabulary migrations explicit and simple. Test registry/constraint parity. Changing labels does not migrate stored data; removing an ID requires explicit reassignment in a later migration.

### 2. Three small product tables

- `course_groups`: UUID primary key; unique slug; title; description; category ID; nullable target level; publication boolean default false; created/updated timestamps.
- `courses`: stable text primary key `${providerId}:${providerCourseId}`; provider ID; provider-course ID; title; source URL; created/updated timestamps; unique provider/course pair.
- `course_group_courses`: group and course foreign keys with a composite primary key and assignment timestamp. Index course ID for reverse lookup. Do not expose course/group deletion in this change; foreign keys restrict parent deletion.

Provider IDs use lowercase ASCII identifier syntax. Provider-course IDs are nonblank opaque identifiers, permitting provider slugs or numeric identifiers. Titles/descriptions allow Persian text and mixed Latin identifiers; trim surrounding whitespace, reject blank values, and do not infer language or level from text. Group target levels are `beginner`, `intermediate`, `advanced`, `mixed`, or null. Null means no specified target, distinct from mixed coverage. Slugs match `[a-z0-9]+(?:-[a-z0-9]+)*`; titles max 300 characters, descriptions max 2000, provider IDs max 64, provider-course IDs max 200, slugs max 100, and URLs max 2048. Source URLs must parse as HTTP(S); registration never fetches them.

These are course references rather than the version-2 full source contract. Price, syllabus, ratings, provider level, and source category facts are not fabricated or stored here. Later ingestion can extend course storage while preserving identity and memberships. A separate provider registry can follow when attribution metadata is modeled.

### 3. Editorial management through Swagger

Use `/api/v1/manage` for owner operations and separate public read routes:

| Method and path | Behavior |
| --- | --- |
| `GET /api/v1/categories` | Fixed categories; no DB dependency |
| `PUT /api/v1/manage/courses` | Register/upsert by provider identity; 201 on creation, 200 on update |
| `GET /api/v1/manage/courses` | Paginated course references |
| `POST /api/v1/manage/groups` | Create draft or explicitly published group; 201 |
| `GET /api/v1/manage/groups` | Paginated groups including drafts |
| `GET /api/v1/manage/groups/:id` | Group with paginated members |
| `PATCH /api/v1/manage/groups/:id` | Edit supplied fields; 200; ID immutable |
| `PUT /api/v1/manage/groups/:id/courses/:courseId` | Idempotent link; 204 |
| `DELETE /api/v1/manage/groups/:id/courses/:courseId` | Idempotent unlink; 204; missing parent record is 404 |
| `GET /api/v1/groups` | Paginated eligible public groups; optional category filter |
| `GET /api/v1/groups/:slug` | Eligible group with paginated minimal members |

Lists use `limit` (default 20, max 100) and `offset` (default 0). Return `{ items, total, limit, offset }`. Detail responses contain group fields, `courseCount`, and a `courses` object using the same list envelope. Stable order is group slug/ID or course ID; do not imply popularity or ranking. PATCH accepts at least one editable field and rejects unknown fields. API schemas specify all success/error responses in Swagger. Public course references expose identity, provider identity, title, and source URL, with documentation clarifying their limited scope.

Use an injectable catalog repository alongside the existing health dependency. Reuse the existing SQL pool and bounded shutdown; do not open a second pool per route. Parameterize queries and translate validation, uniqueness, missing-reference, and availability errors into safe structured responses. Failed writes must not partially mutate records. Concurrent course upserts and membership additions use database uniqueness constraints, not read-then-insert assumptions.

The accepted foundation binds to loopback by default. This remains a local owner tool with no authentication; documentation must state that management endpoints are not suitable for exposure on an untrusted network. Adding authentication or changing deployment topology requires a separate change, not an unsolicited account system here.

### 4. Membership and public eligibility

Use many-to-many links rather than a single group column on courses: related offerings can serve more than one comparison destination without duplication. Keep category on the group; do not infer a canonical course category from multiple memberships.

Compute member counts and public eligibility from stored links (`isPublished` and count at least two). A publication flag is editorial intent, while eligibility is current visibility. This avoids toggling the flag on removal and avoids stale denormalized counts. Read eligibility, group data, and members in one consistent query or transaction snapshot. Both public list and detail apply the same predicate.

Groups are intended as reasonably narrow comparison sets with a plain-language scope description; there is no automatic educational-fit validation. Manual assignment is the decision. Renaming a slug changes the API lookup; redirect history is deferred with frontend integration.

### 5. Explicit migrations; no automatic catalog seeds

Add ordered SQL migrations and a small native Bun SQL runner using the API environment. Run from `apps/api` via a root `db:migrate` script. Track applied versions/checksums in a migrations ledger, use a PostgreSQL advisory lock to serialize runners, and apply each migration and its ledger entry in a transaction. Reruns skip applied migrations; changed applied checksums fail clearly. Startup never migrates or seeds, preserving greeting/docs availability before catalog setup.

Do not automatically copy frontend mock definitions or their memberships. The owner creates predefined groups once through Swagger and registers chosen course references. Document a reproducible two-course local walkthrough using clearly labeled test records; tests use isolated IDs and clean up their own records. Category data requires no seeding.

## Risks / Trade-offs

- Minimal references cannot power full course cards or factual comparisons -> Label scope in API docs and keep frontend integration out of this change.
- Manual membership can include poor alternatives -> Write clear group scope descriptions and let the owner revise assignments; do not claim automatic equivalence checks.
- Shared category extraction touches existing frontend imports -> Preserve IDs, artwork, labels, and filtering; review category cards at mobile/desktop widths and keyboard focus.
- Unauthenticated local management can be exposed by listener configuration -> Keep loopback setup explicit and document deployment/access control as unfinished work.
- SQL category CHECK can drift from code -> Test all registry values and rejection of unsupported SQL writes against PostgreSQL.
- Publication after member removal may surprise an editor -> Management returns actual count and flag; document derived visibility and verify the two-to-one-to-two transition.
- The small course table creates a partial catalog contract -> Keep registration separate from ingestion; do not consume server-only scraper types in shared browser code.

## Migration Plan

1. Add shared contracts and frontend presentation mapping while retaining existing snapshot behavior.
2. Add and run the initial schema migration against the persistent local PostgreSQL instance. No product tables currently require transformation.
3. Add repository/routes and Swagger schemas, then exercise registration, group creation, assignment, publication, editing, and removal.
4. Verify migration reruns and service restarts preserve records. Run existing service tests and catalog-specific offline/database tests; record unavailable checks.
5. Update README.md, Plan.md, and affected documentation to reflect fixed categories and manual grouping while retaining independent AI-comparison decisions and known frontend limitations.

Rollback disables catalog routes or reverts application wiring while retaining tables and data. Do not automatically drop tables, reset the Compose volume, or delete owner-curated records. A destructive rollback needs separate authorization.
