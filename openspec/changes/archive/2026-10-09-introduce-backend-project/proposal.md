# Proposal

## Why

Dorob's backend restart needs a small, runnable foundation before introducing product data or processing pipelines. A hello-world API with interactive documentation and a verified PostgreSQL connection lets the owner try the backend independently of the existing frontend.

## What Changes

- Introduce `apps/api` as a TypeScript backend running on Bun, using Elysia as the proposed framework from the preceding exploration.
- Serve a Persian hello-world JSON response and separate liveness and database-readiness endpoints.
- Generate OpenAPI from route schemas and provide Swagger UI for trying requests locally.
- Provide a local PostgreSQL service through Docker Compose with persistent storage and example environment configuration.
- Add focused workspace commands, backend validation, and local setup documentation.
- Limit this change to bootstrapping: no course tables/imports, frontend integration, scraping, AI, worker, accounts, or cloud deployment.

## Capabilities

### New Capabilities

- `backend-service`: HTTP greeting, health reporting, interactive API documentation, configuration, and service lifecycle.
- `database-connectivity`: Persistent local PostgreSQL development service and bounded backend connectivity checks.

### Modified Capabilities

None; the project currently has no durable OpenSpec specs.

## Impact

Implementation will introduce `apps/api`, a root Compose configuration, and backend-specific workspace scripts/dependencies with an intentional Bun lockfile update. README.md, Plan.md, and validation documentation will describe the implemented foundation and remaining limitations. Existing web and utility behavior remains unchanged. PostgreSQL is confirmed by the owner; Bun/Elysia and native Bun SQL are proposed implementation defaults. No Drizzle dependency or domain migration is needed until a later change introduces persisted product data.
