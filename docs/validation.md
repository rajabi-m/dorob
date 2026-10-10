# Validation and known limitations

## Whole-app development launcher — October 10, 2026

`bash -n run.sh`, help/invalid-port handling and whitespace checks pass. Invoking
the launcher by absolute path from another directory starts healthy Compose
PostgreSQL, applies migrations and launches both watchers on overridden frontend/API
ports. Frontend and Swagger return HTTP 200; API readiness reports database up.
Ctrl+C stops both app process groups and leaves the already-running PostgreSQL
service available. Database shutdown when newly started is implemented but was
not exercised against the existing development container. No database volume
removal occurs.

## Course ingestion history — October 10, 2026

`add-course-ingestion-history` has all **22/22 tracked tasks complete** and implements
local v3 snapshot ingestion, whole-snapshot
current/history reads, explicit thumbnail processing and retained hosted assets.
The owner approved a temporary IP-pinning exception for internal crawler image
URLs. Both main specs are synced and strictly validated; the change is
[archived](../openspec/changes/archive/2026-10-10-add-course-ingestion-history/).
The owner requested committing this implementation and its archived specifications.
No branch change or push was performed.

| Check | Result |
| --- | --- |
| Root `bun run lint` / `bun run typecheck` | Pass across web, utilities and API. |
| `bun run test:utils` | Pass: 75 tests, including sparse/reduced saved-provider conversion and refusal to overwrite source/output. V2 adapters and dashboard contracts unchanged. |
| `bun run test:api` | Pass: 31 offline tests, 17 explicit integration skips. |
| `API_INTEGRATION=1 bun run test:api` | Pass: 48 tests, 478 assertions across 14 files, using isolated PostgreSQL schemas. Existing curation/readiness/shutdown checks remain green. |
| New migration/repositories | Reruns, concurrent runners, transactional DDL failure, old references/memberships, same-course current FK, concurrent observations, replay/conflict, stable IDs, whole-snapshot current, legacy null state and exact/paginated history verified. |
| Raster dependency | Sharp 0.34.5 pinned; JPEG/PNG/WebP decode and WebP encode pass under Bun 1.3.8 in source and built output. Resize/orientation/no-upscale/metadata removal, invalid/SVG/animation/byte/pixel limits and killable deadline pass. |
| Upload/assets | Expiry/consumption/replay, compressed staging recovery, content-addressed concurrent reuse, leases, old-snapshot processing, missing/corrupt current files, safe failures, explicit retries, ETag/immutable cache headers and retained historical image access verified. |
| `bun run build:api` | Pass: API and isolated raster worker bundled; Sharp remains an installed native external dependency. |
| `bun apps/api/tests/built-ingestion-smoke.ts` | Pass against the default built service: rich/sparse ingestion, changed pricing/images, replay, real HTTPS URL/upload asset reuse, safe private-URL failure, retained memberships/history/assets, migration rerun and normal API restart. The script removes only its temporary database/storage/listener. |
| OpenAPI/documented flow | Schema/examples and synthetic ingestion/process/history/hosted-image URL/upload flow verified locally. Documented JSON validates; converter help and explicit command are verified. |
| Web production build | Compilation and TypeScript pass; existing Bun CommonJS wrapper failure recurs during page-data collection (latest run reports `/design-system`). Frontend code unchanged. |
| OpenSpec / whitespace | Strict change validation, all six main specs and `git diff --check` pass. Both ingestion/thumbnail specs match their deltas; the change is archived with all 22 tasks complete. |

Bun's pinned TLS transport previously failed with
`UNKNOWN_CERTIFICATE_VERIFICATION_ERROR` while rewriting the request hostname to
an IP. Per owner decision, further work on that transport stopped. Retrieval now
uses standard HTTPS with `rejectUnauthorized: true`, manual redirect validation,
public-address DNS preflight, credential omission, bounded streams, deadlines and
concurrency. Controlled tests assert these protections and the deliberate absence
of connection pinning; the built smoke verifies a real public JPEG over TLS.

**Known security risk / TODO:** preflight DNS and HTTPS connection DNS resolve
independently. An address can change after preflight, allowing SSRF through DNS
rebinding despite the preflight checks. This risk was accepted temporarily on
October 10 for URLs supplied by the internal crawler. Restore verified connection
IP pinning later; TLS verification must remain enabled. See
[thumbnail retrieval](../apps/api/src/image-download.ts) and the change's thumbnail
requirements/design for the same exception.

