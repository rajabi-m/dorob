# Validation and known limitations

## Ingestion CLI reporting — October 11, 2026

`improve-ingestion-cli-output` replaces default per-selection JSON stdout with a
bounded human summary. Explicit `--json` retains the existing full report fields
and exit semantics; startup failures produce one safe error document. Progress,
retries and diagnostics stay on stderr in both modes. Optional observers are
isolated from checkpointing, and saved journals remain version 1.

| Check | Result |
| --- | --- |
| `bun run test:utils` | Pass: 112 tests across 15 files, including existing provider regressions and new reporting coverage. |
| `bun run lint` | Pass across web, utilities and API. |
| `bun run typecheck` | Pass across web, utilities and API. |
| `bun run build` | Frontend compilation and TypeScript pass; page-data collection fails with the previously documented Bun CommonJS function-wrapper error (the pre-commit rerun failed at `/icon.svg`; the earlier run failed at `/api/courses/[courseId]`). No frontend code changes are included here. |
| CLI/worker integration | Offline complete, partial, canceled and resumed runs preserve observation/receipt identity; 1,000 selected URLs stop after one failed delivery with one pending and 999 unattempted selections. Resume uses the original 1,000-selection journal. |
| Output/privacy/recovery | TTY replacement and ten-second discovery/request liveness, redirected throttling, cancellation/fatal timer cleanup, bounded failure groups, stage-specific guidance, spaces/apostrophes in shell commands, control-character rejection, unsafe exception/body redaction, lock/mismatch protection, terminal rejection review and pre-checkpoint failures are covered. |
| Machine mode/help | Captured stdout parses as one unchanged report or safe fatal-error document; stderr carries diagnostics. Executable startup-error exit codes and standalone help pass. |
| Scope/whitespace | Intended changes are utility reporting/request diagnostics, adjacent tests, operator docs and this OpenSpec task tracker. `git diff --check` passes. The separate `refine-homepage-course-cards` planning change is left untouched. |

HTTP error messages remain compatible with legacy exports (`HTTP 404`), and
request retries/rate limits are unchanged. Historical `transport` codes cannot
recover previously discarded causes. All reporting verification uses fixtures
and injected services; it does not crawl the live catalog, resolve the original
backend outage or claim that the owner's pending live journal completed. No app
server was started for this change. Its four CLI requirements are synced to the
main `scraper-worker` spec, all ten main specs pass strict OpenSpec validation,
and the completed change is archived under
`openspec/changes/archive/2026-10-11-improve-ingestion-cli-output/`.
Pre-commit checks repeated the 112-test, lint and type-check passes and the
existing production-build limitation.


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

Homepage course results and real-course details use retained public catalog observations; surrounding sample course facts are dated fixtures, and analytical copy and ordering are labeled editorial/prototype content. Standalone export commands emit version 2 and return `derived: null`; the programmatic Maktabkhooneh adapter and explicit ingestion worker emit version 3. Frontend snapshots are separate browser-safe fixtures. Utility tests run offline with retained and synthetic fixtures. Owner-requested live dev samples are recorded below; no full-catalog crawl was performed. Broader provider-template sampling, freshness operations, deployment monitoring, and evidence-backed AI evaluation remain future work.

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The local dashboard therefore requires local exports before use. See [utility usage](../apps/utils/README.md).

## Scraper pipeline redesign — October 10, 2026

OpenSpec `redesign-scraper-pipeline` has **21/21 tasks complete** under the
owner-revised acceptance scope: paid-course live ingestion/image/resume passed;
free LPIC-1 live acceptance is deferred as a TODO in `Plan.md`. The original
paid/free attempt and failure investigation below are historical evidence. No frontend integration, other-provider migration, database schema
change, automatic startup collection, commit or publication was performed.

### Commit verification and dev sampling

