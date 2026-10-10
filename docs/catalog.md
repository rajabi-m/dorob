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