The ingestion smoke restarts the API against the same database/files; it does not
claim a new PostgreSQL server restart check. Earlier foundation/catalog checks
verified the named database volume across normal database restarts. History and
permanent assets are retained; only bounded temporary/unreferenced staging files
are cleaned. Back up the database and asset directories together. Management
remains local/unauthenticated, originals are not retained, and AI, automatic
scraping/import, frontend consumption and production integration remain deferred.
The lockfile adds the API's pinned Sharp and TypeBox dependencies while preserving
Next's existing Sharp 0.35.5 and the resolver's existing runtime in nested entries.
`bun install --frozen-lockfile --offline` passes without changes. Final scope review
against both capability deltas found no automatic scraping/import/AI execution,
changes to existing v2 adapters/dashboard or frontend code, secrets, generated
assets, or destructive history/permanent-asset cleanup in the change.


## Backend foundation — October 9, 2026

The spec-driven `introduce-backend-project` change has all 12 tracked tasks complete and is [archived](../openspec/changes/archive/2026-10-09-introduce-backend-project/) with both main specs synced and strictly validated. It runs on the existing Bun 1.3.8 runtime, with pinned Elysia 1.4.30, `@elysia/openapi` 1.4.16, Swagger UI 5.33.1, and Bun types 1.3.8. Installation and frozen-lockfile verification passed; existing workspace versions were retained.

| Check | Result |
| --- | --- |
| Focused API lint/typecheck/build | Pass. Bundled Bun entry point runs from `apps/api/dist/index.js`. |
| `API_INTEGRATION=1 bun run test:api` | Pass: 12 tests, including real PostgreSQL and process-level SIGINT/SIGTERM checks. |
| Root environment loading | Pass: temporary API `.env` port override loaded through both root `dev:api` and `start:api`; test file removed. |
| `docker compose config --quiet` / `bun run db:up` | Pass: Docker Desktop started, pinned PostgreSQL 17.11-alpine3.23 pulled, service healthy. |
| Database readiness | Real SELECT 1 succeeds; unavailable connection returns false within five seconds. Slow `pg_sleep(30)` fails in about 4.0 seconds; next query on a single-connection pool succeeds, with no slow query left active. |
| Shutdown | SIGINT and SIGTERM pass with idle and in-flight database work. In-flight cleanup takes about 4.1 seconds, below the ten-second bound; listener can be rebound and slow database work is gone. |
| Persistent volume and API recovery | Pass: a unique `validation_…` schema/table held a test record across normal `db:down` / `db:up`. Only that generated schema was dropped afterward; the volume was retained. |
| Local smoke | Dev-mode hello/live/ready succeeded. During database outage, readiness returned 503 in 0.003 seconds while hello/live stayed 200; readiness recovered in 0.013 seconds without API restart. Built-output hello and readiness also succeeded. |
| OpenAPI/local Swagger assets | Handler tests pass: all three operations, readiness 503, relative API origin, locally served JS/CSS, no external HTML asset URLs. Chrome Swagger Try it out / Execute passed: current-origin request returned HTTP 200 and `{"message":"سلام دنیا"}`. |
| Root lint/typecheck / utility tests | Pass: lint and typecheck cover web, utilities, and API; 72 utility tests pass. |
| Default API tests / production build | Pass: six offline tests; six explicit integration skips. API build passes independently of the web build. |
| Web production build | Existing Bun CommonJS failure reproduced after successful compilation and TypeScript, during page-data collection for `/icon.svg`. No web code or runtime changed. |
| OpenSpec / whitespace | `openspec validate introduce-backend-project --strict` and `git diff --check` pass. |

Initial real checks exposed a Bun 1.3.8 cancellation limitation: query cancellation returned while PostgreSQL still ran `pg_sleep`, leaving a connection busy. The implementation combines a four-second PostgreSQL startup `statement_timeout`, a two-second connection timeout, and cancellation at 4.5 seconds. Repeated integration checks then verified release and recovery. No runtime upgrade was needed.