The owner subsequently authorized bounded dev ingestion and this commit.
The first run accepted ten new paid courses with ten verified hosted WebPs.
The next run selected 99 sitemap URLs plus known free LPIC-1 `mk711`:
99 observations were accepted (89 new course records and ten refreshes),
with 99 current snapshot IDs and hosted WebPs verified through the API.
Pricing was 95 paid and four unknown; LPIC-1 exhausted normal retries on
provider HTTP 500 before parsing. No delivery or image failures occurred.
The partial journal retains that collection failure for explicit later resume.
Final dev totals were 99 Maktabkhooneh courses and 109 retained snapshots,
each accepted snapshot with a ready thumbnail. Private reports, diagnostics,
journals and generated assets are excluded from the commit.

Fresh commit checks: workspace lint and type checking passed; 95 utility tests
and 31 offline API tests passed, with 17 explicitly gated API integration tests
skipped. The separate isolated worker real-API integration passed, including
lost-receipt replay, retained/changed history, thumbnail failure/retry/reuse,
hosted assets and normal restart. API build passed; all eight main OpenSpec
specifications passed strict validation. Frontend production compilation and
TypeScript passed, but page-data collection reproduced the existing Bun 1.3.8
`Expected CommonJS module to have a function wrapper` failure. No UI code
changed, so no new browser layout review was required. Temporary run/report
helpers were moved out of the utility source tree after an initial type-check
failure in a report-only callback; final workspace type checking passed.

### Earlier implementation checks

- Workspace lint/typecheck passed. Utility tests: 95 passed, zero failures.
- Offline API tests: 31 passed, 17 explicitly gated integration tests skipped,
  zero failures. The separate worker real-API integration ran successfully.
- API build passed. Frontend production compilation and TypeScript passed;
  page-data collection still fails under Bun 1.3.8 with the existing
  `Expected CommonJS module to have a function wrapper` runtime limitation.
- Strict OpenSpec validation and `git diff --check` passed.
- `bun apps/utils/tests/worker-integration.ts` passed against an independently
  created temporary PostgreSQL database and asset directories. Controlled Nuxt
  source and PNG fixtures exercised actual HTTP ingestion, lost-response replay,
  changed fresh observations, retained history, HTTP-200 image failure/retry,
  content reuse, historical hosted WebP bytes, migration rerun and normal API
  restart. Its own database/assets/journals were removed; existing data remained.
  Local database/network execution required sandbox escalation.

`bun apps/utils/tests/worker-live.ts` selected exactly two explicit public
courses, with no discovery: paid Python `mk346` from the existing snapshot URL
and free LPIC-1 `mk711` from the provider's public free-course shortlink. Robots
policy was consulted. It used a temporary isolated backend/database/assets.

- Python collected at `2026-10-10T10:36:41.714Z`, stable source identity
  `maktabkhooneh:10465`, and was accepted once. FULL price was 1,169,550 toman
  (original 2,599,000), CONTENT 719,550 (original 1,599,000). Both retained source
  price/unit evidence. Pricing/thumbnail/description coverage was complete;
  curriculum, feedback, educational/classification/instructor/provider-state
  and selected evidence sections retained partial coverage. Its hosted WebP
  was ready and fetched successfully; history count was one.
- LPIC-1 failed collection, with no observation or backend acceptance. The
  credential-safe worker records `collection_failed`; this check did not
  determine whether request/template/extraction/validation caused it. It does
  not establish a live free-course result. No new course selection or automatic
  recollection was attempted after the failure.
- Same-checkpoint live resume/history verification was not performed because
  source acceptance was incomplete. Offline and controlled real-API replay
  verification passed independently; it does not replace live acceptance.
- Private diagnostic journal retained under ignored
  `apps/utils/output/live-9O22qj/paid-free.json`. Its temporary backend/database
  and assets were removed; the journal is evidence of that test and cannot resume
  against the now-removed destination. The sandbox-failed initial attempt
  created no database or provider requests.

The initial implementation paused at task 5.2 under the apply workflow's blocker rule; the owner later requested skipping this course (see completion below).
Investigate the failed selection before claiming the golden example complete;
any further live run should remain limited to these explicit course selections.

### Free-course failure investigation — October 10, 2026

