# Backend foundation: setup and operations

October 4, 2026. The backend lives in `apps/backend`, with the independently running Bun worker in `apps/worker`. This owner-requested boundary supersedes the earlier Next.js-only backend proposal. Both deploy as separate images from `infra/Dockerfile`; neither starts the other. They coordinate only through PostgreSQL and pg-boss, so they can run on different cloud hosts. The Next.js frontend now has explicit backend/fixture modes; see [integration and selected refresh](frontend-integration.md).

Milestones 1–3 are locally validated; milestone 4 discovery/assessment/publication is complete and locally validated with offline transports. Milestone 5 integration/manual refresh passes automated offline acceptance; complete mobile/focus browser acceptance remains pending.

Implemented scope: validated saved version-2 imports, immutable evidence revisions, successful/failed observations, manually approved group membership, durable deterministic factual snapshots, operator publication, read-only HTTP queries, and private draft inspection. Bounded manual Maktabkhooneh/Roocket ingestion is available. Versioned Jev placement, embeddings and hybrid retrieval are implemented for bounded manual operations. Live model calls default to disabled; schedules and ranking remain disabled; frontend integration is available.

Pinned foundation dependencies: Bun 1.3.8, Drizzle ORM 0.45.3, Drizzle Kit 0.31.11, postgres.js 3.4.9, Zod 4.6.5, pg-boss 12.35.0, and `pgvector/pgvector:0.8.1-pg17`. The Bun lockfile records transitive versions. The dashboard uses its separate documented Node runtime.

## Local setup

Use Bun 1.3.8 and Docker Desktop/Engine with Compose. From the repository root:

```sh
bun install --frozen-lockfile
cp .env.example .env
# Edit .env: choose a long POSTGRES_PASSWORD and matching DATABASE_URL.
# Percent-encode reserved password characters in DATABASE_URL.
bun run db:up
bun run db:migrate
bun run queue:setup
bun run dev:backend
# Separate terminal:
bun run worker
```

Bun loads the ignored root `.env` when invoked from the repository root. No API/model credentials are needed for offline operations. Generate an optional `BACKEND_OPERATOR_TOKEN` with `openssl rand -hex 32`; absent a token, internal HTTP access is always denied. Do not use `NEXT_PUBLIC_` for secrets. Blank embedding/budget placeholders are accepted; schedules are rejected; live-model enablement requires explicit credentials, configured identities and finite budgets. Provider concurrency is fixed at one shared in-flight request, with `PROVIDER_REQUEST_SPACING_MS` defaulting to 1500 (minimum 1500). Jev and embeddings share one PostgreSQL admission slot (`JEV_CONCURRENCY=1`); current `WORKER_CONCURRENCY` controls each deterministic queue's local worker count.

An existing PostgreSQL 17 database is also supported: set `DATABASE_URL`, install/enable pgvector with a migration-capable role, and skip `db:up`. The application tables use the `public` schema and pg-boss defaults to `pgboss`. Run application migrations before queue initialization. Neither API nor worker startup migrates. Migration commands take a database advisory lock; pg-boss owns its schema. `db:generate` runs Drizzle Kit under Bun and creates reviewable SQL; keep custom migration `0001_evidence_constraints.sql` (ownership constraints, pgvector, immutability triggers) alongside generated migrations.

## Import and build a factual group

Use previously saved provider exports; no remote calls occur. Version-1 exports and frontend snapshot JSON are not accepted. The file must have `schemaVersion: 2`, `providerId`, and `courses`; existing adapter export metadata is allowed. Errors with a known canonical source URL create failed observations without changing successful facts. Unidentified failed URLs are reported by count but cannot be associated with a fabricated course identity. Imports validate the entire file before writing and are transactional, with a limit of 10,000 course records per file.

```sh
bun run backend:cli import apps/utils/output/dashboard-maktabkhooneh.json
bun run backend:cli import apps/utils/output/dashboard-roocket.json
bun run backend:cli --help
```

Create a local group definition JSON with the actual imported course IDs:

```json
{
  "definition": {
    "slug": "python-manual",
    "title": "مقایسه دوره‌های پایتون",
    "topic": "Python",
    "targetLevel": null,
    "criteria": "توضیح معیار مقایسه پس از بررسی سرفصل‌ها، پیش‌نیازها و اهداف دوره‌ها"
  },
  "courseIds": ["provider:course-1", "other-provider:course-2"]
}
```

`targetLevel: null` means unknown/not specified; `multi-level` is an explicit separate value. The operator must review comparability before submitting a definition. At least two distinct source identities are required; numerical minimum alone does not prove suitability.