Smoke validation created and removed a temporary API environment file; copy the tracked example before running the API yourself. PostgreSQL's normal restart preserved its named volume. No product tables or migrations were introduced, no volume was removed, and the frontend still reads fixtures. See [backend setup](../README.md#backend-development).

After the owner repaired Chrome control, interactive Swagger execution was verified in Chrome at `http://127.0.0.1:3001/docs`. The request URL matched the running API origin, the server response was 200, and the displayed Persian JSON was exact. API and PostgreSQL remain running locally for review.

Archive/commit verification on October 9 reran root lint/typecheck, 72 utility tests, six offline API tests, the API build, and strict main-spec validation successfully. All 12 API integration tests passed with local network access after sandbox restrictions prevented loopback listeners and database access. The web build again compiled and type-checked successfully, then reproduced the known Bun CommonJS failure during page-data collection for `/`. No new browser review or database restart/persistence check was performed during archiving.

## Curated catalog — October 9–10, 2026

Shared-category extraction passed root type checking and the RTL detector (zero errors/warnings in the edited showcase). Chrome desktop review confirmed the six ordered Persian labels and retained SVG artwork/descriptions. Code, data, tools, and language selection returned 13, 2, 3, and 0 snapshot courses respectively; selection focused the results heading and Shift+Tab showed a visible focus outline. Mixed Persian/Latin course titles (HTML, CSS, JavaScript, Agentic AI, n8n) remained readable. Chrome iPhone SE emulation at 375×667 showed all six cards in two columns with wrapping labels, preserved artwork, and the selected language empty state. This is a focused category regression check, not a full accessibility audit.

The `add-curated-course-groups` implementation adds a dependency-free core registry/contracts, explicit native Bun SQL migrations, manual group/reference persistence, local management APIs, and eligible public reads. Frontend fixtures and `/groups/[id]` remain independent.

| Check | Result |
| --- | --- |
| Root `bun run lint` / `bun run typecheck` | Pass across web, utilities, and API. Both apps import the shared core package. |
| `bun run test:api` | Pass: 12 offline tests, 11 explicit integration skips. Includes bounds, input/JSON validation, unknown PATCH rejection, ordering, encoded membership IDs, 404/409/422/503, minimal public references, category outage behavior, and OpenAPI schemas. |
| `API_INTEGRATION=1 bun run test:api` | Pass: all 23 tests, 263 assertions. Includes unchanged database/readiness and SIGINT/SIGTERM contracts. |
| Migrations | Initial execution, rerun retaining data, concurrent serialized runners, checksum drift rejection, and failed-DDL rollback pass against isolated PostgreSQL schemas. Root `db:migrate` also passes against the persistent development database, without seeding or startup migration. |
| SQL/repository | All six category IDs accepted; invalid categories/levels, duplicate slugs/provider identities/memberships, and dangling links rejected. Stable course upserts, group edits, multiple memberships, eight concurrent assignments, repeated removals, conflict/write rollback, counts, stable pages, and publication transitions pass. |
| Chrome Swagger | All new operations exercised at loopback port 3011: categories, two synthetic registrations, course/group lists, draft creation, group detail with one-item page/total two, PATCH/publication, both assignment/removal methods, public listing/detail, and two-to-one-to-two visibility (200→404→200). Responses use the current origin. |
| Persistent restart/outage | Synthetic group/course identities, assignments, flag, and public details matched exactly after migration rerun and normal API/database restart. During outage, catalog and readiness returned safe 503s; hello/live/categories/docs JSON stayed 200. Built API startup succeeded. |
| API production build | Pass. Native SQL ownership remains one shared five-connection pool, closed by existing shutdown. |
| Web production build | Compilation and TypeScript pass; known Bun 1.3.8 CommonJS wrapper failure recurs during page-data collection for `/`. No runtime/dependency upgrade made. |
| Lockfile / scope | Offline installation and frozen-lockfile verification pass. Lockfile changes only add the core workspace and its links; pinned dependency versions retained. No AI/ingestion/admin UI, frontend API consumption, generated outputs, or local environment files included. |
| OpenSpec / whitespace | Strict change validation and `git diff --check` pass. |