The owner authorized investigation of the remaining live acceptance failure.
A diagnostic fetch used `MaktabkhoonehScraper.fetchCoursePage` for the same
LPIC-1 `mk711` selection, retaining robots, origin, spacing and timeout policy.
The normal bounded retry sequence exhausted on **HTTP 500** before any page
body was returned to extraction. A second diagnostic with retries disabled
confirmed **robots HTTP 200, selected course HTTP 500**. No parser or API
validation stage was reached, so this failure does not demonstrate an
extraction defect. No alternative course, catalog discovery or backend
submission was performed during the investigation.

The remaining task 5.2 is blocked by the selected provider endpoint's server
error. No implementation fix or access-policy bypass is justified by this
response. The original worker's partial journal correctly retains the accepted
paid course and the failed free selection. All previously recorded offline and
isolated real-API checks remain valid; live free acceptance and same-checkpoint
live resume remain incomplete. Retry the same explicit selection after the
provider recovers, using a new isolated test database/journal because the prior
acceptance destination was temporary and has been removed.

### Owner-authorized completion with LPIC-1 deferred — October 10, 2026

The owner explicitly requested skipping the failed LPIC-1 course, retaining a
TODO and continuing. Task 5.2 and the change design now reflect that acceptance
scope. The actual worker still reports failed selections honestly; no automatic
error suppression or modification of the original partial journal was added.

`bun apps/utils/tests/worker-live.ts` now selects only the same paid Python
`mk346` course. On the final run, source observation time was
`2026-10-10T10:43:26.768Z`, course `maktabkhooneh:10465`, snapshot
`18077bbf-68f7-4343-8830-af24c413951f`. One observation was accepted with the
same FULL/CONTENT prices recorded above and honest partial section coverage.
Its hosted WebP fetched successfully. Same-checkpoint resume completed with
exit zero and history remained exactly one snapshot; observation time and
snapshot identity were unchanged. No LPIC-1 request or discovery occurred.

Private evidence journal: `apps/utils/output/live-EPz4mp/paid.json`. The isolated
test database/assets were removed afterward; existing application data was
unaffected. The journal is retained diagnostic evidence, not resumable against
that removed temporary destination.

Final workspace lint/typecheck, 95 utility tests, strict OpenSpec validation
and whitespace checks passed. Previously recorded API tests/build and isolated
worker integration remain valid. The existing frontend production Bun/CommonJS
limitation remains. Live free-course acceptance is still unverified and tracked
in the `Plan.md` TODO; it was not represented as a passed check.

### Free-course regression fix and live acceptance — October 10, 2026

Chrome confirmed that the previously selected LPIC-1 slug
`/course/آموزش-رایگان-آزمون-LPIC1-mk711/` still shows the provider's server
error. Following the provider's Linux listing opened the current URL
`/course/آموزش-رایگان-آزمون-lpic1-1555-mk711/`, which displays free enrollment.
A robots-aware scraper request to that current URL returned valid source data:
provider ID `1555`, slug ID `711`, type `MAKTAB`, disabled full/content sale
flags and zero price slots. Before the fix, v3 collection succeeded but emitted
unknown/null pricing because extraction recognized only `FREE`.

The provider's public course rendering asset `/_nuxt/eX17ZAdj.js` corroborated
`MAKTAB` free enrollment. Parser 3.1.1 now recognizes that type alongside legacy
`FREE`, preserves type evidence, rejects conflicting enabled positive prices,
and keeps unrelated disabled/ambiguous zeros unknown. A reduced real Nuxt
fixture retains only course identity, pricing, published duration and state;
unrelated sections, reviews and user state are omitted. The regression tests
failed on unknown pricing before the fix and passed afterward for both native
v3 and the shared legacy v2 extraction path.

Validation:

- `bun run test:utils`: 96 passed, zero failed.
- `bun run lint` and `bun run typecheck`: passed across all workspaces.
- `bun run build:api`: passed.
- `bun run build`: frontend compilation and TypeScript passed; page-data
  collection still fails with the previously documented Bun 1.3.8 CommonJS
  function-wrapper error for `/_not-found`.
- `bun apps/utils/tests/worker-live.ts`: passed with exactly paid Python
  `mk346` and current free LPIC-1 `mk711`, no discovery, in an isolated temporary
  PostgreSQL database/backend/assets. Both observations were accepted once,
  both hosted WebP thumbnails were fetched with verified byte sizes, and
  same-checkpoint resume retained one history entry per course.
