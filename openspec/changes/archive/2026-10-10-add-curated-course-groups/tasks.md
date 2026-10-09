# Tasks

## 1. Shared category contracts

- [x] 1.1 Add a browser-safe `packages/core` workspace exporting the ordered six-category registry, derived CategoryId, target-level vocabulary, and minimal public catalog types; verify imports and type checking from both API and web without server or rendering dependencies.
- [x] 1.2 Extract frontend category identity/labels into the shared registry while retaining ID-keyed icons, descriptions, and SVG artwork; verify homepage category filtering, Persian labels, keyboard focus, mixed Latin/Persian text, and category cards at mobile/desktop widths, recording results in docs/validation.md.
- [x] 1.3 Add database-independent GET /api/v1/categories with Swagger schemas; verify exact ID/label order and HTTP 200 during a simulated database outage through offline API tests.
- [x] 1.4 Document fixed category ownership and artwork lookup in docs/frontend.md and update Plan.md's category/manual-grouping direction; verify documentation identifies code changes as the way to alter categories and does not imply frontend API integration.

## 2. Schema and persistence

- [x] 2.1 Add explicit ordered SQL migrations and a native Bun SQL runner with a transactional migration ledger, checksum validation, and serialized runners; add root db:migrate and verify initial execution, rerun, and failed-migration rollback against PostgreSQL.
- [x] 2.2 Create course_groups, minimal courses, and course_group_courses with unique identities/slugs, category and level checks, foreign keys, and membership uniqueness; verify SQL accepts all six category IDs and rejects invalid categories, duplicate slugs, duplicate provider identities, and dangling memberships.
- [x] 2.3 Add an injectable catalog repository reusing the existing SQL pool and shutdown ownership; verify PostgreSQL tests cover group edits, course upserts preserving identity/membership, multi-group membership, repeated link/unlink operations, concurrent duplicate assignment, and correct counts.
- [x] 2.4 Document migration setup, retained-data rollback, minimal course-reference limitations, and canonical identity versus frontend snapshot IDs in README.md and the documentation hub; verify the documented migration command runs from the repository root without automatic seeding or API-startup migration.

## 3. Local management operations

- [x] 3.1 Add course-reference registration/list routes with bounded inputs and pagination; verify offline handler tests cover 201/200 upsert semantics, invalid source URLs and blank values, stable ordering, and page limits, with real-database tests confirming identity preservation.
- [x] 3.2 Add group create/list/detail/PATCH routes with draft defaults and nullable target levels; verify creation, editing, unique-slug conflicts, missing groups, empty/unknown PATCH fields, category validation, and paginated member responses through API tests.
- [x] 3.3 Add idempotent membership PUT/DELETE routes and safe error translation; verify repeated operations, encoded provider-course IDs, nonexistent parents, rollback on failed writes, 404/409/422/503 responses, and exclusion of internal SQL/credentials in handler and PostgreSQL tests.
- [x] 3.4 Add management Swagger request/response schemas and a local two-course curation walkthrough with clearly labeled test data in README.md or linked catalog documentation; verify every management operation is described in /docs/json and can be exercised through the loopback service, with local-only administration and absent authentication stated accurately.

## 4. Public group discovery

- [x] 4.1 Add bounded public group listing with an optional validated category filter and slug-based details; verify drafts and groups with fewer than two courses are hidden, missing/ineligible detail returns 404, and response members are explicitly minimal references.
- [x] 4.2 Implement consistent count/eligibility/member reads; verify a published group's two-to-one-to-two membership transition updates public visibility without changing the publication flag, including paginated reads with stable order and total counts.
- [x] 4.3 Document public eligibility and membership semantics in catalog documentation and reconcile affected README.md/Plan.md statements about grouping; verify documentation distinguishes editorial grouping from identical content, ranking, provider level, and any independently deferred AI comparison work.

## 5. Integration validation

- [x] 5.1 Exercise the complete Swagger workflow against real PostgreSQL, rerun migrations, and normally restart API/database; verify group IDs, course identities, assignments, and publication visibility persist, using isolated test records and cleaning up only those records.
- [x] 5.2 Run bun run lint, bun run typecheck, bun run test:api, API_INTEGRATION=1 bun run test:api, bun run build:api, and bun run build; verify existing service/connectivity contracts remain intact and record any unavailable checks or known frontend build blocker in docs/validation.md.
- [x] 5.3 Review implementation scope and documentation together; verify the lockfile is preserved appropriately, frontend snapshot/group routes remain independent, no AI/ingestion/admin interface is introduced, and no generated outputs or local credentials are included.