```sh
bun run backend:cli group /absolute/path/group.json
# The worker builds and finalizes the draft. This does not publish automatically.
bun run backend:cli inspect python-manual
# Review the factual snapshot, then explicitly publish it:
bun run backend:cli publish python-manual
curl http://127.0.0.1:4000/v1/groups/python-manual
```

Submitting the identical group again coalesces the same revision-bound workflow. Resubmitting the definition with the same member set after importing newer evidence explicitly reapproves those source revisions and creates a new workflow. The legacy manual `group` command rejects conflicting definitions/member sets. Milestone 4 discovered groups support retained corrections and explicit membership reapproval through `definition-edit`/`definition-review`; see [assessment operations](group-discovery-assessment.md). Retries are capped at two with backoff. Use the protected queue dashboard to inspect/retry a failed or exhausted job; recreating an identical group does not silently reset its workflow. No HTTP write endpoints are exposed.

## Bounded manual ingestion

Run migrations and `queue:setup` after upgrading, then start the independent worker. Only `maktabkhooneh` and `roocket` are accepted. There is no collection default, schedule, `--all`, or HTTP write/visitor scraping route. Create a local request file with either explicit canonical HTTPS course URLs or a required maximum:

```json
{"providerId":"roocket","urls":["https://roocket.ir/series/learn-python/"]}
```

```json
{"providerId":"maktabkhooneh","maxCourses":2}
```

```sh
bun run backend:cli collect /absolute/path/collection.json
# The command prints the durable collection UUID. Use it below:
bun run backend:cli collection COLLECTION_UUID
bun run backend:cli resume COLLECTION_UUID
```

Explicit URLs require canonical trailing slashes and matching provider course paths, without query strings/credentials. Duplicates in one request coalesce. `maxCourses` and explicit URL lists are limited to 100; supplying both rejects a URL list exceeding the maximum. Sitemap discovery traverses the adapter's allowed public course maps, records the resulting URL list, then selects its first N URLs in source order. It does not fetch every discovered detail page. Discovery is bounded to 120 transport requests and 100,000 retained URLs; interrupted discovery restarts its traversal within the same three-attempt budget. Completed discovery and selection are immutable. Each selected URL keeps its own outcome, accepted revision, attempt count and safe failure summary. The collection inspection includes all pending/blocked URLs and discovery attempts, including partial or interrupted work.

A job performs one discovery or selected-course step. Attempt insertion and budget consumption are one transaction, so a crash cannot retain only half of the claim. Success commits the validated import, selected outcome, attempt completion, generation advance and pg-boss continuation together. Duplicate/obsolete job generations do nothing. Separate session advisory locks serialize collection steps; PostgreSQL owns the lock, not a JavaScript mutex. An explicit resume advances the generation to fence an already running execution. Graceful shutdown cancels active provider work and saves interruption; abruptly killed workers leave running attempts which redelivery/resume marks interrupted. Accepted URLs are never recollected during resume.

Every URL and discovery has at most three total attempts, including crashes, adapter/network failures and queue redelivery. Adapters have **zero internal retries**. Transient network/timeout/429/5xx outcomes retry through durable continuation, obeying shared spacing and `Retry-After`; pg-boss has two backoff retries for interrupted/infrastructure delivery, but cannot reset the application budget. Collection steps have a ten-minute deadline, below the queue's fifteen-minute expiration. Resume preserves budgets. Exhausted URLs remain explicitly `exhausted`; create a new bounded collection after investigation rather than resetting history.

| Outcome | Recovery |
| --- | --- |
| `succeeded` | Accepted facts retained; resume skips the URL. |
| `retryable` / interrupted execution | Automatically continues where possible; `resume` recovers exhausted queue delivery or shutdown. |
| `exhausted` | Three attempts consumed; investigate, then submit a new bounded collection. |
| `malformed-evidence` | Parser/contract/layout failure; investigate adapter/source before a new collection. |
| `operator-required` | Permanent HTTP failure or size/request bound exceeded; investigate before a new collection. |
| `access-denied`, collection `paused` | All hosts stop this provider. Review robots/access conditions first. |

After access review, `bun run backend:cli provider-unpause roocket` (or `maktabkhooneh`) explicitly clears the pause. It preserves spacing/reservations and does not reattempt denied or malformed URLs. `resume` can finish still-pending URLs after unpausing; submit a new bounded request to retry the denied URL. Unpausing never bypasses newly fetched robots rules. Failure summaries deliberately exclude raw source bodies, credential-bearing errors and personal identities. Roocket's optional comment API ordinary failure retains valid course facts with the existing adapter's explicit partial-feedback warning; access denial still pauses the provider.