- Free LPIC-1 observed at `2026-10-10T20:01:48.119Z` as
  `maktabkhooneh:1555`, with a zero-amount free offer, `MAKTAB` type evidence,
  complete pricing coverage and ready thumbnail. Paid prices remained
  1,169,550 toman FULL and 719,550 toman CONTENT.

Private checkpoint: `apps/utils/output/live-9EeTd5/paid-free.json` (ignored).
Its temporary database and assets were removed; it cannot resume against that
removed destination. Existing development records/checkpoints were unchanged.
The stale URL is not automatically resolved or retried through an alternative
route; operators should select the current provider-linked URL. This fixes the
pricing regression and completes the previously deferred live free acceptance;
it does not establish full-catalog coverage.

## Homepage public course integration — October 11, 2026

Acceptance scope: the owner explicitly narrowed browser review to the homepage course section on October 11. Other frontend regions remain unchanged and broader review is deferred. No owner course/group records were created, edited or removed for acceptance.

- Chrome desktop (1440px) and iPhone SE emulation (375×667): inspected hosted thumbnails, long Persian titles and the mixed `Retention & Engagement` title, Persian digits/Jalali source dates, discounted/unknown prices, and card actions. No unintended horizontal overflow appeared in the reviewed course section or detail dialog. Maktabkhooneh’s existing local mark now appears beside its name using the shared card logo sizing; unknown providers retain their names without a guessed mark.
- Existing development catalog: 99 eligible courses, 18 per initial page, six pages. Chrome advanced to page two with updated courses and focus moved to the results heading. Searching «پیش‌بینی» found three courses including a page-two match and reset paging; `Retention` found one mixed-title course. Free-only returned zero honestly (the development samples contain paid/unknown offers); clearing restored 99. The programming category returned zero with the explanation that membership follows published backend editorial groups.
- Real detail fetched current facts and offers with explicit missing certificate/access/support fields. Chrome followed its source link into a new provider tab at the retained URL. Escape restored the originating card button focus; Tab visibly focused the source action. React development effect replay initially dismissed the dialog; removing cleanup-driven close fixed it. StrictMode DOM regression tests now exercise this lifecycle, as well as 404/error/retry, newer observations, cancellation and focus restoration.
- Initial server-rendered cards were verified in returned HTML. Stopping the API produced a safe same-origin 503 and a homepage course-only retry state while the page remained HTTP 200; restarting restored the 99-course response. Controlled web tests verify subsequent query failure/retry, stale-response cancellation, neutral image placeholders and malformed-response rejection. No fixture fallback is used.
- Results/status loading and errors use live status semantics and `aria-busy`; keyboard focus was reviewed in Chrome. This is not a full assistive-technology audit. Browser control intermittently reported unavailable windows/stale app state; completed observations above were obtained after reconnecting.
- Default API configuration and launcher `--api-port 3013` both served the same 99-course catalog through the web origin. The server-only import guard rejected a temporary client import; the temporary check was removed. Local Swagger executed the list request successfully against an isolated synthetic ready course.

Final checks:

- `bun run lint` and `bun run typecheck`: passed across the workspace. Web lint/types also passed after the provider-mark fix.
- `bun test packages/core/tests apps/web/tests`: 11 passed, zero failed, 125 assertions. Happy DOM has no CSS layout, so Next Image emits fill-parent layout warnings there; actual card sizing was inspected in Chrome.
- `bun run test:api`: 32 passed, 18 database integration tests skipped, zero failed.
- `API_INTEGRATION=1 bun run test:api`: 50 passed, zero failed, 535 assertions against isolated PostgreSQL schemas/storage; cleanup completed.
- `bun run build:api`: passed (353 bundled modules).
- `bun run build`: compilation and TypeScript passed; page-data collection failed for `/design-system` with the existing Bun 1.3.8 error `Expected CommonJS module to have a function wrapper`. Production build acceptance remains limited by this documented runtime issue.
- RTL detector: components (27 files) and homepage CSS, zero errors/warnings. `bash -n run.sh` and `git diff --check` passed.
- Final diff: course-only opt-in, separate real detail/card components, browser-safe contracts, public API/proxies and configuration/docs. Shared card headings reserve two title lines to align neighboring provider rows; fixture data, hero styles and group implementations retain their existing content. The broader browser comparison was removed from this change’s remaining acceptance at the owner’s request.

