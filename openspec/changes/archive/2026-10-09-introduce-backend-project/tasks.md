# Tasks

## 1. Backend workspace and configuration

- [x] 1.1 Create `apps/api` as `@dorob/api` with Bun/TypeScript, pinned compatible Elysia/OpenAPI dependencies, ESLint, Bun types, and build/start scripts; verify installation and focused API lint, typecheck, and build commands succeed on the documented Bun version, preserving the workspace lockfile.
- [x] 1.2 Implement validated environment loading and startup with separate app construction and listener entry point; verify tests cover default host/port, overrides, missing/invalid database URL, invalid port, and credential-safe diagnostics.
- [x] 1.3 Add root API commands and API coverage to lint/typecheck without changing web dev/build/start behavior; deliver `apps/api/.env.example` and README instructions, and verify root commands resolve the API working directory and load its environment file.

## 2. Local PostgreSQL and connection lifecycle

- [x] 2.1 Add PostgreSQL-only `compose.yaml` with a pinned PostgreSQL 17 image version, named volume, loopback port binding/override, health check, and root `db:up`/`db:down` commands; verify Compose configuration is valid and the service becomes healthy when Docker is available.
- [x] 2.2 Implement the bounded Bun SQL connection pool and real readiness query; verify PostgreSQL success, unavailable/slow-query failure within five seconds, and recovery without API restart through focused tests and a real database integration check.
- [x] 2.3 Implement SIGINT/SIGTERM shutdown with a ten-second bound and safe resource cleanup; verify process-level checks release the listener and connections for both signals, including during in-flight database work.
- [x] 2.4 Document matching Compose/API development settings, port overrides, normal stop/start, and separately labeled destructive volume removal; verify a temporary test record survives normal database restart, then clean up only the test objects and record results in docs/validation.md.

## 3. HTTP endpoints and Swagger

- [x] 3.1 Implement the exact Persian greeting, liveness, and readiness contracts with response schemas; verify handler tests assert status codes/content and confirm greeting/liveness remain available during a database outage.
- [x] 3.2 Configure generated OpenAPI at `/docs/json` and locally served Swagger UI at `/docs`; verify schema coverage for all three operations including readiness 503, and execute the greeting from Swagger against the current API origin without CDN dependencies.
- [x] 3.3 Document endpoint examples and expected healthy/unavailable responses in README.md, and update Plan.md to reflect only the implemented bootstrap; verify instructions agree with the endpoint specs and continue to describe frontend fixtures and deferred production integration accurately.

## 4. Integration validation

- [x] 4.1 Follow the documented setup from database startup through API dev mode, Swagger greeting, readiness success/failure/recovery, and built-output startup; verify the complete local smoke flow and record actual results or unavailable prerequisites in docs/validation.md.
- [x] 4.2 Run root lint, typecheck, utility tests, API tests, API production build, and web production build sequentially where outputs overlap; verify no new regressions and report the existing web build limitation separately if reproduced. Validate the completed OpenSpec change with `openspec validate introduce-backend-project --strict`.