## Multi-host provider coordination

All robots, sitemap, HTML, redirect and public comment API requests acquire a PostgreSQL session advisory lock and the provider's single durable lease. The session lock spans the entire body read, so a still-connected slow/suspended worker cannot overlap another request merely because a reservation expires. Roocket HTML and API origins share the same provider key. The durable policy only increases to the maximum of host configuration and robots crawl-delay; new adapter instances/restarts cannot lower it. Request/response-body reading is bounded to 30 seconds and 20 MiB. A 60-second reservation remains after abrupt host loss, preventing immediate replacement traffic; normal completion releases it and sets the next permitted time at least the shared delay after completion. `Retry-After` extends this durable time. Response acceptance checks lease ownership/expiry; tokens prevent an obsolete request from releasing a replacement lease. Cancellable polling uses PostgreSQL time for admission, so host clock differences do not weaken basic spacing. Robots, same-origin safe redirects, anonymous access and adapter-local delays remain intact.

Do not run standalone utility scrapers against the same provider concurrently with backend ingestion: those export tools do not participate in the PostgreSQL limiter. Provider-wide limits here govern this backend job pipeline. This is conservative serial request coordination, not a high-throughput crawler. Live transport/template coverage and production connectivity/monitoring remain unvalidated by offline acceptance tests.

## Revision invalidation and operator approval

Saved imports and worker collection use one validated transactional persistence path. Evidence hashes exclude successful-check timestamps and the adapter-computed hash, but include all remaining retained fields: educational content, offers, availability, feedback, raw currency evidence, parser versions, provenance and image URLs. This intentionally conservative policy can create a revision for noneducational changes (including changed expiring image URLs), and **every new current evidence revision requires membership reapproval**. No educational inference or automatic approval occurs. Unknown values/original currency evidence stay intact; older or failed observations never invalidate current facts, and unchanged success advances freshness without another revision.

A changed current revision clears affected factual draft pointers, supersedes unfinished group runs and inserts a unique `(group, course, revision)` invalidation request in the same transaction. Published snapshots/history remain retained. Workers drain this transactional outbox every second: pg-boss reconciliation insertion and its retained job ID commit together using Drizzle's transaction adapter. Concurrent dispatchers use row locks/skip-locked selection. Reconciliation coalesces duplicate requests, records `waiting-review`, `approved` or `superseded`, and never promotes a snapshot or membership. Thus queue outages cannot lose invalidation, and obsolete jobs cannot promote old inputs.

Use a PostgreSQL client to inspect `group_invalidations` for pending domain review; the private queue dashboard shows reconciliation job delivery and IDs. Re-submit the original group JSON with `backend:cli group PATH` after reviewing current evidence. This explicitly reapproves current memberships and enqueues the existing deterministic build/finalize workflow. Publication remains a separate `publish` action. The two-current-eligible-alternatives gate applies throughout; a changed/unapproved or unavailable member may hide public output while preserving published history. Jev placement and retrieval now have bounded review workflows; educational assessment now uses the [milestone 4 review workflow](group-discovery-assessment.md); frontend stale/unavailable states are implemented.

## HTTP contracts