Two implementation compatibility issues were reproduced and resolved: Bun 1.3.8 transaction callbacks leaked failed-query rejections, so catalog writes/reads and migration execution use explicit transactions on reserved sessions; rollback is verified. `@elysia/openapi` 1.4.16 emitted invalid 204 `content: { type: "void" }`, breaking Swagger response rendering; the docs JSON hook removes content from 204 responses, with offline and Chrome regression checks. Malformed JSON now returns a safe 422. No dependency upgrades were needed.

Validation removed only its uniquely named Swagger group/two references and isolated schemas, including two abandoned constraint-test schemas verified to contain only the exact test fixtures. The catalog tables and migration ledger remain, and PostgreSQL's named volume was retained. Built API runs locally on `127.0.0.1:3011` for review; the documented default remains 3001. Management remains unauthenticated local development only. Full provider facts, authentication, frontend integration, ingestion, ranking, AI comparison, and production deployment remain deferred; see [catalog workflow](catalog.md).

Commit verification on October 10 reran root lint/typecheck, all 23 API tests with real PostgreSQL (263 assertions), 72 utility tests, the API build, and strict validation of all four main specs successfully. The archived change has all 18 tasks complete, and both new main specs match their deltas with Purpose and scenarios preserved. The web build compiled and type-checked, then reproduced the known Bun CommonJS wrapper failure during page-data collection for `/design-system`. Docker socket inspection was unavailable inside the sandbox; integration tests passed with local access. This commit pass did not repeat the earlier browser review or normal database restart check.

## Frontend milestone — October 4, 2026

Phase 2 is complete for now by owner decision; this does not imply production readiness. The following records preserve that milestone's checks.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web and utilities. |
| `bun run typecheck` | Pass: route generation, web TypeScript, and utilities. |
| `bun run test:utils` | Pass: 72 tests across five files. |
| `bun run build` | Compilation and build TypeScript pass; page-data collection fails with the Bun CommonJS error below. |
| Frontend RTL detector | Zero errors; 25 warnings in the two JSON snapshots, for preserved provider source text/titles with Latin digits. |
| Dashboard RTL detector | Pass: zero errors and warnings. |
| Documentation links and whitespace | Checked before committing the milestone. |

The RTL warnings concern retained source evidence and provider titles, not physical layout properties. Price, duration, date, and count rendering use Persian formatters. The detector is a static floor; it does not replace browser or screen-reader testing.

## Production build

On Bun 1.3.8, Next.js 16.3.7 compiles and type-checks, then fails while collecting page data for `/design-system`:

```text
Expected CommonJS module to have a function wrapper
```

The experimental `turbopackPluginRuntimeStrategy: "workerThreads"` setting avoids the previously reproduced socket-based worker-port failure. The earlier October 2 investigation also reproduced the CommonJS error using Webpack; switching page-data workers to threads did not fix it and was reverted. The existing Homebrew Node executable previously failed to start because `libllhttp.9.3.dylib` was missing. No runtime, dependency, or system installation changes were made for this milestone.

The first build attempt during this check collided with simultaneous Next route-type generation (`ENOTEMPTY` in `.next/types`). A sequential rerun completed compilation/types and reproduced the established runtime blocker. Run Next type generation and production builds sequentially because they share `.next`.

## Browser review coverage

Historical Firefox reviews cover desktop and narrow mobile layouts, Persian and mixed Latin search, course details and Escape/focus restoration, filters, comparison-heading focus, categories/cards, cover galleries, and the local data dashboard. Specific iterations and incomplete checks remain in [frontend](frontend.md), [provider snapshots](provider-snapshots.md), and [project history](project-history.md).

This documentation/commit pass does not claim a new browser interaction review. Comprehensive screen-reader testing, every breakpoint, final Python mobile-card/focus review, and animation/reduced-motion review remain follow-ups. No complete production build or release validation is claimed.

## Data boundaries

Frontend course facts are dated saved samples; analytical copy and ordering are labeled editorial/prototype content. Current standalone adapters emit version 2 and return `derived: null`; frontend snapshots are separate browser-safe fixtures. Utility tests run offline with retained and synthetic fixtures. No new live collection or full-catalog crawl was run for this commit. Broader provider-template sampling, freshness operations, deployment monitoring, and evidence-backed AI evaluation remain future work.

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The local dashboard therefore requires local exports before use. See [utility usage](../apps/utils/README.md).
