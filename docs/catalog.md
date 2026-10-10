# Local curated catalog

Categories are the six fixed ordered IDs/labels in `packages/core/src/index.ts`. Changing that vocabulary requires a code change; changing/removing a stored ID also needs a later SQL migration and explicit reassignment. There is no category table or category administration.

## Setup and migrations

From the repository root, start PostgreSQL with `bun run db:up`, copy `apps/api/.env.example` to `apps/api/.env` if needed, then run `bun run db:migrate`. The command uses the API environment and the existing native Bun SQL pool settings. Migrations are ordered files in `apps/api/migrations/`; a session advisory lock serializes runners and each migration plus its checksum ledger entry commits in one transaction. Reruns preserve records. Missing or edited applied migrations fail; add a new migration instead. No seed data is created. API startup never runs migrations and greeting/categories/docs remain available before schema setup.

Rollback means reverting catalog application wiring while retaining tables, memberships, and the Compose volume. Do not drop tables or reset the volume as a routine rollback. Schema removal or curated-record deletion needs separate authorization.

## Identity and data boundary

A course reference stores only `id`, `providerId`, `providerCourseId`, `title`, and `sourceUrl`; registration never fetches its URL. Its stable ID is `${providerId}:${providerCourseId}`. Re-registration updates title/URL and preserves memberships. Provider-course IDs are opaque and can include slashes/Unicode; URL-encode the complete ID when using it as a path segment. These manually registered references do not claim current prices, syllabus, ratings, provider level, or full ingestion facts.

Frontend snapshots use legacy IDs and remain independent. There is no automatic import, reconciliation, frontend API consumption, or new admin UI.

## Editorial semantics

An editor defines scope and an optional target level (`beginner`, `intermediate`, `advanced`, `mixed`, or null). Null means unspecified; mixed means deliberately mixed coverage. Courses can belong to multiple groups or remain unassigned. Membership is an editorial comparison set, not a claim of identical content, ranking, or provider-stated level. AI grouping/placement is absent; independently deferred AI comparison is not enabled here.

Groups start as drafts (`isPublished: false`). Public lists/details show only published groups with at least two distinct members. Removing the second member hides a published group without changing its flag; restoring a second member makes it visible again. Management reads include drafts and smaller groups. Counts, eligibility, and paginated members use the same repeatable-read snapshot. Group order is slug/ID; member/course order is canonical ID, not popularity. Lists return `{ items, total, limit, offset }`, with default limit 20, maximum 100, and default offset 0. Renaming a slug changes public lookup; redirect history is deferred.

Management is unauthenticated and intended only for the loopback local development service. Do not expose it on an untrusted network. Authentication and production deployment require separate work.

## Two-course Swagger walkthrough (synthetic local test data)

Run `bun run dev:api` and open `http://127.0.0.1:3001/docs`. These examples are synthetic test records on `example.com`, not provider facts. Pick unique IDs/slugs if you want to keep multiple trials. All operations use **Try it out** → **Execute** and the current loopback origin.

1. `GET /api/v1/categories`: inspect the six fixed labels.
2. `PUT /api/v1/manage/courses`: register each of these bodies (201); repeat one with an edited title to observe 200 and the same course ID:

   ```json
   {"providerId":"local-test","providerCourseId":"python-one","title":"نمونهٔ آزمایشی پایتون یک","sourceUrl":"https://example.com/python-one"}
   ```

   ```json
   {"providerId":"local-test","providerCourseId":"python-two","title":"نمونهٔ آزمایشی پایتون دو","sourceUrl":"https://example.com/python-two"}
   ```

3. `GET /api/v1/manage/courses`: confirm both references and their stable IDs.
4. `POST /api/v1/manage/groups`: create this draft (201) and copy its generated `id`:

   ```json
   {"slug":"local-test-python","title":"گروه آزمایشی پایتون","description":"دادهٔ آزمایشی برای بررسی گروه‌بندی دستی؛ ادعای یکسان بودن محتوا ندارد.","categoryId":"code","targetLevel":"beginner"}
   ```

