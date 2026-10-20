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

Generated provider exports/dashboard snapshots stay ignored under `apps/utils/output/`; they are not part of the commit. The dashboard has since been retired; those saved files remain preserved. See [utility usage](../apps/utils/README.md).

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

## Remaining-provider migration foundation — October 12, 2026

At the foundation checkpoint, tasks 1.1–1.4 of `migrate-remaining-providers-v3` were implemented. All 123 utility
tests, utility lint/type checking and `git diff --check` pass. Checks include
native rich/sparse validation, async supplementary enrichment/failure/denial/
cancellation, each new-provider CLI identity and recovery, saved-limit conflicts,
lost-response/crash replay and image-only resume. Existing Maktabkhooneh native,
legacy, CLI and journal tests ran unchanged. No live collection/browser acceptance
had been attempted at that checkpoint; final acceptance is recorded below.

Workspace lint/type checking and the API production build also pass. The web
build compiles and passes TypeScript, then fails during page-data collection with
the already documented Bun 1.3.8 `Expected CommonJS module to have a function
wrapper` error (this run reports `/icon.svg`). The lockfile is unchanged.

Owner clarification resolves task 1.5: keep the pure `aggregateCourses` helper
for the unchanged Maktabkhooneh test, remove its executable CLI, dashboard commands,
HTTP server and browser assets. Existing local output/data is preserved. See the
[foundation interface](../apps/utils/README.md#shared-migration-interface-foundation).

## Remaining-provider migration acceptance — October 12, 2026

`migrate-remaining-providers-v3` completes native v3-only TopLearn/Sabzlearn/Roocket collection, controlled supplementary feedback, configured 10-page/500-item defaults, durable settings/recovery, new explicit ingestion commands and dashboard/aggregation CLI retirement. The owner approved retaining the pure aggregation helper used by the protected Maktabkhooneh regression. Maktabkhooneh command definitions, collector/legacy adapter, converter, fixtures/tests and local outputs are unchanged. No dependencies or lockfile edits, database/schema changes, fixture insertion, editorial assignment, automatic collection or AI were added.

- `bun run test:utils`: 134 passed, zero failed; unchanged Maktabkhooneh native/legacy/CLI/journal recovery checks included. Provider focused counts: TopLearn 20, Sabzlearn 13, Roocket 20. Large-curriculum/feedback tests preserve independent facts with explicit evidence/payload limits.
- `bun test packages/core/tests apps/web/tests`: 15 passed, 197 assertions. Local loopback access was required by the deadline test; expected Happy DOM zero-layout Next Image warnings do not establish browser geometry.
- `bun run test:api`: 32 passed, 18 database integration tests skipped by default, zero failed. No API implementation changed; actual ingestion/thumbnail/public reads additionally exercised the existing local API/database.
- Workspace `bun run lint` and `bun run typecheck`: passed. `bun run build:api`: passed (353 bundled modules).
- `bun run build`: compilation and TypeScript passed; page-data collection failed for `/icon.svg` with the existing Bun 1.3.8 `Expected CommonJS module to have a function wrapper` error. Full production web build success is not claimed.
- Strict OpenSpec validation, `git diff --check` and RTL detector on both changed public-course components (zero errors/warnings): passed. Migrated collectors construct native v3 sections without v2 records/conversion. Retired scripts are absent, new CLI help works, protected scripts and lockfile match HEAD.

All six actual representative courses (paid/free per provider) have accepted snapshots, ready hosted WebP images (HTTP 200), and matching management/current public identities. Exact URLs, submission/snapshot IDs, ordered contents, instructors, prices, feedback counts and source gaps are in the [TopLearn](provider-audits/toplearn.md), [Sabzlearn](provider-audits/sabzlearn.md) and [Roocket](provider-audits/roocket.md) audits. Fresh checkpoints created fresh IDs; coordinator repeated all three completed refresh/refined resumes, with no recollection/new acceptance or duplicate history. Checkpoints and reports remain private/ignored.

Provider agents and coordinator checked the actual homepage `#courses` cards/details at desktop and Chrome responsive 390×844, Persian RTL/mixed Latin wrapping, paid/free offers, instructors, source links, ordered contents, Enter opening, initial close focus, Tab/source link, Escape closing and focus return. Coordinator reproduced combined unfiltered discovery and detail opening for all three providers, including free Roocket desktop detail. Native Chrome interference/blank captures were recovered using a fresh local tab; no workaround or frontend redesign was added.

Authentic Sabzlearn/Roocket assets and existing map entries are added with attribution. Temporarily moving both assets produced HTTP 404, confirmed in Chrome Network; provider names, real cards and actions remained present. Assets were restored. The owner additionally requested whole-minute duration display: cards/details now use one Persian formatter rounding to nearest whole minute (682.123→۶۸۲, 1200.5→۱٬۲۰۱, zero→۰, null remains «مدت ثبت نشده»). Real Roocket cards and paid detail show rounded values; stored observations retain exact source numbers. Only these requested display edits and logos affect frontend code.

Known source gaps remain explicit: TopLearn's disclosed comments route returns unrecognized/404 HTML, so feedback is unknown; Sabzlearn’s raw score lacks evidenced scale/vote count, so aggregate rating is unknown; mixed thread totals never become feedback/rating totals. Roocket’s explicit rating/votes remain separate from bounded anonymous comments. Limits, ordinary failures and question/reply/staff exclusions never imply complete coverage. No full-catalog crawl, branch or push occurred. The owner subsequently requested spec sync, archival and a commit. Both behavior contracts are synced and verified, all ten main specs pass strict validation, and the change is [archived](../openspec/changes/archive/2026-10-12-migrate-remaining-providers-v3/).

Commit verification on October 12 reran workspace lint/type checking, 134 utility tests, 15 core/web tests (with local loopback access), 32 API tests (18 integration tests skipped by default), API production build and both changed-component RTL checks successfully. The web production build compiled and passed TypeScript, then hit the same Bun CommonJS runtime error during `/groups/[id]` page-data collection. Existing live/browser evidence above was reviewed; no new provider run was started for this commit.

## Course-group administration — October 16, 2026

`add-course-group-admin` implements the local Persian group panel, immutable system
suggestions, pair-level versioned review, provenance/history, explicit publication
and manual membership overrides. Rejection persists until explicit reopening, as
approved by the owner at implementation start. Authentication, runtime AI judging,
production deployment and public fixture-group replacement remain deferred.

| Check | Result |
| --- | --- |
| Shared/API/web focused tests | Passed: contracts, replay/error/OpenAPI routes, Origin/Host authority checks, fixed forwarding paths, response/input bounds, timeout, safe errors, retained input, uncertain-create reconciliation, review refresh/conflicts and transport-free showcase interactions. The combined relevant suite had 34 passes plus one sandbox socket-listen failure; rerunning the affected existing HTTP deadline file with socket access passed all four tests. Subsequent changed-contract/UI focused runs pass. |
| Isolated PostgreSQL | Passed: ten focused migration/catalog/suggestion/public-catalog tests across four files. Three updated suggestion tests also pass after strengthening concurrent-first-submission, approval rollback after membership insertion, simultaneous review conflict, manual/submission concurrency and separate-pool reconnection assertions. Additive migration reruns preserve legacy assignments/publication and seed manual provenance without fabricated suggestions/confidence. |
| Local database preservation | Migration applied explicitly after capturing ordered hashes of courses, groups, memberships and snapshots. Hashes were identical afterward; acceptance used a separate temporary schema, without publishing or changing the existing seven drafts. Cleanup preservation is recorded below. |
| Integrated local browser flow | Passed in Codex in-app browser using temporary records: empty Persian draft creation, three attributed submissions ordered 94/94/72, approvals, publication with one member still ineligible, two-member eligibility, manual override with manual provenance, management-only course inspection, and a second tab's stale approval rejected after the first tab's rejection. Filtered navigation finds a draft beyond the first unfiltered page. |
| Temporary HTTP smoke | Passed: exact/conflicting replay, approved-pair reject conflict, rejected-pair approval conflict, explicit reopening, rejection, manual removal/re-add, retained history, unpublish/republish and public eligibility. No AI provider/job was used. |
| Persian/RTL/accessibility | Detector: seven admin component files, four admin route files and the changed design-system page report zero errors/warnings. Desktop (1280px) and mobile (390px) checks cover long Persian titles, mixed Latin IDs/names, Persian confidence/numerals, Jalali dates, labelled controls and visible keyboard focus. Mobile page width was 375px at a 390px viewport; inspection dialog width 324px. Escape closes the dialog and returns focus. Showcase mobile width is 341px with no page overflow; keyboard focus remains visible on its review buttons. |
| Browser fixes | Real browser acceptance exposed Next dev's internal URL host mismatch: mutation checks now compare Origin with the request Host authority/protocol, with foreign/missing Origin still rejected. The list also normalizes empty native-form filters before its initial query; forms preserve draft inputs across background refreshes. |
| Lint / types / API build | `bun run lint`, `bun run typecheck`, `bun run build:api` pass. The loopback launcher passes `bash -n run.sh`. |
| Web production build | `bun run build` compiles and passes TypeScript, then fails during page-data collection with the existing Bun 1.3.8 `Expected CommonJS module to have a function wrapper` error (this run reports `/api/admin/courses/[courseId]`). This is not a successful production build; browser acceptance uses development mode. |
| Scope | No dependency or lockfile changes, live collection, AI execution, authentication, commit, push, branch or publication of existing drafts. Management search currently scans the small retained reference/group set within one repeatable-read transaction before pagination, matching the existing public search approach; SQL search indexing can be selected separately if needed. |

Screenshots of the temporary acceptance state were captured at
`/tmp/dorob-admin-desktop.jpg`, `/tmp/dorob-admin-mobile.jpg` and
`/tmp/dorob-admin-showcase-mobile.jpg`; they are local temporary evidence rather
than committed catalog assets. Browser automation was performed through the
available in-app browser; Chrome was unavailable in this session.

Acceptance cleanup completed: the temporary schema was removed and the original
courses/groups/memberships/snapshots fingerprints still matched. The normal
`./run.sh` launcher was then started for owner review against the preserved catalog,
with both app listeners on loopback. Strict OpenSpec validation and `git diff --check`
pass. The change is now archived with its three behavior contracts synced; owner
product review remains separate, and the production build limitation is still open.

Normal-catalog readback shows exactly seven preserved draft groups with their
original member counts (17 memberships total). The running owner-review panel is
[local administration](http://127.0.0.1:3000/admin/groups).

Admin dropdown spacing refinement — October 16: native selects now use a shared
chevron inset 16px from the logical end edge, with room reserved for text and a
native-appearance fallback in forced-colors mode. The local panel was visually
checked; RTL detector, workspace lint and type checking pass. The production build
again compiles/types successfully and hits the existing Bun CommonJS page-data
error (this run at `/_not-found`). No catalog records were changed.

Admin state-color refinement — October 16: shared gold/blue/green/slate state badges,
icons, eligibility indicators, restrained list-row accents, review tabs and approval
buttons now give publication/review states distinct visual treatments. Existing
success/warning surface colors are exposed as shared semantic tokens. The showcase
includes draft, published-but-ineligible and eligible examples alongside all review
states; equal-specificity badge overrides were corrected after visual inspection.
Desktop (1280px) and mobile (390px) browser checks pass, with no horizontal page
overflow at 390px and visible keyboard focus. Existing four admin UI tests, workspace
lint/types and the RTL detector pass. Production compilation/types pass, followed by
the unchanged Bun CommonJS page-data blocker at `/api/admin/courses/[courseId]`.
No memberships/publication flags were changed. Preview: `/tmp/dorob-state-showcase.jpg`.

Group detail visual refinement — October 16: membership removal/unpublishing now
use a shared red danger button with explicit icons, pale-red idle and solid-red hover
states, backed by semantic danger tokens. A status overview, colored shared section
headings, green-accented member cards and a separate publication area clarify the
editing/curation hierarchy. The showcase demonstrates enabled/disabled danger buttons
with local sample-only interaction and the shared member heading. Existing four admin
UI tests, workspace lint/types and RTL checks pass. Read-only browser inspection of
the A1 group at desktop/mobile widths confirms red removal buttons, visible keyboard
focus and no horizontal overflow at 390px; its two memberships and draft state were
not changed. Production compilation/types pass; the existing Bun CommonJS page-data
error remains (this run at `/api/admin/courses`). Screenshot:
`/tmp/dorob-group-detail-actions.jpg`.

Commit verification — October 16: workspace lint/type checking, API production
build, launcher syntax and the RTL detector pass. The shared/web/API suite reports
57 passes, 21 opt-in integration skips and one sandbox loopback-listen failure;
the affected HTTP deadline file passes all four tests when local socket access is
allowed. The ten focused PostgreSQL migration/catalog/suggestion/public-catalog
tests pass using isolated temporary schemas. All 12 main specs pass strict
validation and every archived delta is verified against its main spec. The web
production build compiles, then Bun 1.3.8 crashes with a segmentation fault during
the TypeScript stage; standalone workspace type checking passes. Production build
completion remains blocked. The owner authorized this commit; no push is requested.

## Thumbnail association recovery — October 16, 2026

Owner-requested recovery repaired the empty homepage without re-ingestion. Before
repair, all 1,495 references remained stored, but current thumbnails were 1,493
`asset_unavailable`, one `download_failed`, and one `input_limit`. The unavailable
rows were timestamped October 12, 12:17:39–40 UTC; the original triggering process
has not been established.

The October 12 11:59:28 UTC backup was checksum-verified and restored into a separate
`dorob_thumbnail_recovery_20261016` database. It retained 1,713 ready historical
snapshot associations. All 1,489 retained image files matched their recorded SHA-256
and byte size. A fresh full current-database backup was taken before repair:
`apps/api/storage/backups/before-thumbnail-recovery-20261016.dump`, SHA-256
`90b1cecc3c3c8eb517df20d70f726a59fcdfb0be024bc33156dd30b0d37eefa1`.
Its archive listing is readable. Both backups remain ignored local recovery assets.

The API was stopped before a locked transaction restored only failed
`asset_unavailable` rows with matching snapshot/course identities, request/fact hashes,
and existing asset identity/hash/key/size. Exactly 1,493 rows were repaired. Sorted
full-row fingerprints of every other public table matched before/after, including
courses, observations, groups, memberships, suggestions, review history, migration
ledger, assets and uploads. No publication/curation or source data was rolled back.
The verification record is retained beside the backups as
`thumbnail-recovery-20261016.verification.json`.

After normal launcher restart, both `/api/v1/courses?limit=1` on the API and
`/api/courses?limit=1` on the web app return HTTP 200, total 1,493 and one item.
A restored hosted image returns HTTP 200 `image/webp`. Browser readback shows
1,493 courses and populated cards/images, including retained pagination. The two
pre-existing download/input failures remain unchanged. The temporary recovery
database was removed after verification; the backups are retained. No application
code was changed for this operational recovery and no live image downloads occurred.

## Embedding laboratory — October 16, 2026

`add-local-embedding-suggestions` implements the separate `apps/embedding-lab`
workspace and explicit commands. No production API/admin source, database schema,
Compose or `run.sh` changes are included. The lockfile adds only the local workspace
and references already installed dependency versions. Nothing was committed,
branched or pushed.

- Focused lab tests: **25 pass, 0 fail**. Coverage includes immutable/checksummed
  storage, symlinks/traversal, corrupted records, interrupted temporary files,
  stale/live locks, feedback replay/history, paginated capture/rechecks, incomplete
  selection, input normalization/UTF-8 bounds/negation, cache reuse, model failures,
  bounded chunked responses, exact matching, overlap/bridge coherence, suppression,
  centroid/member distinction, run reuse/concurrency/cancellation, comparison,
  evidence integrity/reimport and local Host/Origin isolation.
- `bun run lint:lab`, `bun run typecheck:lab`, `bun run build:lab` pass. The built
  lab starts independently on loopback, without main service startup or inference.
  Initial dependency linking needed sandbox escalation for Bun's temporary-directory
  access; installation used the local cache, with no package-version changes.
- Existing `bun run lint` and `bun run typecheck` pass. `bun run build` compiles and
  completes TypeScript, then fails during page-data collection with the existing
  Bun 1.3.8 `Expected CommonJS module to have a function wrapper` error. The standalone
  lab production build does not use Next and passes.
- RTL detector on the three lab UI files: **0 errors, 0 warnings**. Built browser
  inspection covered 1280px desktop, 390px and 320px mobile, long Persian source
  titles/descriptions, Latin URLs/hashes, Jalali dates, visible keyboard focus,
  inspector focus and return, group result filtering, overlap links and comparison
  details. Main content had no unintended horizontal overflow; local scope lists
  and saved-run shelves scroll within their own bounds.
- Real browser flows inspected matching/source/input provenance, 15 overlapping
  tighter-discovery sets, source text as React text, optional manual title,
  uncertain feedback persistence and comparison of the two real discovery runs.
  Feedback notes explicitly identify agent persistence demonstrations, not owner
  suitability approval. Reviewed-sample determinate denominators remain zero.
- Full-dataset matching with only 70 selected-demo vectors fails explicitly on
  missing vectors without inference. Missing model/runtime and digest/dimension
  failures are tested with fake transports; cached experiments require no transport.
  Opening reimported results does not contact either application API or Ollama.
- Real cancellation was checked in an independent reimport store. A bounded first
  generation completed six additional course vectors plus 19 group vectors before
  cancellation was attempted. A second six-course generation was immediately
  cancelled through the workbench. Its attempt is `cancelled`, the earlier 25 valid
  vectors remain, all three imported completed runs and both review events remain,
  and no cancelled attempt creates a completed run. Main demonstration evidence
  remains separate with its original 70 vectors.
- Real capture, model digest, 51-course/19-group sample, one matching and two
  discovery runs, weak matches, overlap/member changes and validated three-run
  export/reimport are recorded in [the walkthrough](embedding-lab.md).
  All 1,495 source observations were captured without drift/failures; the owner's
  test group was excluded by ID. No catalog mutation client exists in the lab.
- A seeded **synthetic** 10,000-course/100-group/1,024-dimension capacity test
  completed on Apple M4 / 16 GiB / Bun 1.3.8: matching 11.863 s, discovery 35.437 s,
  peak native process RSS 133,267,456 bytes (~127.1 MiB), k=20, candidate cap=10,000,
  all seeds covered. It makes no real-catalog quality claim. `/usr/bin/time -l`
  reported 47.49 s wall time but its remaining instrumentation was denied access
  to `kern.clockrate`; no independent external peak-RSS result is claimed.
- Strict OpenSpec validation and final whitespace/scope checks pass. Evidence,
  benchmark reports, datasets and vectors remain ignored under lab `output/`.

Software acceptance is separate from owner model-quality review. Loose similarity
produces clear scope errors and broad ambiguous reconciliation; no precision,
recall, calibrated confidence, production policy or integration approval is claimed.
Authentication/deployment, generative judging/naming, automatic submission,
pgvector and scheduling remain outside this change.

## Catalog embedding integration — October 17, 2026

All 24 OpenSpec tasks are implemented and verified. The earlier custom-build
missing-clang failure was resolved by the owner's selected bundled pgvector image.
Migrations 004–006 are active. All 18 original data-table fingerprints match the
restore-tested backup; 1,495 courses, 20 groups, 17 memberships, review history and
the protected group are preserved.

- Real PostgreSQL API suite: 63 passed, zero failures/skips, 678 assertions.
- Core/engine/worker/frontend/utility suites: 181 passed, zero failures, 445 assertions.
  An initial sandbox run could not open the frontend test's loopback listener;
  the authorized local-network rerun passed without source changes.
- Workspace lint/type checking, engine lint/types/build, worker lint/types/build
  and API production build pass. Source and built CLI help do no work.
- Final built worker over actual HTTP reuses all four real vectors with the model
  endpoint deliberately unavailable; 36 embedding endpoint paths appear in Swagger.
- Isolated real BGE-M3 generation, reuse, retained forced revisions, matching,
  discovery, cancellation/resume, candidate review, one draft/all-member suggestions,
  idempotent delivery and ordinary approval/rejection/stale withholding pass.
- Preferred-policy synthetic capacity: 10,000 courses/100 groups/1024 dimensions,
  210.019 seconds end to end, peak combined backend/worker RSS 403.92 MiB.
  Actual HTTP, pgvector storage, suppression/reconciliation and delivery are included;
  synthetic inference is not model throughput or catalog-quality evidence.
- Original migrations 001–003 and frontend source remain unchanged; application
  code imports no lab runtime or evidence. No daemon, worker Compose service,
  scheduled/startup inference, real[] fallback or approximate index is introduced.
- Strict OpenSpec change validation and documentation link/scope checks pass.

`bun run build` compiles and typechecks, then retains the existing Bun CommonJS
page-data error (`Expected CommonJS module to have a function wrapper`) for
`/_not-found`. This frontend production limitation remains unresolved and separate
from the backend/worker builds. Existing UI confidence wording is also retained;
exact raw score semantics are documented without a calibrated-quality claim.
See [workflow](catalog-embeddings.md), [actual results and artifacts](embedding-results.md)
and [backup recovery](pgvector-migration.md). No commit, deployment or publication
was performed.

## Bundled pgvector image migration — October 17, 2026

Completed the owner-authorized move to upstream `pgvector/pgvector:0.8.7-pg17-bookworm`
with pinned manifest digest. Actual ARM64 server: PostgreSQL 17.11, pgvector 0.8.7.
Complete backups of both databases and roles restored into a separate fresh volume.
Both schemas and all 19 user-table fingerprints matched before cutover. After
migration 004 and normal restart, all 18 data-table fingerprints still match; the
migration ledger has its expected fourth row. Preserved: 1,495 courses, 20 groups,
17 memberships, original test schema, protected group and all source/review facts.
Original Alpine volume remains retained; hosted image files are unchanged.

Real PostgreSQL API suite: 55 pass, zero skip/fail, 587 assertions. API lint,
typecheck and build pass; Compose validation and health/restart pass. Temporary
vector(1024) storage/cosine smoke passes. Actual HTTP readiness/course/group reads
return 200 with 1,493 eligible public courses and 20 management groups. Check process
stopped afterward. No inference, placement or publication occurred.

Image download stalled, then a retry had a TLS handshake timeout; pulling by the
verified digest succeeded. Migration without standalone DATABASE_URL failed safely;
the explicit documented local connection succeeded. These issues are resolved.
Exact image pin, archive checksums, isolated/schema fingerprints, local metadata,
known adopted-volume label warning and recovery limits are in the
[migration report](pgvector-migration.md). The earlier missing-clang custom-build
failure no longer blocks database migration. Frontend production build retains
its previously documented Bun CommonJS limitation; no frontend changes were made.


## Embedding worker startup diagnostics — October 17, 2026

After an owner run exposed a generic connection error, model/backend transport
failures now name the service, configured origin and recovery action. Ollama
connection failures explicitly recommend `ollama serve`; backend connection
failures recommend `./run.sh`. Timeouts, Ollama HTTP failures and malformed
responses are distinguished without printing upstream response bodies. Explicit
cancellation keeps its original signal. Both human and JSON executable output
are tested against an unavailable model endpoint. Worker suite: seven tests pass
(36 assertions), including three diagnostics tests; worker lint/types/build pass.

## Embedding archive and commit verification — October 17, 2026

Both embedding changes are archived with 44/44 tasks complete. All seven delta
capabilities were verified against the synced main specs, preserving existing
purposes and unrelated requirements. All 16 main specs pass strict validation;
OpenSpec lists no active changes.

The final verification passed 63 API tests (678 assertions) with real PostgreSQL
and 209 lab/engine/core/worker/frontend/utility tests (559 assertions), in separate
processes. A combined-process run caused a thumbnail HTTP test to return 422
instead of 413 after browser tests changed globals; the documented standalone API
suite passes without source changes. The initial sandbox-only run could not bind
the frontend deadline test's loopback socket; the local-access rerun passes.
Workspace and lab/worker/engine lint and type checks pass. API, lab, worker and
engine production builds pass. The lab RTL detector reports zero errors/warnings.
The frontend production build still fails collecting `/_not-found` page data with
the previously documented Bun CommonJS wrapper error after compilation/type checks.
No application source changed during this archive/commit review. Generated output,
local evidence and database backups remain ignored; no push is authorized.
# Discovered group review — October 17, 2026

- Recovery contracts: `bun test packages/core/tests/embeddings.test.ts`: 8 pass,
  57 assertions. Isolated PostgreSQL acceptance: 2 pass, 26 assertions.
- Transport and existing admin transport: 5 pass, 90 assertions. Shared discovery
  components: 2 pass, 15 assertions. API type checking passes.
- `/design-system` inspected in the in-app Chromium browser at 1280×900 and
  360×800. Long Persian titles, Latin provider/IDs, missing fields, distinct
  textual statuses, Persian decimal scores and a Jalali date render correctly.
  At 360px the document width is exactly 360px (no horizontal overflow).
  Keyboard Tab from approval reaches dismissal with a visible 3px primary outline.
  The reduced-motion media rule disables transitions/animation; no ambient motion
  is introduced. This verifies the rule, not OS-level motion preference switching.
  Local screenshot evidence: `/private/tmp/dorob-discovery-review/specimens-mobile.png`
  and `/private/tmp/dorob-discovery-review/specimens-desktop.png` (not committed).
- RTL detector: discovery components, showcase and CSS each pass with zero findings.
  Final panel verification and full application checks are recorded below.

Final acceptance for discovered-group review:

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web, utils and API; no warnings |
| `bun run typecheck` | Pass: web, utils and API |
| `bun apps/web/node_modules/typescript/bin/tsc -p apps/web/tsconfig.integration.json` | Pass: isolated browser/API fixture, ES2023 server scope |
| `bun test packages/core/tests apps/web/tests` | 47 pass, 0 fail, 483 assertions |
| `API_INTEGRATION=1 bun test apps/web/acceptance/discovery-review.test.tsx` | 1 pass, 0 fail, 21 assertions |
| `API_INTEGRATION=1 bun run test:api` | 63 pass, 0 fail, 685 assertions |
| `bun run build:api` | Pass; both API and raster-worker entry points bundled |
| `bun run build` | Compilation and TypeScript pass; production page-data collection fails with the existing Bun CommonJS wrapper error |
| `openspec validate add-discovered-group-review --strict` | Pass |

The current web build error is `Expected CommonJS module to have a function
wrapper` while loading `next/dist/compiled/next-server/app-page-turbo.runtime.prod.js`;
the final attempt reports failure collecting page data for
`/api/admin/embeddings/configurations/[id]`. Production output is therefore not
reported as successful. Earlier test type errors were corrected; they are not the
remaining build failure. The existing Happy DOM tests for public-card `fill`
images emit CSS-size warnings in their layout-free environment; all assertions pass.

Database acceptance uses disposable, uniquely named schemas and drops them in
`finally`. It exercises real repositories/Elysia through the same-origin transport
and mounted browser components: saved results, approval without group/membership,
one draft despite a lost response, reload readback, explicit delivery, cumulative
counts and the group-management link. Membership remains zero and publication false;
the operation count stays at the single fixture operation. No real editorial
records or installed-model inference are touched. Existing inbox/provenance and
migration-preservation regressions pass. PostgreSQL and local-socket tests required
execution outside the network sandbox; no dependency installation was needed.

Final visual acceptance: `/admin/discoveries` and `/design-system` were reviewed at
1280×900 and 360×800 using Chromium. The real panel's four selected course images
loaded through `/api/thumbnails/:id`, with no source URL forwarding. Queue covers,
compact course metadata and Persian provider names replace repeated technical text.
Optional notes, experimental scores, readable pairwise evidence, comparisons,
overlap, history and technical IDs remain inspectable through disclosures. Both
mobile pages have document width exactly 360px. Browser back/forward preserves the
candidate URL; mobile return restores focus to the selected queue link. Tab reaches
the decision controls with a visible 3px primary outline. Exact Persian decimal
samples `۰٫۸۲۳۴۵` / `۰٫۷۰۱۲۳`, Jalali dates and isolated Latin identifiers were
verified. Reduced-motion styling disables animation/transitions (OS preference
switching was not exercised). Shared thumbnail/compact/full/status/busy/disabled/
missing/evidence and group-field variants have production-export specimens.

Screenshot evidence (local, not committed):
`/private/tmp/dorob-discovery-review/panel-desktop.png`,
`/private/tmp/dorob-discovery-review/panel-mobile.png`,
`/private/tmp/dorob-discovery-review/specimens-desktop.png`,
`/private/tmp/dorob-discovery-review/specimens-mobile.png`.
The final RTL detector scans every touched web source file (31 files), with zero
errors or warnings. Local administration remains unauthenticated and loopback-only;
no browser generation, automatic membership or publication is introduced.

### Run-wide discovery sorting extension — October 17, 2026

The completed change has 23 tasks, including shared allowlisted `id`, `similarity`
and `course-count` contracts, SQL ordering before pagination, browser URL state,
and the shared `DiscoverySortControl` specimen. Existing omitted-sort ID order
is preserved; highest mean and most-course choices use descending numeric values
with ascending candidate ID ties. Retained/suppressed and run filters apply first.
Unknown/repeated sort values are rejected from the original query string, including
at the API boundary (the framework otherwise normalizes duplicate query keys).
No migration, inference, discovery-algorithm or editorial-record changes occur.

Final extension checks:

- `bun run lint`: pass for web, utils and API, no warnings.
- `bun run typecheck`: pass for web, utils and API.
- Separate `tsconfig.integration.json` type checking: pass.
- `bun test packages/core/tests apps/web/tests`: 50 pass, 0 fail, 519 assertions.
- `API_INTEGRATION=1 bun run test:api`: 64 pass, 0 fail, 714 assertions.
- `API_INTEGRATION=1 bun test apps/web/acceptance/discovery-review.test.tsx`:
  1 pass, 0 fail, 21 assertions; existing promotion/recovery flow remains valid.
- `bun run build:api`: pass; both entry points bundled.
- `bun run build`: compilation and TypeScript pass; existing Bun CommonJS-wrapper
  failure during page-data collection remains, reported this time for
  `/api/admin/courses/[courseId]`. No successful production output is claimed.
- Strict OpenSpec validation and whitespace checks pass.
- RTL detector: all five touched web implementation files pass with zero findings.

Isolated database fixtures cover both sorts across multiple pages, stable score/count
ties, default compatibility, another run, retained/suppressed separation, malformed
queries and unchanged records. Frontend tests cover forwarding/validation, first-page
and candidate reset on sorting, candidate-link persistence, type/history/reload
state and isolated no-network showcase interactions. New sorting uses a fixed SQL
expression allowlist, preserving response guards, no-store and existing boundaries.

Chromium acceptance at 1280×900 and 360×800 verifies both options, 13-course
collections at the front of course-count order, selection reset, reload, browser
back/forward and keyboard focus. Tab from the select reaches the queue with a
visible 3px primary outline. The 360px document remains exactly 360px wide in both
the panel and showcase. The isolated specimen updates its local order caption.
Only saved-result browsing was performed against real records; mutations remain
confined to disposable test schemas. Local screenshot evidence (not committed):
`/private/tmp/dorob-discovery-review/sorting-desktop.png`,
`/private/tmp/dorob-discovery-review/sorting-mobile.png`,
`/private/tmp/dorob-discovery-review/sorting-showcase-mobile.png`.


### Discovery review archive and commit checks — October 18, 2026

`add-discovered-group-review` is archived under
`openspec/changes/archive/2026-10-18-add-discovered-group-review/` with all 23 tasks
complete. All ten added requirements were verified against the administration and
discovery main specs, preserving existing requirements and Purpose sections.
Strict validation passed for all 16 main specs, the selected change before its
move, and all 13 archived changes afterward.

Pre-commit checks passed: root lint and type checking, the separate web integration
type check, 50 web/core tests (519 assertions), 64 API tests with PostgreSQL
integration (714 assertions), one isolated browser/API acceptance test (21
assertions), and the API production build. Local-socket and PostgreSQL tests passed
outside the network sandbox; their disposable schemas were cleaned up. The initial
sandboxed web/core run could not bind its local test server.

The frontend production build again compiled and passed TypeScript, then failed
collecting page data for `/api/admin/embeddings/discoveries/[id]/promotion` with
the existing Bun error `Expected CommonJS module to have a function wrapper`.
A preliminary attempt overlapped route-type generation and encountered a generated
`.next/types` directory cleanup error; the sequential retry reached the documented
Bun failure above. No successful frontend production build is claimed. Existing
Happy DOM image-layout warnings persist; all assertions pass. Prior desktop/mobile,
keyboard and mixed-direction visual acceptance remains recorded above; this
archive/commit step does not change UI behavior.


### Python group page refinement — October 18, 2026

Root `bun run lint`, `bun run typecheck`, the route RTL detector (zero errors or
warnings), and `git diff --check` passed during the page refinement. Production
compilation and build TypeScript passed; page-data collection again failed with
Bun's existing `Expected CommonJS module to have a function wrapper` error.

The in-app browser verified the final desktop layout, balanced red/green panels,
removed labels/metadata/disclosures, automatic slideshow advancement, next-slide
navigation and clickable dot selection. Earlier iterations were inspected at
667px; the final desktop view was inspected at 1063px. Final phone-width,
reduced-motion, touch and full screen-reader acceptance were not rerun. Hover/focus
pause, hidden-tab/reduced-motion guards, touch-visible arrows and RTL keyboard
navigation are implemented; no production AI or course-order calculation is added.


### Python assessment badge previews — October 18, 2026

Root lint and type checking, the route/global CSS RTL detector (zero findings),
and diff checks passed. In-app desktop screenshots confirmed the rose filled-heart
popular badge and amber wallet expensive badge on their assigned mock courses.
No new badge eligibility calculation or backend integration is claimed. The final
pre-commit build compiled and passed TypeScript, then failed collecting
`/_not-found` with the existing Bun CommonJS function-wrapper error.

## Course-group judgment backend — October 18, 2026

`add-course-group-judgments` is implemented with browser-safe schemas/examples,
revision-bound retained evidence, immutable storage, seven local management
operations and Swagger examples. Verification uses synthetic observations and
explicitly isolated PostgreSQL schemas; no judge, provider requests or live
collection are required.

| Check | Result |
| --- | --- |
| `bun run lint` | Pass: web, utilities and API |
| `bun run typecheck` | Pass: web route generation/types, utilities and API, including shared core imports |
| `bun run test:api` | Pass: 43 tests, 34 intentional integration skips, 0 failures; 659 assertions across 27 files |
| `API_INTEGRATION=1 bun run test:api` | Pass: 77 tests, 0 failures; 1,112 assertions across 27 files, 25.56 seconds |
| `bun run build:api` | Pass: 372 modules bundled; API and raster-worker entry points |
| `openspec validate add-course-group-judgments --strict` | Pass |
| `openspec validate --all --strict` | Pass: active change plus all 16 main specs (17 items) |
| Final scope/diff review | Backend, shared contracts, synthetic examples, tests, tracking and documentation only; no frontend, dependency or lockfile changes. `git diff --check` passes. |

New boundary tests reject missing/extra/forbidden properties, invalid versions,
null arrays, repeated/unknown tags, duplicate/noncanonical courses, blank/oversized
text, controls and HTML/Markdown. Latin technical labels and Persian/ZWNJ prose
remain valid. Both decoded JSON bytes and streaming bodies over 8 MiB return 413
before repository work. Swagger examples validate against shared and runtime
schemas; all seven method/path operations have request/response contracts.
The historical suggestion Swagger assertion now checks coexistence with separate
judgment routes instead of requiring their absence.

Source tests preserve null/missing/failed coverage, all saved offers, hostile text
as data and the original observation. Explicit recursive projection excludes raw
HTML sections, providerData, feedback identities/locators and ingestion diagnostics.
Comments-only and mixed feedback, null versus empty items, partial collection and
135 retained items verify all-page traversal without extra text truncation.

PostgreSQL tests cover additive migration/rerun, foreign keys, hash/object checks,
immutable UPDATE/DELETE rejection, transaction rollback, 106-member paging,
reference-only members and opaque Unicode/slash IDs. Definition, reference,
membership and price/comment-only snapshot dependencies affect revision validity.
Concurrent identical submissions retain one winner; sorted object keys replay,
array-order and cross-group key changes conflict, accepted retries still recover
after refresh or loss of minimum membership. Fresh database connections preserve
exact content and manifests; equal-time history ties use ascending IDs.

HTTP-to-PostgreSQL acceptance discovers a draft, traverses one revision, submits an
expensive-first result, replays it, refreshes feedback, rejects a stale new submit
and retrieves stale immutable history. Full row fingerprints of all existing
catalog tables and existing public responses match before/after judgment acceptance.
Safe missing/stale/invalid/oversized/unavailable responses and no-store reads pass.
Local database access initially hit sandbox socket restrictions; the completed
integration runs used authorized local access and cleaned their disposable schemas.

The working catalog was not migrated or populated by this change. Migration 007
remains available through the normal explicit migration command. No model runs,
frontend/public judgment rendering, approval/publication or deployment were added.
The existing unrelated frontend production-build limitation remains documented;
this backend-only change was verified with its production API build. No commit,
branch, push or archive was performed.

### Judgment spec sync and archive — October 19, 2026

All 14 added requirements and every scenario were compared verbatim with the new
`openspec/specs/course-group-judgments/spec.md`. Its Purpose is copied verbatim
from the delta, with canonical main-spec headings and no delta-operation headers.
`openspec validate --specs --strict` passed all 17 main specs; strict validation
of the completed change passed before archival. All artifacts and 20/20 tasks
were complete. The change is archived at
`openspec/changes/archive/2026-10-19-add-course-group-judgments/`, preserving
`.openspec.yaml`. Documentation links/status were updated. No application code,
working database, commit, branch or push was changed by this archival operation.

### Judgment pre-commit verification — October 19, 2026

After explicit commit authorization, Plan, README and affected documentation were
reviewed and updated for the archived backend standard and explicit migration
boundary. Fresh `bun run lint`, `bun run typecheck`, `bun run build:api` and
`openspec validate --specs --strict` all passed. The fresh full
`API_INTEGRATION=1 bun run test:api` run passed 77 tests, zero failures and
1,112 assertions across 27 files in 26.58 seconds, using disposable local
PostgreSQL schemas. All 17 main specs passed. No required check was unavailable.
A trailing space in the archived design artifact was removed during diff review.
No working-catalog migration, model run, frontend change or publication is included.

### AI judge guide and local migration — October 19, 2026

The standalone `docs/ai-judge.md` role prompt was checked against the current
shared judgment contracts and route definitions. Its synthetic request passes
`parseJudgmentSubmission`, preserving an expensive-first order and a course with
empty weaknesses. Checks cover all four tag labels, all five hero field limits
and all seven judge operations. Manual protocol review covered complete member
and feedback pagination, reference-only members, stale revisions, lost-response
exact replay, key conflicts and stale readback. Persian copy guidance and examples
were reviewed for concrete learner consequences, natural topic/level hero text,
honest abstention and the absence of forced criticism or missing-data page copy.
Local Markdown link targets and whitespace checks pass.

The owner's trial produced ten saved requests covering 26 distinct courses.
All ten passed the shared validator and matched their saved revision/member sets.
Every course had two or three strengths; ten had supported weaknesses. This is a
bounded review of saved outputs, not a factual quality certification. Initial
delivery returned the generic 503 message because migration 007 had not been
applied; no successful receipt was confirmed in that trial's recovery report.
Private trial evidence and requests remain outside Git under
`/private/tmp/dorob-judge-20261019/`.

The owner then explicitly authorized the reviewed additive migration. A full
custom-format PostgreSQL backup was saved at
`apps/api/storage/backups/judgments-20261019/before-007.dump` (23,014,610 bytes;
SHA-256 `ea3b69e34dc5229f73a7ae9761241e26e6edec610f41e87dc2ad0f41262e0caa`).
Its archive listing was verified readable; a restore test was not performed in
this operation. `bun run db:migrate` applied migration 007. Before/after row counts
and content fingerprints matched for all 30 pre-existing data tables. The new
empty judgment table, history index and immutability trigger were verified;
the pending group's history GET returned an empty successful response.
No pending judgment was replayed by this migration operation. Backup and local
verification files remain ignored.

All 11 guide tasks are complete. Strict change validation and all 17 main-spec
validations passed before archiving to
`openspec/changes/archive/2026-10-19-add-ai-judge-guide/`. There are no delta specs
to sync (`skip_specs: true`). Pre-commit checks review the staged documentation
and archive only. Application lint, type checking and builds are not applicable
to these Markdown-only changes; no application source or dependencies changed.

## Public judged-group integration — October 19, 2026

`connect-public-group-judgments` connects the homepage and canonical group pages to
retained current judgments and current provider observations. No working-catalog
publication, membership, source or judgment submission was performed by this change.
No schema migration is required.

- Shared/query validation, safe web boundaries, route/metadata/redirect behavior,
  actual facts and assessments, empty bullets, image fallback, gallery keyboard/timer
  pauses and superseded-request guards have focused automated coverage.
- Full PostgreSQL/API acceptance: `API_INTEGRATION=1 bun run test:api` passed
  **80 tests**, including the new isolated group comparison acceptance. Tests use
  temporary isolated schemas, real local image storage and synthetic observations.
  They cover eligibility-before-paging, draft/small/unjudged groups, sources and
  membership/reference changes, publish-after-judge staleness, older matching
  revisions beyond 100 history rows, stable timestamp ties, pinned-page conflicts,
  expensive-first ordering, optional ratings, pricing states, private-field exclusion
  and absence of thumbnail invalidation writes. The final focused repository/routes
  rerun passed **3 tests / 72 assertions** after batching/projection refinements.
- `bun test packages/core/tests apps/web/tests` passed **59 tests / 615 assertions**
  in the final run. Separate route acceptance passed **1 test / 11 assertions**. The route acceptance file lives
  under `apps/web/acceptance/group-page.test.tsx` and can run separately with
  `bun test apps/web/acceptance/group-page.test.tsx`, avoiding existing global
  `next/navigation` mocks in discovery tests.
- Default `bun run test:api`, root lint and root type checking pass. The API
  production bundle builds. Strict OpenSpec validation and whitespace checks pass.
  The RTL detector reports zero errors/warnings on all changed product UI files.
- `bun run build` compiles and completes TypeScript checking, then fails collecting
  page data for `/_not-found` with Bun 1.3.8's previously documented
  `Expected CommonJS module to have a function wrapper` error. Production startup
  is therefore not verified; this is still the existing runtime limitation.
- Initial sandboxed loopback tests could not open sockets. The same tests passed
  with approved local-network execution; no installation or VPN was needed.
  DOM-only image tests emit the existing Next Image layout warnings because
  happy-dom does not load CSS; actual browser images were verified independently.

Read-only live acceptance found **eight** eligible groups: English A1 (2 courses),
Excel (2), n8n (3), negotiation (2), Photoshop (2), PowerPoint (5), Python
visualization (3), and starting Python (3). Every public hero and assessment array
was compared to its selected private judgment, every course snapshot to its retained
manifest, and provider/title/source URL/image/instructors/duration/price/offers to
public course readback. Every canonical group page server-rendered its expected
hero and course identities. This count is an observation, not a fixed expectation.

Browser review verified the eight homepage cards and Python card-to-page navigation.
The Python page preserves Sabzlearn → Roocket → Maktabkhooneh order, retains the
expensive first result and omits the last course's empty weakness section. At 320px,
390px and 1280px the document width matches the viewport, with no horizontal
scroll overflow. Hosted images load; Persian/Latin titles, localized Jalali dates,
provider ratings/scales and four tags remain legible. Keyboard gallery focus has a
visible outline; RTL arrow navigation changes the selected slide. A limit=1 course
page preserves the selected judgment in next-page links, displays absolute rank 2
for Roocket, and back/forward restores the appropriate course page. Automated
checks additionally cover reduced motion and focus/hidden-tab slideshow guards.

Limits: eligibility scans are appropriate to the local catalog, not a production
scale claim. Any current snapshot or publication change can hide a group until
explicit rejudging. A missing member asset hides the entire comparison without
mutating thumbnail associations. Files can disappear after eligibility checks;
client fallbacks remain necessary. Already rendered pages retain their data until
refresh/navigation. Structural judgment acceptance is not editorial certification.

## Public judged-group pre-commit verification — October 20, 2026

Owner-authorized commit review covers the public judged-group API, shared contracts,
homepage/group integration, focused tests, synced main specs and completed archive.
README fixture descriptions were reconciled with the delivered real-group behavior;
Plan and catalog documentation record the current selection and archive boundaries.

- `bun run lint` and `bun run typecheck` pass.
- `bun test packages/core/tests apps/web/tests`: 59 passed, 615 assertions.
- `bun test apps/web/acceptance/group-page.test.tsx`: 1 passed, 11 assertions.
- Default `bun run test:api`: 45 passed, 35 integration tests skipped, 673 assertions.
- `API_INTEGRATION=1 bun run test:api`: 80 passed, 1,184 assertions, using temporary
  isolated PostgreSQL schemas and local image fixtures with cleanup.
- `bun run build:api` passes. `bun run build` compiles and checks TypeScript, then
  fails collecting `/_not-found` page data with the existing Bun 1.3.8
  `Expected CommonJS module to have a function wrapper` limitation; production
  startup remains unverified.
- RTL detector: zero errors/warnings across all nine changed product UI files.
  Browser acceptance at 320px, 390px and desktop remains the October 19 evidence
  above; this commit review does not claim a new visual browser pass.
- All 18 main specs pass strict OpenSpec validation. Both delta capabilities match
  their main specs; the six change files were archived unchanged, including metadata.
  No active OpenSpec changes remain.

The first sandboxed core/web run could not open its loopback deadline-test server;
the local-network rerun passed. Existing happy-dom Next Image layout warnings remain.
No working-catalog publication, inference, migrations or source changes were performed.
