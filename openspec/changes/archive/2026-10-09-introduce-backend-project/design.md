# Design

## Context

See proposal.md for motivation. The workspace currently contains `apps/web` and `apps/utils`, uses Bun 1.3.8, and has no backend, Compose configuration, shared packages, or durable OpenSpec specs. Existing utility configuration supplies useful ESLint/TypeScript conventions. Plan.md identifies this checkout as a fresh phase 3 restart; old-backend.md is reference material rather than an architecture mandate.

## Goals / Non-Goals

**Goals:** Establish one independently runnable API process, an actual PostgreSQL connectivity check, and an interactive local inspection surface. Keep setup and validation small enough to review as a single foundation change.

**Non-Goals:** No product schema, ORM, migrations, shared package extraction, worker infrastructure, backend container image, or production hosting configuration. Database persistence is validated using temporary test data, not an invented application table. Broader exclusions are in proposal.md.

## Decisions

### Runtime and project boundary

Use Bun and TypeScript in `apps/api`, named `@dorob/api`, with Elysia. This carries forward the proposed stack in the conversation, not an assumption that every Node package works on Bun. Keep Bun 1.3.8 initially and pin compatible API dependencies and Bun types during implementation; the existing lockfile and workspace remain authoritative. Verify the selected versions through backend tests. A required runtime upgrade must be surfaced as a scope decision rather than silently upgrading the web runtime.

Node LTS/Fastify remains an alternative with a broader compatibility-oriented path, but adds a second runtime to this small bootstrap. Do not claim runtime performance gains without measurements. Separate app construction from the listening entry point so tests can exercise handlers without binding a fixed port. Do not create `packages/core` for a single greeting contract.

### HTTP and documentation contract

Implement the exact greeting and health responses in the capability specs. Describe request/response schemas using Elysia's schema facilities, and generate OpenAPI with `@elysia/openapi`. Configure its provider to Swagger UI explicitly and set `/docs` and `/docs/json`. Documentation must describe readiness 503 as well as 200. Use the API origin for interactive requests; frontend CORS is unnecessary until frontend integration is selected. Keep documentation assets locally served so trying the API does not depend on a CDN.

The greeting uses Persian text; protocol paths/status values remain stable Latin identifiers. Swagger is a developer tool, not a new Dorob product page, so no product design-system work is included.

### Database and local infrastructure

Use native `Bun.SQL` with an explicit connection URL, a small pool (maximum five connections), and finite connection/query timeouts. An ORM adds no value for `SELECT 1`; introduce Drizzle and migrations when a future change actually needs tables. Readiness performs `SELECT 1` within a five-second end-to-end deadline. Ensure timed-out queries/connections are cancelled or otherwise bounded and released; merely racing an unbounded query with a timer is insufficient.

Add root `compose.yaml` for PostgreSQL only, using a pinned supported PostgreSQL 17 image version selected during implementation. Use a named volume, `pg_isready`, local development credentials, and a loopback-only host port with an override for existing installations. No pgvector or queue extension is needed. The API runs on the host and connects through the mapped port. Use documented Compose defaults matching `apps/api/.env.example`; avoid undocumented coupling between root Compose environment loading and the API environment file.

### Startup and lifecycle

Load `apps/api/.env` through Bun by running the workspace scripts with `apps/api` as the working directory. Validate the URL scheme (`postgres:` or `postgresql:`), required connection fields, host, and integer port before listening. Default the API listener to `127.0.0.1:3001` so it does not collide with the web app on 3000.

A syntactically valid but temporarily unavailable database must not prevent the API from starting: liveness, greeting, and docs remain usable while readiness reports 503. Create/retain a pool that can recover after PostgreSQL returns. On SIGINT/SIGTERM, stop the listener and close the pool within a ten-second shutdown deadline, with a forced termination path if draining does not complete. Diagnostics identify the failed setting or operation without logging secrets or full database URLs.

### Workspace commands and verification

Retain root `dev`, `build`, and `start` as web commands. Add `dev:api`, `build:api`, `start:api`, `test:api`, and `db:up`/`db:down`; add API coverage to root lint/typecheck and expose focused API checks. Backend build emits ignored output under `apps/api/dist` targeting Bun; `start:api` executes that output. Type checking is an independent `tsc --noEmit` check.

Use focused handler/configuration tests plus a PostgreSQL integration test/smoke procedure for connectivity, deadline failure, recovery, and shutdown. Validate volume persistence with temporary test data and clean up those test objects. Document all commands, ports, environment setup, prerequisites, and check outcomes in README.md, Plan.md, and docs/validation.md during implementation. Run web type generation and web builds sequentially due to their shared `.next` output.

## Risks / Trade-offs

- [Pinned workspace Bun version may differ from current API documentation] -> Select compatible dependency versions, verify Swagger and SQL behavior on the actual runtime, and surface any required runtime upgrade before broadening implementation.
- [Bun SQL timeout/cancellation semantics could leave resources busy] -> Exercise an unavailable connection and deliberately slow query; verify bounded response and resource recovery.
- [Docker or port 5432 may be unavailable locally] -> Document prerequisites and port overrides; report unavailable integration checks without claiming a pass.
- [Existing Next.js production build has a documented Bun CommonJS failure] -> Validate the API build separately and report the existing web limitation accurately; this change does not fix it.
- [Developer credentials are unsuitable for deployment] -> Bind local services to loopback, label example credentials as development-only, and defer production operations to a separate change.

## Migration Plan

Introduce the API workspace and Compose database without changing frontend data access or importing previous backend code. Start PostgreSQL, configure the API, run backend checks/build, then try the documented endpoints in Swagger. No application-data migration occurs. Reverting the foundation removes the new app/configuration/scripts; normal database shutdown preserves the named volume. Volume deletion is a separate destructive command and must never be part of routine stop or automatic validation.