Known limits: full eligible candidates are searched in memory for the small local catalog; offsets can shift during concurrent ingestion; source facts and prices retain their observation date. Some source descriptions contain literal encoded HTML entities; they are rendered as text, never injected as HTML. No new collection, AI analysis, group migration or production deployment is included.

### Archive and commit verification — October 11, 2026

All 20 tasks are complete; `connect-homepage-courses` is archived with both contracts synced to main specs. Fresh commit checks passed: workspace lint/typecheck, 11 shared/web tests (125 assertions), 96 utility tests, 50 API tests including isolated PostgreSQL integration (535 assertions), API build, all ten main specs under strict validation, RTL detector (components/homepage CSS), launcher syntax and whitespace checks. The initial sandboxed web run could not bind its temporary loopback server; the same suite passed with local access. Frontend production compilation and TypeScript passed, then page-data collection failed for `/groups/[id]` with the established Bun CommonJS function-wrapper error. This commit pass did not repeat the browser acceptance recorded above.

## Homepage card refinement — October 11, 2026

Implemented instructor summaries, scoped pale-blue «مشاهده دوره» actions, natural-height clamped titles, aligned provider/footer layout and price-associated observation-date tooltips. The date describes retained source information, not current provider pricing. Details retain their visible date/source caveat and noninteractive price renderer.

- `bun test apps/web/tests`: 12 passed, 154 assertions. The sandboxed run could not bind the deadline test's temporary loopback server; the same suite passed with local access. The final focused UI rerun passed all eight tests (112 assertions). Happy DOM emits existing Next Image zero-layout warnings; it does not verify CSS geometry.
- Workspace `bun run lint` and `bun run typecheck`: passed after correcting the new interaction fixture's Happy DOM event-target typing.
- `bun run build`: compilation and TypeScript passed; page-data collection for `/design-system` failed with the existing Bun CommonJS function-wrapper error. No production build acceptance is claimed.
- RTL detector: both touched component/style files passed with zero errors/warnings. Whitespace checks and strict validation of `refine-homepage-course-cards` passed.
- Chrome retry completed browser acceptance at 320px, 390px and 1280px using an isolated temporary route with explicitly synthetic courses, without modifying catalog records. Compared the supplied preview at mobile and desktop widths. Short titles use one line; long Persian/Latin titles clamp to two lines; instructor summaries ellipsize with Persian remaining-name counts. DOM measurements at 1280px confirmed a 4px title/instructor gap, 44px action height and 72px footer height across all six real cards, with no horizontal overflow.
- Free, discounted, subscription and unknown price tooltips showed distinct per-course Jalali dates. Edge-card tooltips remained inside the viewport at the reviewed widths, above the price, while thumbnails retained clipped corners and cards allowed visible tooltip overflow. Hover opening and pointer transfer onto the tooltip worked. Mobile emulation verified tap opening, second-tap and outside dismissal; keyboard focus opening, blur and Escape dismissal worked, with Escape retaining price focus and no immediate reopening.
- The real details action opened the existing dialog with the full long title and all four instructors; Escape closed it and returned focus to the originating action. Sample-card and shared outlined-button appearance remained unchanged in mobile/desktop review. Backend-off thumbnail failures in the synthetic route were expected; image-service acceptance was outside this change. The temporary route was removed and its preview server stopped after review. Tasks 1.2, 2.3 and 3.2 are now verified.

Implementation and browser acceptance made no new branch, commits, merges, collection or backend changes. The owner subsequently authorized sync, archive and a scoped commit on the existing branch. The change is archived at `openspec/changes/archive/2026-10-11-refine-homepage-course-cards/`; all five delta requirement blocks match the main homepage catalog spec, and all ten main specs pass strict validation.