5. `GET /api/v1/manage/groups` and `GET /api/v1/manage/groups/{id}`: confirm the draft, null/selected level, and zero members.
6. `PUT /api/v1/manage/groups/{id}/courses/{courseId}`: assign each returned course ID (204). Repeat an assignment; the count stays two. Swagger encodes path parameters; raw HTTP clients must percent-encode the complete course ID.
7. `PATCH /api/v1/manage/groups/{id}` with `{"isPublished":true,"description":"شرح ویرایش‌شدهٔ گروه آزمایشی"}` (200). Only supplied fields change; ID/members remain.
8. `GET /api/v1/groups?category=code` and `GET /api/v1/groups/{slug}?limit=1&offset=0`: the eligible group appears with total two and one paginated minimal reference. No card-ready facts are implied.
9. `DELETE /api/v1/manage/groups/{id}/courses/{courseId}` for the second course twice (204). Public detail becomes 404; management still shows `isPublished: true`, count one. Reassign the second course; public detail returns again.
10. Rerun `bun run db:migrate`, normally stop/restart API and PostgreSQL (`db:down` / `db:up`, without volume removal), and confirm the same group/course IDs, links and visibility.

There are no parent-deletion routes in this change. These example records remain until explicitly cleaned up; validation uses its own unique test IDs and removes only those records. A blank/unsupported input returns 422, a missing parent/group 404, a conflicting slug 409, and unavailable database 503, with safe error bodies.

## Retained source observations (v3)