| Method/path | Behavior |
| --- | --- |
| `GET /health/live` | Process liveness, independent of database access. |
| `GET /health/ready` | Application schema/database readiness; 503 when unavailable. |
| `GET /v1/groups` | Bounded public discovery/search/filter/pagination, eligible publications only; see [query contracts](frontend-integration.md#public-api-and-query-contracts). |
| `GET /v1/categories` | Navigation categories containing eligible published groups. |
| `GET /v1/groups/:slug` | Manually published factual group only; 404 for absent, draft, withdrawn or below-minimum eligible groups. |
| `GET /internal/groups/:slug` | Latest completed draft with `Authorization: Bearer BACKEND_OPERATOR_TOKEN`; denied when token is unset. |

Responses use `Cache-Control: no-store`. Public DTOs expose curated course facts, source URLs, freshness, unknown values, coverage labels, `kind: "source-facts"`, and `analysis: null` or explicitly approved unranked analysis with every candidate and limitations. Stale analysis is removed independently of current facts. Raw evidence, adapter field paths, uncurated warnings, model payloads and secrets are excluded. Source facts still require the frontend to render plain text safely. Only same-origin/server-to-server HTTP access is configured; Next consumes discovery/search/detail contracts server-to-server; backend URL/configuration stays server-only.

## Reliability and retained evidence

- Stable source identities and full-evidence digests deduplicate imports. The evidence digest excludes routine `source.checkedAt` and the computed content hash, but preserves raw evidence and provenance changes. A separate adapter content hash identifies normalized fact changes. Full raw payload changes can therefore create a revision even when facts have not changed.
- Unchanged successful checks update course freshness without creating revisions; exact observation reimports coalesce. Failed checks retain valid facts. Older saved observations never replace newer current facts; conflicting facts at the same observation timestamp roll back the import.
- Each group workflow binds to the accepted course revisions and group definition version. Database locks and digest checks prevent stale jobs or stale publication from promoting older results.
- Drizzle transactions use pg-boss's transaction adapter: group creation and first job insertion are atomic, as are the deterministic result and its follow-up job. An immutable snapshot per workflow makes re-delivery harmless even when a process dies after commit but before queue completion.
- Attempt history stays in application tables beyond queue retention; re-delivery marks an unfinished prior attempt interrupted. Operational failure summaries omit payloads/credentials. A crashed attempt remains running until its job is redelivered; deterministic group attempt recovery remains delivery-driven. Ingestion records interrupted attempts on resume/redelivery, and a durable invalidation outbox is drained by workers.
- Current offers/freshness are projected from source records rather than copied indefinitely from a snapshot. A published group with fewer than two current approved, non-unavailable alternatives returns 404 while retaining its URL identity, snapshot and history. The saved publication is not deleted; after operator reapproval, old retained results may be shown with `stale: true` until the new result is published. The frontend provides a friendly unavailable state without fixture fallback.

## Separate container deployment

```sh
docker build -f infra/Dockerfile --target backend -t dorob-backend:local .
docker build -f infra/Dockerfile --target worker -t dorob-worker:local .
# After db:migrate and queue:setup have run against the shared database:
docker compose up -d --build backend worker
```

Compose supplies the local database hostname; the two images also run independently on cloud servers with their own injected `DATABASE_URL` pointing at the same PostgreSQL database. Use `BACKEND_HOST=0.0.0.0` inside the API container. Root `.env` files, exports, keys and development caches are excluded from images; credentials are supplied at runtime. Containers run as the Bun user, handle SIGTERM, and wait for in-flight work during shutdown. Migration/queue setup are explicit one-off operator tasks; the backend image includes the CLI and migration sources, so `docker run --rm --env-file ... dorob-backend:local bun packages/db/src/migrate.ts` and `... bun apps/backend/src/cli.ts queue-setup` work against a reachable cloud database.

The local Compose file binds database/API/dashboard ports to loopback, persists PostgreSQL data in `postgres-data`, and does not remove application volumes. Cloud routing, TLS, backups/restore, least-privilege database roles, centralized logs, and worker monitoring must be configured before release. Use a private connection or verified TLS for the shared database. Scaling deterministic workers is supported by transactional locks; provider request leases and persisted spacing enforce the same policy across hosts. Each active collection step reserves one additional PostgreSQL connection for its collection session lock, and each active provider request reserves another for its provider session lock; account for this beyond `DATABASE_POOL_SIZE`.

The optional queue dashboard uses Node 22.20.0 and `@pg-boss/dashboard` 1.10.0, paired with pg-boss 12.35.0/schema 43. It refuses startup without both Basic Auth credentials. Set `PGBOSS_DASHBOARD_AUTH_USERNAME` and `PGBOSS_DASHBOARD_AUTH_PASSWORD` separately, then run:

```sh
bun run dashboard:queue
```

To build its image independently: `docker build -f infra/dashboard/Dockerfile -t dorob-queue-dashboard:local infra/dashboard`. The optional `--dashboard` container test verifies private Basic Auth and a compatible schema read.

Open `http://127.0.0.1:4001`. Keep this operator surface private; it can change queues/jobs. Dashboard actions do not override application publication gates. The existing saved-data dashboard at port 8787 remains separate.

## Tests and builds

```sh
bun run lint
bun run typecheck
bun run test:utils
bun run test:backend
bun run test:web
bun run test:backend:integration
# After building dorob-backend:local and dorob-worker:local:
bun run test:backend:containers
# Optional, after building the dashboard image too:
bun run test:backend:containers --dashboard
bun run build:backend
bun run build
```

Offline unit tests need no database or model key. Integration tests start their own PostgreSQL/pgvector service on loopback port 55433, require the isolated database name `dorob_test`, apply migrations twice, and test revision/import safety, concurrent imports, ownership constraints, rollback, native queue retry/restart, coalescing, stale jobs, publication, and HTTP data boundaries. The runner removes only its ephemeral test container/network afterward; no application volumes are touched. The separate-container smoke command tests actual API/worker images, one-off migrations/queue setup, HTTP publication, shutdown and a new workflow after worker restart on the same isolated test service. Run database and container tests sequentially because they use the same test port/project. Fixtures are explicitly synthetic and never published to an application database. Network is needed only to acquire images/dependencies. See [validation](validation.md) for actual results and the existing web build blocker.

Milestone 2 container acceptance mounts test-only fixture transports into two actual worker images and invokes the actual operator CLI inside the separate backend image. It verifies both adapters, partial outcomes, shared spacing, unchanged revision deduplication, worker restart and abrupt kill/resume with the persisted lease. Fixture files and the fixture runner are not included in production images; no production fixture-mode environment flag exists. No live provider collection is performed by these tests.

## Milestone 3 placement, retrieval and review

See [placement operations](placement.md) for complete commands/JSON examples, official Decisions and embedding references, provisional taxonomy status, model identities, Persian normalization/RRF retrieval policy, PostgreSQL concurrency/budget enforcement, cancellation/unknown billing outcomes, stale/reuse behavior and limitations.

The command order is: migrate/setup queues → seed/review/activate taxonomy → inspect `placement-pending` → create `model-budget` → classify with `placement` → inspect/review → index selected course/group documents → optionally embed them → retrieve `candidates` → evaluate one candidate → explicitly approve/reject with `placement-review` → inspect/publish the factual group separately. Each request is bounded and workers may run on different hosts. Use `placement-status`, `model-budget-inspect`, `placement-inspect`, `placement-resume`, `placement-cancel` and `model-budget-cancel` for recovery. Completed equivalent work is reused; changed revisions/definitions/taxonomy/model/policy require another version-bound request.

No model/retrieval score self-approves membership or publication. Unknown evidence is uncertainty, not beginner/no-fit. Membership approval binds the course and group definition revisions. Pending review/unmatched records consume no active queue job. Manual resume is the only model retry authority (three attempts per request; no pg-boss model retries). A persisted 60-second host-loss reservation protects the single call slot; timeout is 30 seconds, with payload/response/output-validation bounds. Calls reserve a conservative operator-supplied USD allowance and count in PostgreSQL; a remote provider can still report a higher actual charge or an unknown outcome. Live availability, production cost estimates and Persian quality remain untested; the seeded taxonomy has no production human-review claim.

Milestone 3 local offline acceptance is complete. The full `test:backend:containers --dashboard` suite passes existing provider recovery and new model workflows; `--dashboard --placement-only` passed again against final audited images. Live validation and production taxonomy/quality calibration are not included in this completion.

## Discovery and assessment operations

See [milestone 4 commands and contracts](group-discovery-assessment.md) for `discovery`, `proposal`, `definition`, `definition-edit/review`, `assessment`, `analysis`, `assessment-review`, `publish-reviewed`, rejection and safe reprocessing. These extend the existing placement queue/model ledger and recovery commands; no visitor request calls a model. Generative work shares the same PostgreSQL slot and budgets as Jev/embeddings. No configured model is selected by default; `GENERATIVE_MODEL_ID`, explicit live enablement/credentials and bounded live budgets are required before authorized live work. Offline transports are test injections only. Factual group workflows remain available when generation fails.


## Selected manual refresh (milestone 5)

Read [refresh selection, budgets and recovery](frontend-integration.md#opt-in-refresh-and-review) before enabling `REFRESH_ENABLED` or `LIVE_REFRESH_ENABLED`; both default false. `refresh PATH` retains explicit course/group/provider selection and original source revisions, coalesces repeated keys through PostgreSQL, and atomically hands off existing bounded ingestion collections. `refresh-inspect ID` lists every retained collection/outcome. `collection-cancel ID` advances generation and fences late acceptance/finalization; existing `resume ID` retains attempt budgets and skips accepted selections. No model/publication action is automatic. Offline jobs require injected transports; authorized live refresh additionally needs both flags on operator/worker hosts. Missing model selection does not block factual implementation/tests. No schedules are implemented or enabled; quality/access review and separate authorization precede later enablement.

The full separate-container test also starts an actual local Next development process against the isolated synthetic API, checks factual/reviewed comparisons and stopped-backend behavior, then shuts it down. It requires free loopback port 55436 in addition to DB/API/dashboard test ports. Compilation/types pass but the existing Bun production page-data blocker persists. See [validation](validation.md) for browser acceptance limits.
