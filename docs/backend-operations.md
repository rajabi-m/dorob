# Backend foundation: setup and operations

October 4, 2026. The backend lives in `apps/backend`, with the independently running Bun worker in `apps/worker`. This owner-requested boundary supersedes the earlier Next.js-only backend proposal. Both deploy as separate images from `infra/Dockerfile`; neither starts the other. They coordinate only through PostgreSQL and pg-boss, so they can run on different cloud hosts. The Next.js frontend still reads its existing dated fixtures; frontend integration is a later milestone.

Milestone 1 is implemented and locally validated. [Milestone 2: bounded ingestion and revision handling](backend.md#implementation-order-and-acceptance) is next; model workflows and frontend integration follow later.

Implemented scope: validated saved version-2 imports, immutable evidence revisions, successful/failed observations, manually approved group membership, durable deterministic factual snapshots, operator publication, read-only HTTP queries, and private draft inspection. No models, scraping, schedules, ranking, or new frontend behavior are enabled.

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

Bun loads the ignored root `.env` when invoked from the repository root. No API/model credentials are needed for offline operations. Generate an optional `BACKEND_OPERATOR_TOKEN` with `openssl rand -hex 32`; absent a token, internal HTTP access is always denied. Do not use `NEXT_PUBLIC_` for secrets. Blank embedding/budget placeholders are accepted; any enabled live-model or scheduling flags are explicitly rejected until those workflows exist. Concurrency values for future ingestion/model workflows reserve configuration only; current `WORKER_CONCURRENCY` controls each deterministic queue's local worker count.

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

Submitting the identical group again coalesces the same revision-bound workflow. Resubmitting the definition with the same member set after importing newer evidence explicitly reapproves those source revisions and creates a new workflow. Editing the group definition/member set is deferred; conflicting use of a slug is rejected. Retries are capped at two with backoff. Use the protected queue dashboard to inspect/retry a failed or exhausted job; recreating an identical group does not silently reset its workflow. No HTTP write endpoints are exposed.

## HTTP contracts

| Method/path | Behavior |
| --- | --- |
| `GET /health/live` | Process liveness, independent of database access. |
| `GET /health/ready` | Application schema/database readiness; 503 when unavailable. |
| `GET /v1/groups/:slug` | Manually published factual group only; 404 for absent, draft, withdrawn or below-minimum eligible groups. |
| `GET /internal/groups/:slug` | Latest completed draft with `Authorization: Bearer BACKEND_OPERATOR_TOKEN`; denied when token is unset. |

Responses use `Cache-Control: no-store`. Public DTOs expose curated course facts, source URLs, freshness, unknown values, coverage labels, `kind: "source-facts"`, and `analysis: null`. Raw evidence, adapter field paths, uncurated warnings, model payloads and secrets are excluded. Source facts still require the frontend to render plain text safely. Only same-origin/server-to-server HTTP access is configured; cross-origin browser integration and discovery/search contracts belong to the frontend integration milestone.

## Reliability and retained evidence

- Stable source identities and full-evidence digests deduplicate imports. The evidence digest excludes routine `source.checkedAt` and the computed content hash, but preserves raw evidence and provenance changes. A separate adapter content hash identifies normalized fact changes. Full raw payload changes can therefore create a revision even when facts have not changed.
- Unchanged successful checks update course freshness without creating revisions; exact observation reimports coalesce. Failed checks retain valid facts. Older saved observations never replace newer current facts; conflicting facts at the same observation timestamp roll back the import.
- Each group workflow binds to the accepted course revisions and group definition version. Database locks and digest checks prevent stale jobs or stale publication from promoting older results.
- Drizzle transactions use pg-boss's transaction adapter: group creation and first job insertion are atomic, as are the deterministic result and its follow-up job. An immutable snapshot per workflow makes re-delivery harmless even when a process dies after commit but before queue completion.
- Attempt history stays in application tables beyond queue retention; re-delivery marks an unfinished prior attempt interrupted. Operational failure summaries omit payloads/credentials. A crashed attempt remains running until its job is redelivered; no automatic application-level reconciliation daemon exists yet.
- Current offers/freshness are projected from source records rather than copied indefinitely from a snapshot. A published group with fewer than two current approved, non-unavailable alternatives returns 404 while retaining its URL identity, snapshot and history. The saved publication is not deleted; after operator reapproval, old retained results may be shown with `stale: true` until the new result is published. A friendly frontend unavailable state is still to be integrated.

## Separate container deployment

```sh
docker build -f infra/Dockerfile --target backend -t dorob-backend:local .
docker build -f infra/Dockerfile --target worker -t dorob-worker:local .
# After db:migrate and queue:setup have run against the shared database:
docker compose up -d --build backend worker
```

Compose supplies the local database hostname; the two images also run independently on cloud servers with their own injected `DATABASE_URL` pointing at the same PostgreSQL database. Use `BACKEND_HOST=0.0.0.0` inside the API container. Root `.env` files, exports, keys and development caches are excluded from images; credentials are supplied at runtime. Containers run as the Bun user, handle SIGTERM, and wait for in-flight work during shutdown. Migration/queue setup are explicit one-off operator tasks; the backend image includes the CLI and migration sources, so `docker run --rm --env-file ... dorob-backend:local bun packages/db/src/migrate.ts` and `... bun apps/backend/src/cli.ts queue-setup` work against a reachable cloud database.

The local Compose file binds database/API/dashboard ports to loopback, persists PostgreSQL data in `postgres-data`, and does not remove application volumes. Cloud routing, TLS, backups/restore, least-privilege database roles, centralized logs, and worker monitoring must be configured before release. Use a private connection or verified TLS for the shared database. Scaling deterministic workers is supported by transactional locks; multi-host provider-wide throttling is not implemented because ingestion is not active.

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
bun run test:backend:integration
# After building dorob-backend:local and dorob-worker:local:
bun run test:backend:containers
# Optional, after building the dashboard image too:
bun run test:backend:containers --dashboard
bun run build:backend
bun run build
```

Offline unit tests need no database or model key. Integration tests start their own PostgreSQL/pgvector service on loopback port 55433, require the isolated database name `dorob_test`, apply migrations twice, and test revision/import safety, concurrent imports, ownership constraints, rollback, native queue retry/restart, coalescing, stale jobs, publication, and HTTP data boundaries. The runner removes only its ephemeral test container/network afterward; no application volumes are touched. The separate-container smoke command tests actual API/worker images, one-off migrations/queue setup, HTTP publication, shutdown and a new workflow after worker restart on the same isolated test service. Run database and container tests sequentially because they use the same test port/project. Fixtures are explicitly synthetic and never published to an application database. Network is needed only to acquire images/dependencies. See [validation](validation.md) for actual results and the existing web build blocker.