The local v3 API accepts retained observations, explicit URL/upload thumbnail
processing and hosted WebP assets. The standard HTTPS URL/upload flow passes
built-service verification under Bun 1.3.8. The owner-authorized temporary
IP-pinning exception leaves a known SSRF/DNS rebinding risk, documented below.
See [validation](validation.md#course-ingestion-history--october-10-2026).

The new additive `002_ingestion.sql` migration adds `course_snapshots`, the
same-course `current_snapshot_id` pointer, and separate thumbnail asset,
attempt and upload metadata. Run `bun run db:migrate` explicitly; startup does
not import, scrape or migrate. Applied migrations/checksums remain unchanged.
Rollback means disabling the new route wiring while retaining tables and
files. Do not reset volumes or drop history. No automatic history deletion is
introduced; monitor database/disk growth and back up database and asset files
together.

Accepted envelopes are immutable facts. New submission IDs always create a new
snapshot, even when facts match. Per-course row locking serializes acceptance;
latest means highest acceptance order, independent of source checked time.
Exact retries return the same snapshot (200); changed content under that ID
returns 409. A retry of an older observation never changes current.

For a synthetic sequence, ingest the rich `synthetic-1` fixture, then a sparse
submission with ID `sparse` and unavailable pricing/thumbnail. History retains
both exact payloads in newest-first order; current exposes only `sparse`, with
no imported education or feedback. This sequence is verified in
`apps/api/tests/ingestion.integration.test.ts`. Default history pagination is
20, maximum 100; exact snapshot reads also require the owning course ID.

The existing five-field reference remains editorial data. Ingestion updates
its title/URL on new acceptance, but a later manual reference edit does not
rewrite a snapshot. Detail returns the reference separately from the snapshot;
use `snapshot.payload` for observed identity/title/URL. Legacy references have
null snapshot and false readiness. Group memberships and minimal public-group
eligibility retain their previous behavior. Raw evidence/extensions are only
in management observations. Thumbnail state is operational metadata separate
from the immutable source payload.

### Thumbnail profile and durable storage

Profile `webp-640-q80-v1` supports static JPEG, PNG and WebP input only, decoded
by pinned server-only Sharp 0.34.5. Actual content decides acceptance; filenames
and MIME labels do not. SVG/animation fail. Inputs are capped at 10 MiB and
25 million decoded pixels. Auto-orientation precedes fitting within 640 × 640;
there is no crop/upscale. Metadata is removed. WebP quality starts at 80 and
falls through 65/50 only if necessary for the 512 KiB output cap. Dimensions,
bytes, hash and profile are retained. These defaults are a local initial
profile, not measured savings for a provider catalog.

Decode/encode runs in an isolated Bun child with a 30-second kill deadline;
only two operations run concurrently. Downloads have a 15-second deadline,
three redirects, streaming byte bounds and the same concurrency ceiling.
Only public HTTPS port 443 targets without credentials are accepted. Every
DNS result and redirect is preflight-checked; standard HTTPS retains TLS
certificate/hostname verification without pinning the connected IP. Special-use IPv4/IPv6, mapped and
transition ranges fail closed. No cookies/auth headers are forwarded.

**Known security risk (owner accepted October 10, 2026):** image URLs are supplied
by the internal crawler, and IP pinning is temporarily skipped. Standard HTTPS
may resolve DNS again after preflight. A changing DNS answer can therefore reach
an address that was not validated, leaving SSRF/DNS rebinding risk despite the
preflight checks. TLS verification remains enabled. **TODO:** restore verified
IP pinning in a later change; this implementation does not prevent DNS rebinding.


The API runs from `apps/api` with persistent defaults `storage/thumbnails` and
`storage/staging` (ignored in Git). Configure separate absolute paths with
`THUMBNAIL_ASSET_DIR` and `THUMBNAIL_STAGING_DIR`. Keep those directories across
normal restarts; back up permanent thumbnails and PostgreSQL together. Built
startup requires installed Sharp/native optional dependencies and the bundled
`dist/raster-worker.js` alongside `dist/index.js`.

Uploads are processed into compressed staging before an opaque token is issued.
Tokens expire after one hour and bind to one accepted snapshot; exact submission
replay works after expiry/cleanup. Accepted pending/failed uploads retain staged
compressed bytes for explicit retries; originals are discarded. Processing URL
inputs downloads only on an explicit process request. Leases expire after 60
seconds, so interrupted work can be retried. Processing an older snapshot
cannot update current facts or attach its image to the current snapshot.

Permanent bytes use immutable SHA-256 keys with atomic create/reuse. Persisted
bytes precede a ready database association. Identical content reuses an asset
across observations/courses. Missing or corrupt current files report failed and
unready, without borrowing an older image. No referenced historical assets are
automatically deleted. Corrupt files require administrator repair/removal before
retry can recreate that content key.

At startup and after uploads/process operations, cleanup removes up to 100
expired unconsumed/ready upload records and their staged bytes, plus bounded
abandoned temporary writes/orphan stage files older than one hour after checking
DB references. Cleanup never deletes permanent content keys. Monitor retained
history and abandoned permanent writes; deletion/retention policies need a
separate decision. Filesystem storage outage returns a safe failure or 503.

### V3 Swagger URL/upload walkthrough (synthetic data)

Start the migrated local API (`bun run db:up`, `bun run db:migrate`,
`bun run dev:api`) and open `http://127.0.0.1:3001/docs`. All course facts here
are fictional; httpbin supplies a public test image, not a course provider.
Use fresh submission IDs for another run. Swagger encodes course IDs; curl
clients must encode the whole course ID (for example `example%3A101`).

1. Expand `POST /api/v1/manage/course-ingestions`, choose **Try it out**, and
   submit the following body. A new observation returns 201 with generated
   `id` (snapshot ID), `courseId`, source payload, and pending thumbnail state.

   ```json
   {
     "schemaVersion": 3, "submissionId": "swagger-url-1",
     "providerId": "example", "providerCourseId": "101",
     "title": "دورهٔ آزمایشی", "sourceUrl": "https://example.org/101",
     "source": {
       "checkedAt": "2026-10-10T00:00:00Z", "extractor": "synthetic",
       "extractorVersion": "1", "method": "public-html",
       "fieldSources": {
         "title": "synthetic h1", "sourceUrl": "synthetic canonical",
         "providerId": "synthetic adapter", "providerCourseId": "synthetic page.id",
         "thumbnail.data": "explicit public test-image URL"
       }, "warnings": []
     },
     "pricing": {"coverage": {"status": "unknown", "reason": "No price established in this synthetic observation"}, "data": null},
     "thumbnail": {"coverage": {"status": "complete", "reason": null}, "data": {"kind": "url", "url": "https://httpbin.org/image/jpeg", "alt": "تصویر آزمایشی"}}
   }
   ```

2. Run `POST /api/v1/manage/courses/{courseId}/snapshots/{snapshotId}/thumbnail/process`
   with the returned IDs. It returns 200 and `ready` if the fixture is reachable,
   or a persisted safe failed state if retrieval/processing fails. Retry is
   explicit; an active processing lease returns 409. Facts survive either result.
3. Run `GET /api/v1/manage/courses/{courseId}` and the exact snapshot GET. A ready
   image gives `presentationReady: true` while pricing stays explicitly unknown.
   Open `thumbnail.asset.url` on the same origin: WebP bytes have ETag and immutable
   cache headers. Conditional `If-None-Match` returns 304.
4. Save the same test JPEG locally (or select a local static JPEG/PNG/WebP):

   ```sh
   curl --fail --max-time 20 --output /tmp/dorob-thumbnail.jpg https://httpbin.org/image/jpeg
   ```

   In `POST /api/v1/manage/thumbnail-uploads`, choose that file and Execute.
   Copy the 201 response's opaque `uploadId`; it expires after one hour.
5. Submit the first body again with `submissionId: "swagger-upload-2"`, a new
   thumbnail locator in `source.fieldSources`, and thumbnail `data` changed to
   `{"kind":"upload","uploadId":"RETURNED_TOKEN","alt":"تصویر آزمایشی"}`.
   Process the new snapshot. Identical encoded bytes reuse the same asset ID/URL;
   source observations remain distinct. A token cannot be consumed by another
   submission, but an exact retry of its accepted submission returns 200.
6. Inspect `GET /api/v1/manage/courses/{courseId}/snapshots?limit=20&offset=0`.
   Both snapshots are retained, newest acceptance first. Replaying the original
   URL submission returns its original snapshot without making it current.
   Change content under the same submission ID to see safe 409. Invalid nested
   data returns 422, unknown record/token 404, and storage/database outage 503.
7. A third submission can replace thumbnail with explicit unknown/null and omit
   optional education/feedback. Current becomes that whole snapshot, with false
   readiness and no historical image/fact fallback. Earlier asset URLs continue
   to resolve through their own snapshots. Rerun migrations and normally restart
   the API with the same storage paths to confirm retained IDs/history/images.

The source schema in `/docs/json` contains minimal and rich fictional examples;
rich metadata is optional, not a requirement for accepting a sparse observation.
The response schemas separate immutable payload from mutable thumbnail state.

To run the built HTTP version of this flow with isolated synthetic data:

```sh
bun run build:api
bun apps/api/tests/built-ingestion-smoke.ts
```

The smoke requires reachable local PostgreSQL, permission to create a temporary
database, and access to the public httpbin fixture. It creates its own temporary
database/storage and loopback listener, tests URL/upload reuse, rich/sparse facts,
changed prices/images, replay, safe private-target failure, migration rerun and
normal API restart, then removes only those temporary resources. Offline and
PostgreSQL suites use controlled transport/fixtures and need no provider calls.

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
publication. Frontend fixtures are unchanged; other provider migrations,
scheduling and AI remain deferred. Startup/migrations never invoke the worker.
See root README and validation for setup and acceptance results.

## Public course presentation

The additive browser-safe `PublicCourse`, `PublicCourseDetail`, `PriceSummary`,
`PublicOffer`, and `CourseQuery` contracts live in `packages/core`. List items
contain stable `id`, current `snapshotId`, provider identity/name, source URL,
`checkedAt`, hosted thumbnail identity/path/dimensions/alt, nullable level,
content minutes and instructors, editorial category IDs, and a price summary.
Details add nullable description, syllabus and purchase offers from that same
observation. `null` means unavailable; an empty list means a confirmed empty
section. No previous snapshot or frontend sample fills missing fields.
Raw evidence, ingestion IDs/hashes/locators and processing diagnostics are omitted.

`checkedAt` is the provider collection time, not the time the browser/API read
occurred. A public read does not collect new provider facts. Cards/details render
this time as a Jalali date; a detail response identifies its own observation even
when ingestion changed it after the card loaded.

Offers preserve type, label, normalized toman amounts, explicit status, billing
period, certificate/access/support terms. Select an explicitly free one-time
offer first; otherwise the lowest positive paid one-time toman amount (stable
lexical offer-ID tie-break); otherwise subscription access; otherwise unknown.
Multiple one-time options label a selected paid summary as a starting price.
A discount requires a greater original amount in the same normalized unit.
Unknown zero is never free; currencies are never guessed. Unknown summary:

```json
{"status":"unknown","offerId":null,"amount":null,"originalAmount":null,"unit":"toman","startingPrice":false,"billingPeriod":null,"unavailableReason":"not-established"}
```

Runtime page/detail validators reject malformed identities, pricing, pagination,
foreign thumbnail paths, leaked extra fields and inconsistent offer selection.

### Public read-only endpoints

```sh
curl 'http://127.0.0.1:3001/api/v1/courses?limit=18&offset=0'
curl 'http://127.0.0.1:3001/api/v1/courses?q=پایتون&freeOnly=false'
curl 'http://127.0.0.1:3001/api/v1/courses?category=code&freeOnly=true'
# URL-encode the whole canonical ID, including any slash in the provider ID suffix:
curl 'http://127.0.0.1:3001/api/v1/courses/example%3Aopaque%2Fcourse'
```

Open `/docs` → **Public catalog** → GET `/api/v1/courses` → **Try it out**.
The response has `items`, matching `total`, `limit`, and `offset`. Default limit
is 18 (1–100), default offset 0 (0–2147483647); both must be integers. `q` is
at most 200 characters, `category` uses the six fixed IDs, and `freeOnly` is
`true` or `false`. Unknown/repeated query keys are rejected. Details require a
canonical encoded ID. Invalid inputs return safe 422; missing/ineligible detail
returns 404; unavailable database or required image storage returns 503.

A current accepted observation with a ready hosted thumbnail is automatically
eligible, including ungrouped courses and unknown prices. Minimal references,
pending/missing/failed current images are excluded. Old ready snapshots never
replace an unready current one. Bounded metadata-only image checks reconcile
missing files before counting or slicing results; reads never process images.
A race after the check can still produce an image placeholder in the browser.

Search uses literal normalized substrings across title, provider ID/name and
instructors: NFKC, Arabic yeh/kaf to Persian equivalents, ZWNJ to space, collapsed
whitespace and case folding. `%` and `_` retain literal meaning. This local slice
reads a consistent view of current candidates and editorial memberships, then
filters normalized text in memory, avoiding SQL wildcard interpretation. It
inspects at most four files concurrently and does not load their image bytes.
This is suitable for the small local catalog, not a large-catalog search index.

Categories derive exclusively from published editorial groups with at least two
members. Duplicate group memberships do not duplicate courses/categories. A
ready course with no such assignment appears unfiltered and can match search;
selecting a category may honestly return zero results until curation exists.
Order is current acceptance time descending, then canonical course ID with `C`
collation. On unchanged data offset pages are stable; concurrent ingestion can
shift subsequent pages. Reads provide no frozen multi-request snapshot.
