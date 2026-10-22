# Dorob utilities

Reusable server-side TypeScript tools, run locally with Bun. Native v3 collectors and explicitly invoked ingestion commands support Maktabkhooneh, TopLearn, Sabzlearn and Roocket. Maktabkhooneh also retains its unchanged export-only v2 command. No command runs automatically or rewrites frontend fixtures.

Browse the [documentation hub](../../docs/index.md) and [current validation](../../docs/validation.md). Phase 3 includes local ingestion and the existing homepage public catalog.

Read [how the scraper works](../../docs/provider-adapters.md#maktabkhooneh) for a short overview.

[Course data format](../../docs/course-data-format.md) defines the common output. Only the retained `scrape:maktabkhooneh` export command emits version 2. All four programmatic collectors and ingestion commands emit version 3; the migrated providers have no v2 adapter. Version-1 export checkpoints cannot be resumed; freshly export without `--resume` and choose a new output path to retain old files.

## Additional provider adapters

The `migrate-remaining-providers-v3` implementation and bounded acceptance are complete. Each migrated provider passed native v3 tests, actual paid/free ingestion, hosted WebP/public identity checks, duplicate-free checkpoint resume and desktop/mobile keyboard acceptance. Final combined checks: 134 utility tests, workspace lint/types, 15 core/web tests and API build pass. API tests: 32 pass, 18 database integration tests skipped by the default command. Web compilation/types pass, but page-data collection retains the documented Bun CommonJS function-wrapper error. Dashboard/aggregation commands are retired; the owner approved retaining the pure aggregation helper for the unchanged Maktabkhooneh regression test. Existing local output/data is preserved.

### Shared migration interface (foundation)

`scrapers/native-v3.ts` supplies `nativeObservation(input)` (strict validation of
native v3 sections), `section(data, status, reason)`, `evidenceTree(value, path,
locator, evidence)`, `SectionData<K>`, and the `Offers`, `Education`, `Curriculum`
and `Feedback` aliases. It creates no v2 records and imports no conversion code.
`anonymizeReviewText` and `reviewContentId` provide anonymous text/contact
redaction and content identity without author identifiers.

`FeedbackSettings` contains `feedbackPages` and `feedbackItems`;
`feedbackSettings(partial)` defaults to 10/500 and rejects nonpositive or unsafe
integers and item limits above the existing 2,000-item API bound.
`FeedbackAccumulator(settings)` exposes `canRead()`,
`addPage(items, hasMore, excluded = 0)`, `fail(reason)` and
`result(publishedCount = null)`. Providers decode sources, exclude questions,
replies/staff and supply evidenced next-page URLs. Embedded pages count toward
the page limit. Duplicate IDs retain source order; omissions, limits and failures
keep coverage partial/unknown. Aggregate rating/vote counts remain independent.
Field evidence is bounded at 4,000 entries; exceeding that bound fails rather
than silently truncating. Final native observations must also fit the existing
payload/evidence limits. Ordinary optional failures may preserve other sections;
access denial and cancellation must propagate.

`BaseScraper.extract(body, sourceUrl, checkedAt, submissionId)` now accepts
`CourseIngestion | Promise<CourseIngestion>`. Use protected `request(url)` or
`originClient(origin).request(url)` for enrichment, preserving robots, redirects,
rate/size/time limits, retries and cancellation per origin. The base awaits and
validates extraction and verifies provider/extractor identity. Existing synchronous
subclasses remain supported.

`ingest-provider.ts` exports `main(provider, args, dependencies)` and
`execute(provider, args, dependencies)`. A `ProviderDefinition` contains
`providerId: "toplearn" | "sabzlearn" | "roocket"` and
`create(options: FeedbackSettings & { signal; onRetry }): Collector`.
Thin provider executables invoke `execute` and set `process.exitCode`.
The shared CLI adds `--feedback-pages`/`--feedback-items` to URL/limit/all,
checkpoint/resume/backend, human/JSON and help options. Private journals persist
effective limits; omitted resume flags restore them, conflicting flags or v2
exports fail before collector/backend construction or checkpoint mutation.
Saved-observation replay keeps exact IDs; image-only resume does not enrich facts.
Maktabkhooneh's entry point is untouched and old journals need no new settings.

The coordinator owns shared helpers, worker/CLI/journal/reporter and their tests,
package registration, shared docs, task status and any permitted logo assets.
Provider agents own only their scraper, thin entry point, retired export entry
point, prefixed tests/fixtures and `docs/provider-audits/<provider>.md`. They must
request shared changes, preserve Maktabkhooneh and frontend files, and must not
delegate further. Delegation waits for foundation tasks 1.1–1.6 to pass.
The coordinator supplies the local API/database/web services and serializes
browser/live acceptance slots; offline provider tests may run concurrently.
Use private provider-specific journals and one active worker per provider/backend.
Browser acceptance requires real accepted ready snapshots, existing homepage
search/pagination with category/free filters cleared, mobile/desktop layouts,
details and keyboard focus; fixtures/API-only checks cannot substitute for it.

```sh
bun run ingest:toplearn --limit 2 --checkpoint apps/utils/output/toplearn-run.json
bun run ingest:sabzlearn --limit 2 --checkpoint apps/utils/output/sabzlearn-run.json
bun run ingest:roocket --limit 2 --checkpoint apps/utils/output/roocket-run.json
bun run ingest:sabzlearn --checkpoint apps/utils/output/sabzlearn-run.json --resume
```

Use `--help` for each command. Repeat `--url URL` to select source courses,
`--limit N` for bounded discovery (default ten) or `--all` for explicit full
bounded traversal. These selection modes are exclusive. The local API/database
must be running with existing migrations applied; `--backend-url` or
`DOROB_BACKEND_URL` chooses its origin. `--feedback-pages N` and
`--feedback-items N` default to 10/500. Limits, exclusions and optional failures
remain explicit; rating votes and published/collected comment counts are separate.
Ordinary supplementary failures preserve independent facts, while denial and
cancellation stop collection. `--json` produces one machine report; default
stdout is a human summary and progress/diagnostics use stderr.

Private journals are ignored under `apps/utils/output/`. New runs require new
files. Resume restores saved selection/settings, replays exact observation IDs
and retries only unresolved delivery/images. Conflicting settings, provider or
backend and legacy exports are rejected before network/mutation. Completed
observations do not recollect; improving partial source facts requires a fresh
checkpoint. Existing exports and journals are not converted or removed.

```ts
import { SabzlearnScraper } from "@dorob/utils/sabzlearn";
const scraper = new SabzlearnScraper({ signal: abortController.signal });
for await (const result of scraper.scrapeCourses(await scraper.discoverCourses())) {
  if (result.observation) await deliverObservation(result.observation);
  else await recordFailure(result.sourceUrl, result.error);
}
// Prefer ScraperWorker for durable observation delivery and image processing.
```

`ToplearnScraper` and `RoocketScraper` use the corresponding package exports.
Keep server-only collectors/evidence out of browser bundles. No AI, scheduling
or editorial group assignment is included. Paid/free samples, source limitations
and field-by-field evidence are recorded in
[TopLearn](../../docs/provider-audits/toplearn.md),
[Sabzlearn](../../docs/provider-audits/sabzlearn.md) and
[Roocket](../../docs/provider-audits/roocket.md) audits for field coverage, live snapshot identities and browser evidence.

Provider-specific mappings, observations, and limitations: [TopLearn](../../docs/provider-adapters.md#toplearn), [Sabzlearn](../../docs/provider-adapters.md#sabzlearn), [Roocket](../../docs/provider-adapters.md#roocket). The [implementation plan](../../docs/provider-adapters.md#provider-selection-and-implementation-groundwork) records the selection and agent rules. Quera was excluded at the owner's request; Faradars was deferred after public access/detail-page assessment. Unknown price units or conflicting purchase amounts leave normalized amounts null. Explicit matching purchase labels can outweigh generic SEO currency; course-scoped structured currency can establish the display unit when amounts match. Raw observations and discrepancy warnings remain available. These adapters need broader sampling before deployment.

## Run the scraper

From the repository root:

```sh
# Discover the catalog, then fetch ten courses.
bun run scrape:maktabkhooneh

# A smaller test run.
bun run scrape:maktabkhooneh --limit 2

# Export the full catalog; this can take hours at the default request rate.
bun run scrape:maktabkhooneh --all

# Continue the same interrupted run, skipping already saved courses.
bun run scrape:maktabkhooneh --all --resume

# Choose an output file or a specific public course (repeat --url as needed).
bun run scrape:maktabkhooneh --url 'https://maktabkhooneh.org/course/آموزش-برنامه-نویسی-با-پایتون-مقدماتی-mk346/' --output /tmp/course.json

bun run --cwd apps/utils lint
bun run test:utils
bun run typecheck:utils
```

The default output is `apps/utils/output/maktabkhooneh.json`, ignored by Git. Each course is saved immediately through an atomic file replacement. The file includes run status, selected URLs, successful courses, and errors. Exit code 1 means a partial export or a fatal error. Ctrl+C saves progress once discovery has finished. Resume requires the same selected URLs and output path; omit `--resume` to refresh previously collected facts. Use separate output paths for concurrent runs.

## Use from the backend

```ts
import { MaktabkhoonehScraper } from "@dorob/utils/maktabkhooneh";

const scraper = new MaktabkhoonehScraper();
const urls = await scraper.discoverCourses();
for await (const result of scraper.scrapeCourses(urls)) {
  // Explicitly deliver result.observation (v3), or record result.error for retry.
  // Prefer ScraperWorker for durable delivery and thumbnail processing.
}
```

Methods: `initialize()` loads robots rules; `discoverCourses()` reads course sitemaps; `fetchCoursePage(url)` fetches public HTML; `scrapeCourse(url)` extracts one course; `scrapeCourses(urls)` streams successes and failures. Pure `parseCoursePage`, `decodeNuxtPayload`, `parseSitemap`, and `parseRobots` functions support offline testing. Options include request delay, timeout, response-size limit, up to three retries, cancellation, and an injectable HTTP client.

## Extraction and limits

- Discovery uses the published sitemap, avoiding disallowed search pages. Requests are sequential with at least 1.5 seconds between starts, or a longer robots crawl delay. Transient errors retry with increasing delays and respect `Retry-After`; 401/403 stops collection.
- The parser reads `__NUXT_DATA__` JSON without executing JavaScript. It extracts descriptions, prerequisites, teachers, offers, ratings/counts, and ordered chapter/lesson titles. Anonymous public course feedback is retained when identifiable; source-labeled reviews and unverified comments remain distinct. Reviewer identities, video files, and private endpoints are excluded.
- Only enabled full/content offers are included. Disabled zero slots and upgrade-only offers are excluded. The provider’s current `MAKTAB` type and legacy `FREE` type explicitly identify free access. Prices use the toman convention verified during the mock collection; enabled zero amounts require an explicit free-course type before being treated as free; original source amounts are retained. Currency/display drift still needs operator review.
- Content duration and study effort remain separate; missing fields are null. Source HTML for descriptions and chapter/lesson effort labels are retained under `raw` for evidence; render the plain-text fields, not untrusted source HTML. Signed image links are preserved but not downloaded or checked for expiry.
- Unknown Nuxt wrappers, missing required fields, and invalid prices fail extraction rather than inventing data. Source timestamps, field paths, adapter version, and a fact hash accompany each course.
- This is an ingestion building block. Scheduling, database upserts, stale-data presentation, alerts, backup/recovery, and course-removal decisions belong to the backend. The CLI only checkpoints collection; it does not delete courses or claim failed data is current. A full export does not start scheduled refreshes.

Tests use a reduced public-page fixture collected October 1, 2026, with no reviewer data. The fixture retains selected metadata, short description excerpts, and two chapters. Additional synthetic cases exercise price handling and failures. Provider access terms and ongoing operational suitability must be reviewed before deploying scheduled ingestion.

## Historical checkpoint validation — October 3, 2026

All 40 offline tests, utility lint/type checking, and the four CLI help commands pass. The package exports TypeScript source and has no separate build step. No fresh live collection was performed for this checkpoint. Those checkpoint limitations were subsequently addressed in bounded samples below; deployment still requires broader provider-template sampling.

## Version-2 assessment evidence — October 3, 2026

The shortened [golden format](../../docs/course-data-format.md) defines reviews/comments with anonymous text, individual ratings/dates when explicit, exact source locators, sample coverage/selection, and syllabus completeness. Additional nullable fields preserve published audience, technologies, educational practice/feedback/support, chapter/lesson descriptions, and offer access/support. Scrapers still return `derived: null`; ranking and AI assessment are separate later work.

Feedback is an initial public-page sample, not a full review crawl. A course comment does not establish enrollment or satisfaction. Questions/replies are excluded when identifiable, identities/contact details are redacted, and unverified totals remain unknown. Missing fields and unavailable feedback stay null. The source hash includes substantive feedback and evidence coverage changes, while routine timestamps and collection progress are excluded.

| Provider | Feedback available in inspected public page |
| --- | --- |
| Maktabkhooneh | Six anonymous source-labeled reviews in the verified Python sample; published text-review total and more-page indicator preserved. |
| Sabzlearn | Four anonymous top-level comments retained from 12 candidates in the Python sample; explicitly unverified comments, further pages available, total scope unknown. |
| TopLearn | Inspected feedback loads separately; the script-disclosed comments route returns provider 404 pages, so items remain unknown. Course-attached JSON-LD review support is tested synthetically. |
| Roocket | A bounded first-page sample from the script-disclosed public comments API; anonymous unverified comments, with questions/replies/known staff excluded and pagination coverage preserved. |

Final migration checks: all **62 utility tests**, workspace lint/type checking, and whitespace checks pass. Production compilation/types pass, but page-data collection still fails with the existing Bun CommonJS runtime bug. No full-catalog crawl or commit was performed.

## Retired local dashboard

`dashboard:data` and `dashboard:aggregate`, the HTTP dashboard and its browser
assets are retired. The owner approved retaining the pure `aggregateCourses`
helper solely because the protected Maktabkhooneh regression test imports it.
The helper has no executable CLI or import-time work. Existing ignored local
exports, aggregate snapshots and private journals remain untouched. Historical
sampling and browser evidence are retained in `docs/project-history.md`.

## Explicit saved-v2 ingestion conversion

`bun run convert:courses --input SAVED_V2.json --output NEW_V3.json` reads a saved
export and writes validated v3 `submissions`; `--help` prints usage. It makes no
network requests and never submits or imports records automatically. Existing
outputs and the input path cannot be overwritten. Nullable facts, source
locators, selected raw evidence and unknown coverage survive conversion;
missing or ambiguous evidence requires review. See the [v3 mapping and
contract](../../docs/course-data-format.md#additive-v3-ingestion-mapping).

## Maktabkhooneh programmatic v3 migration

`MaktabkhoonehScraper` from `@dorob/utils/maktabkhooneh` now extends
`BaseScraper`: `scrapeCourse(url)` returns `CourseIngestion` v3 and
`scrapeCourses(urls)` yields `{ sourceUrl, observation, error }`.
Native observations have fresh submission IDs, canonical provider identity and
section coverage from embedded source inspection. Pricing/cover/description
can be evidenced complete; educational/curriculum/feedback sections retain
partial or unknown coverage. Invalid optional curriculum records a failed
section; invalid required identity or pricing fails collection. Anonymous
feedback remains a bounded page sample.

`LegacyMaktabkhoonehScraper` is the explicit v2 compatibility adapter over
the same parser and controlled transport. `bun run scrape:maktabkhooneh --help`
and its existing URL/limit/all/output/resume workflow stay export-only,
without backend requests. Saved-v2 conversion still uses
`bun run convert:courses --input SAVED_V2.json --output NEW_V3.json`, with
unknown coverage and deterministic IDs for replay. The dashboard is retired;
TopLearn, Sabzlearn and Roocket are native v3-only. Do not pass worker journals as v2
export checkpoints.

## Private worker checkpoints and crash locks

Worker journals are versioned private JSON files under ignored `apps/utils/output/`.
New runs require a new file. Atomic publication/replacement and a `.lock` file
protect each journal; resume validates the whole journal and matching provider,
extractor, selections and backend before network activity or mutation. V2
exports cannot be resumed here. Keep checkpoints while delivery or images are
pending; they contain immutable source evidence and are not committed.

After a crash, inspect `CHECKPOINT.json.lock` for its PID/start time and confirm
that process is gone and no worker uses that checkpoint. Only then manually
remove that specific lock and resume. Never remove a live writer's lock. Old
`.tmp` files may be removed after that same check. There is no automatic lock
stealing. Retain or delete completed journals according to local data policy.

## Explicit worker state and operational ordering

The worker runs sequentially: collect → atomically save immutable observation →
submit → atomically save backend receipt → process that exact snapshot's
thumbnail → atomically save image state. Saved observations bypass collection
on resume; a lost receipt is recovered by replaying the exact payload and ID.
Accepted selections resume only unresolved image processing. New refreshes use
a new checkpoint and fresh IDs even for unchanged facts.

Collection errors remain retryable; access denial/cancellation stops new work.
Transient backend exhaustion leaves delivery pending and stops further fetching.
409/422 ingestion errors remain terminal and actionable; resume never silently
changes their payload/ID. Image errors retain accepted facts and retry only on
explicit resume. Ready images and intentional missing input skip processing.
Reports separate collection, new acceptance, replay, pending/failed delivery and
image states, with observed timestamps and returned course/snapshot IDs.
Partial, pending and interrupted runs exit nonzero. Missing input alone is
successful, with presentation readiness false. Attempt history survives success
while resolved error state clears.

Operate only one active run per provider/backend and finish pending delivery
before starting fresh refreshes. The checkpoint lock protects one file, not
cross-checkpoint or distributed ordering. Current backend detail follows latest
acceptance: delivering an older saved observation later can make it current.
Checkpoints contain source evidence; retain pending journals, keep files private,
and explicitly clean completed journals. After a crash, inspect the `.lock`
PID/start time and confirm its owner has stopped before manually removing that
specific lock. No automatic stealing or deletion occurs.

## Explicit v3 collection and delivery

Use `bun run ingest:maktabkhooneh --help` for the explicitly invoked worker.
Example: `bun run ingest:maktabkhooneh --limit 2 --checkpoint apps/utils/output/reference-run.json`.
Resume with `bun run ingest:maktabkhooneh --checkpoint apps/utils/output/reference-run.json --resume`.
Use repeatable `--url` instead of discovery, or explicitly select `--all`; these
flags cannot be combined with each other or `--limit`. The default discovery
limit is ten and `--backend-url`/`DOROB_BACKEND_URL` selects the local backend
(default `http://127.0.0.1:3001`). Every fresh refresh needs a new journal.
Accepted facts and hosted-image readiness remain distinct from editorial
publication. Frontend fixtures remain separate; the three provider migrations use the same
worker lifecycle. Scheduling and AI remain deferred. Startup/migrations never invoke the worker.
See root README and validation for setup and acceptance results.

October 10 owner-requested dev runs saved ten initial courses, then accepted 99
of 100 selections (89 new records, ten refreshes). All 99 thumbnails were ready
and fetched through the API. Of the accepted courses, 95 had paid offers and
four had unknown pricing. The explicitly included known free LPIC-1 `mk711`
page returned HTTP 500 before extraction. Keep that collection failure distinct
from parser/validation or delivery errors; it does not establish a general
free-course defect. Journals, diagnostics and reports remain private ignored
output, with the partial checkpoint retained for an explicit later resume.

### Free-course regression fix — October 10, 2026

Parser 3.1.1 supports the current public `MAKTAB` free-course type alongside legacy `FREE`. Disabled or ambiguous zeros without either type remain unknown, and enabled positive prices conflicting with a free type fail extraction. The reduced real LPIC-1 fixture omits unrelated sections and user state.

The former LPIC-1 slug returns HTTP 500; use the provider-linked current URL `https://maktabkhooneh.org/course/آموزش-رایگان-آزمون-lpic1-1555-mk711/`. `bun apps/utils/tests/worker-live.ts` now verifies exactly paid Python and free LPIC-1 in an isolated temporary database, including thumbnail retrieval and checkpoint resume without duplicate history. That check passed; existing dev records and checkpoints were not migrated.

## Ingestion CLI output

The ingestion CLI prints bounded human progress and a compact completion summary
by default. Progress and stage failures go to stderr; the summary goes to stdout.
Use `--json` to keep stdout machine-readable: it contains one existing full
worker report, while human diagnostics stay on stderr. Startup failures in JSON
mode produce one safe `{ "error": { "code": "missing_checkpoint", "message": "…" }, "exitCode": 1 }`
document. For pending delivery or retryable collection/image work, the summary
includes a shell-quoted resume command with checkpoint and backend destination.
Terminal delivery rejections require operator review.

Illustrative human output for a first-delivery failure (not a live-run result):

```text
Ingestion interrupted; 12s elapsed.
Selected 1000; collected 1; accepted new 0; replayed 0.
Collection failed 0; delivery pending 1; terminal delivery failed 0; image processing failed 0.
Images: 0 ready, 0 missing input, 0 pending, 0 failed, 1000 unstarted.
Unattempted selections: 999.
Stop reason (transport): Unknown transport failure; check destination availability and connectivity. The exact connection cause is not known.
Unresolved: delivery/transport 1.
Saved checkpoint: …/apps/utils/output/pending.json
Resume uses saved observations and receipts; only unresolved work is retried.
Resume: bun run ingest:maktabkhooneh --checkpoint '…/apps/utils/output/pending.json' --backend-url 'http://127.0.0.1:3001' --resume
```

The actual resume command includes the full checkpoint path, quoted for the
shell even when it contains spaces/apostrophes. Control characters in checkpoint
paths are rejected. Discovery/init errors without a confirmed saved journal
never claim saved progress or invent a resume command. Lock/configuration errors
need review; no lock or saved work is automatically removed. Use `--json` for
scripts consuming the former default per-selection report. `--help` alone prints
usage; `--help --json` produces a safe invocation error instead of mixed stdout.

The worker and request clients accept optional runtime observers. They emit
allowlisted codes and bounded course identities, never payloads, raw exceptions,
response bodies or receipt records. Stage completion follows successful journal
saves; observer exceptions cannot interrupt persistence, delivery or resume.

```ts
const scraper = new MaktabkhoonehScraper({
  onRetry: event => console.error(event.code, event.attempt, event.waitMs),
});
const backend = new HttpBackendClient("http://127.0.0.1:3001", {
  onRetry: event => console.error(event.phase, event.code, event.attempt, event.waitMs),
});
const result = await new ScraperWorker(scraper, backend).run({
  checkpoint: "apps/utils/output/example.json",
  onEvent(event) {
    if (event.type === "stage") console.error(event.phase, event.index, event.total, event.status);
    if (event.type === "complete") console.error(event.summary.unattempted, event.summary.resumable);
  },
});
```

`onEvent` uses the exported `WorkerEvent` union; `complete.summary` provides
aggregate failure categories, saved-progress state, stop reason and unattempted
count separately from the unchanged `RunReport`. Backend `onRetry` adds
`phase` (`delivery` or `image`); provider `onRetry` carries `code`, `attempt`
and `waitMs`. They are optional and silent when omitted. Import
`HttpBackendClient` from `@dorob/utils/backend-client` and `ScraperWorker` from
`@dorob/utils/worker`. Historical `transport` journal codes cannot recover the
discarded underlying cause; diagnostics report an unknown transport failure
rather than claiming a verified outage or connection cause.

## Protected management access

Set `DOROB_ADMIN_TOKEN` privately in the process environment for a protected
backend. The client sends it as `Authorization: Bearer <token>` only to backend
management requests, never provider or Ollama requests. A 401 stops automatic
retries; correct the token and resume the existing checkpoint/operation without
changing its replay identity. Explicit `DOROB_DEV_MODE=true` on the application
is the only credential-free mode. See [admin access](../../docs/admin-access.md)
for private state, browser sessions and rotation.
