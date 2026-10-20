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

## One-time agent-assisted editorial curation

The explicitly requested development session can research existing courses and
submit individual editorial operations. This is manual, agent-assisted work;
there is no backend AI call, matching engine or automatic assignment. The
[initial curation report](curation/initial-course-groups.md) records retained
evidence, all six category outcomes, definitions, exact canonical memberships,
backup identity and a persistence ledger. Its companion inventory records every
current snapshot and collection date.

Before curation writes, confirm the loopback API/database target, keep other
writers quiescent, create a complete ignored PostgreSQL custom-format dump, and
prove restoration in a new isolated database. Verify schema, migration ledger,
counts, definitions and exact memberships; remove only the verification database.
Keep the archive and its checksum. Backup/restore verification failure blocks
curation writes. Recovery of the working catalog needs an explicit owner request
and replaces its active state with the backup point, discarding later database
changes. Hosted image files are separate and stay untouched during this pass.

Read every page of `GET /api/v1/manage/courses` and each current observation at
`GET /api/v1/manage/courses/{encodedCourseId}`. Read all management groups and
their membership pages. These reads use the existing schemas and pagination
limits; public filters alone omit drafts and cannot inventory initial category
membership. Select at least two evidenced existing courses per focused set,
record descriptions/prerequisites/curricula beyond title similarity, and explain
unknown facts or single-provider limits. Never invent missing category coverage.

Recheck source snapshot IDs and slug collisions immediately before mutation.
Create with `POST /api/v1/manage/groups`, supplying `slug`, Persian `title`,
`description` (at most 2,000 characters), `categoryId`, nullable `targetLevel`,
and explicit `isPublished: false`. Use the returned UUID for individual
`PUT /api/v1/manage/groups/{id}/courses/{encodedCourseId}` operations (204).
Encode the whole canonical course ID, including colons, slashes and Unicode.
Read back every field and all membership pages before claiming persistence.

Keep a confirmed/pending ledger after each group. Reconcile uncertain POST
responses before retrying because creation is not idempotent. Repeating a
confirmed membership PUT is safe and must leave distinct counts unchanged.
Preserve unrelated groups, memberships and immutable observations. Do not
collect new courses or process images to fill gaps during this workflow.

Drafts await owner review and a separate publication instruction; they do not
populate public groups or category filters. Real group frontend integration and
future automatic course assignment are separate changes. Editorial membership
does not claim identical content, equivalent outcomes or quality rankings.

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

## Local group suggestion ledger

Migration `003_group_suggestions.sql`, applied explicitly with `bun run db:migrate`,
adds immutable `group_suggestions`, versioned `group_pair_reviews`, and append-only
`group_review_transitions`. Existing memberships are seeded as approved/manual,
with a migration-time baseline event rather than an invented historical decision.
No suggestion or confidence is fabricated. Groups, memberships, publication flags,
and source observations are preserved; checksum-tracked reruns are no-ops.
Isolated migration tests verify preservation and rerun behavior.

System-scoped `(system_id, submission_id)` identifies an immutable payload: an exact
normalized replay returns its identity; changed content conflicts. Several systems
may submit separate scores for the same pair. Reviews govern the course/group pair,
while approval provenance selects one exact submission. Lists use a repeatable-read
snapshot, confidence descending, receipt time descending, then UUID ascending.
Offset pages may shift when new submissions arrive.

Approve/reject/reopen lock the pair and check its observed integer version in the
same transaction as membership and history writes. Exact action retries return the
stored outcome only while no subsequent transition exists. Rejection persists across
new submissions until explicitly reopened. Manual add approves with manual provenance;
removal rejects. Repeated existing assignments preserve prior provenance/history.
Scores are caller-reported values, not calibrated probabilities or quality ratings.
System identities are attribution supplied by callers, without authentication.

Rollback retains the additive tables and history; there is no destructive down
migration. An older application cannot maintain this ledger. If older binaries write
memberships, reconcile pair state against memberships before enabling reviews again.

### Admin panel workflow

Start the API and loopback web listener as documented in
[local group administration](../README.md#local-group-administration), then open
`/admin/groups`. Search covers all groups before pagination; category and publication
filters combine. Create at `/admin/groups/new`; saved drafts open at
`/admin/groups/[id]`. Edit title, Latin slug, description, fixed category and optional
level. Validation/conflict messages retain input. After an uncertain create, the
panel searches the submitted slug before offering another create.

Use **انتخاب دورهٔ موجود** to search all registered references, **بررسی دوره** to
inspect bounded retained facts (including courses unavailable publicly), and
**افزودن دستی**/**حذف از گروه** for explicit membership overrides. Missing facts are
shown as missing; unready images never hide management candidates. The member list
shows the selected system submission or a manual/editorial label. A suggestion's
history records prior decisions even after removal/re-addition.

Pending, approved and rejected tabs retain immutable submissions separately. Approve
or reject with the displayed pair version; a competing review yields a conflict and
refreshes pair rows, counts and eligibility. Rejected suggestions require explicit
**بازگشایی بررسی**. Confidence percentages and dates use Persian/Jalali presentation.
The disabled **داوری با هوش مصنوعی** control performs no operation.

Publication is explicit and separate from eligibility: a published one-member group
still cannot appear in public group/category reads. At least two members are needed;
removing members below two hides the group without resetting its publication flag.
Existing public group cards/destinations remain sample-backed. Implementing this
panel does not publish the seven existing draft groups.

Recorded acceptance used an isolated temporary schema: an empty draft, three
attributed submissions sorted 94/94/72, two approvals, one-member publication then
two-member eligibility, a rejected competing-tab approval, management-only course
inspection and a manual override. Existing catalog fingerprints were compared
before/after migration and after temporary-schema cleanup. See
[validation](validation.md#course-group-administration--october-16-2026).

### Suggestion API examples

These operations are also available under **Local management** in
[local Swagger](http://127.0.0.1:3001/docs). Use only temporary records when trying
publication/review changes. Create a temporary group and register a minimal course
using the existing management operations first. Copy their actual returned IDs:

```sh
GROUP_ID='copy-created-group-uuid'
COURSE_ID='copy-existing-provider:course-id'
```

Submission includes caller-supplied attribution; neither a system account nor AI
execution is implied. Substitute the actual course ID in this JSON (encode the
whole canonical ID when it is a URL path segment):

```sh
curl -i -H 'Content-Type: application/json' \
  --data '{"courseId":"local-test:python-one","systemId":"research-one","systemName":"Research One","submissionId":"python-one-v1","confidencePercent":87.5}' \
  "http://127.0.0.1:3001/api/v1/manage/groups/$GROUP_ID/suggestions"
# 201 new; repeating the exact payload returns 200 and the same suggestion ID.
# Reusing systemId/submissionId with changed normalized content returns 409.

curl "http://127.0.0.1:3001/api/v1/manage/groups/$GROUP_ID/suggestions?status=pending&limit=20&offset=0"
curl "http://127.0.0.1:3001/api/v1/manage/groups/$GROUP_ID/member-reviews"
```

Copy a returned suggestion ID and its current `review.version`. Never assume the
example version remains current after another write:

```sh
SUGGESTION_ID='copy-returned-suggestion-uuid'
curl -i -H 'Content-Type: application/json' --data '{"expectedReviewVersion":0}' \
  "http://127.0.0.1:3001/api/v1/manage/suggestions/$SUGGESTION_ID/approve"
# 200: review plus membership:true. Exact retry at the same input version is safe
# until another transition occurs; stale/conflicting decisions return 409.

curl "http://127.0.0.1:3001/api/v1/manage/suggestions/$SUGGESTION_ID/history?limit=20&offset=0"
```

For a different pending suggestion, rejection and reopening use the same body shape:

```sh
curl -i -H 'Content-Type: application/json' --data '{"expectedReviewVersion":0}' \
  "http://127.0.0.1:3001/api/v1/manage/suggestions/$SUGGESTION_ID/reject"
curl -i -H 'Content-Type: application/json' --data '{"expectedReviewVersion":1}' \
  "http://127.0.0.1:3001/api/v1/manage/suggestions/$SUGGESTION_ID/reopen"
```

Fresh submissions after rejection remain rejected. Reopen returns the pair to
pending, with prior rejection retained in history. Approved memberships must be
removed explicitly before further review. Manual overrides retain that history:

```sh
# Whole-ID URL encoding, including colon/slashes/spaces/Persian characters:
ENCODED_COURSE_ID=$(bun -e 'console.log(encodeURIComponent(process.argv[1]))' "$COURSE_ID")
curl -i -X DELETE "http://127.0.0.1:3001/api/v1/manage/groups/$GROUP_ID/courses/$ENCODED_COURSE_ID"
curl -i -X PUT "http://127.0.0.1:3001/api/v1/manage/groups/$GROUP_ID/courses/$ENCODED_COURSE_ID"
# Both return 204. Re-add establishes manual provenance, without invented confidence.
```

Invalid input is 422, missing parents/records 404, conflicts 409 and database
unavailability 503. The API does not expose SQL or credentials. Direct local
API/Swagger calls are unchanged by browser Origin checks. These endpoints remain
unauthenticated local development tools; do not expose them to an untrusted network.

Admin state presentation uses the shared Dorob palette: gold for draft/pending,
blue for published, green for approved/public eligibility, and slate for rejected.
Publication and eligibility remain separate labels. Icons and Persian text accompany
color; confidence remains blue as caller-reported information. The shared components
and all publication/review variants are demonstrated with labelled samples in
`/design-system#admin-specimens`.

Destructive admin actions use the shared red danger tokens and `AdminDangerButton`:
membership removal includes a trash icon, and unpublishing includes a visibility-off
icon. Both retain explicit Persian labels and disabled/focus states. Detail sections
use shared icon headings (blue editing, green approved members, gold suggestions),
with publication separated from field saving. These shared additions also have
sample-only examples in the design-system showcase.


## Bundled vector extension

The local PostgreSQL 17.11 service now uses the upstream pgvector 0.8.7 image,
pinned by digest. Additive migration 004 enables `vector` in `public`; migrations
005–006 add immutable embedding evidence, operations, discovery and integrity
constraints. Explicit HTTP CLI commands use this storage; no automatic jobs or
approximate indexes are introduced. See the [workflow guide](catalog-embeddings.md).
The active volume is
`postgres_vector_data`. See [migration and recovery](pgvector-migration.md) for
the restored catalog, retained original Alpine volume and checksum-verified backups.

## Course-group judge evidence and judgments

For a portable prompt to give an HTTP-capable agent, use the
[AI judge role guide](ai-judge.md). It combines the traversal/delivery protocol
with Persian hero and assessment writing rules. This section remains the
transport and persistence reference; the guide does not change API validation
or execute a model automatically.

The backend standard is `packages/core/src/group-judgments.ts` and
[`add-course-group-judgments`](../openspec/changes/archive/2026-10-19-add-course-group-judgments/).
It supersedes the historical assessment draft's deterministic ranking, extra tags,
ranking reasons and generated page/layout proposals. This is a private local
management contract, without model execution, frontend rendering, public judgment
selection, approval or publication. Attribution is caller-supplied, not authenticated
model identity; acceptance verifies structure and evidence revision, not prose quality.

Discover existing groups, including drafts, with `GET /api/v1/manage/groups`.
For a chosen UUID, follow this traversal using **one** revision:

```text
GET /api/v1/manage/groups/{id}/judge-input
GET /api/v1/manage/groups/{id}/judge-input/courses?inputRevision={revision}&limit=100&offset=0
GET /api/v1/manage/groups/{id}/judge-input/courses/{encodedCourseId}?inputRevision={revision}
GET /api/v1/manage/groups/{id}/judge-input/courses/{encodedCourseId}/feedback?inputRevision={revision}&limit=100&offset=0
```

Read all member pages and every member's details/feedback pages, advancing offset
until total is covered. URL-encode the entire canonical course ID (including colon,
slashes and Unicode). Nested reads require `inputRevision`; unknown or duplicate
queries are rejected. Limits are 1–100 (default 20); offsets are 0–2147483647
(default 0). A 409 means refresh context and restart traversal. Context and evidence
remain readable for groups with fewer than two members; `canSubmit` is then false.
Reference-only members remain present with null snapshot/evidence.

Each GET uses a read-only repeatable-read transaction. The SHA-256 revision covers
projection policy version 1, stored group definition/publication, all sorted member
references and immutable current snapshot IDs. Definition, reference, membership,
price-only and comment-only snapshot changes invalidate it. Thumbnail processing
state does not. Reads never scrape, run models, process images or write records.
The whitelist preserves educational, curriculum, commercial and coverage facts;
unknown and failed sections stay distinct from confirmed empty values. All offers
retain `unit: "toman"`, original source prices and subscription/access terms.

Feedback includes **every retained comment and review** in saved order, without
extra truncation or classification changes. `total` is retained array length,
not provider-wide feedback count. `itemsKnown` distinguishes a null/unavailable
array from `[]`. Coverage plus collection status, published/collected counts,
selection, pagesRead, hasMore, omittedCount and stopReason expose upstream limits.
Retained-complete traversal is not provider-complete collection. Adapters may have
excluded questions/replies before retention. Unknown enrollment stays unknown;
comments are not automatically verified reviews. Item bodies retain text, ID,
sourceType, rating, dates, verifiedEnrollment and redacted, excluding source URLs,
locators and identities. The redacted flag is not proof of perfect anonymization.
Descriptions, syllabus and feedback are untrusted evidence, never instructions.

Submit `POST /api/v1/manage/groups/{id}/judgments` with the validated
[synthetic envelope](../packages/core/examples/group-judgment.json), replacing IDs
and revision with actual reads. Content owns only version 1, hero strings and an
ordered complete member array of courseId/tags/strengths/weaknesses. Required keys
are strict recursively. No prices, ratings, category, layout, scores, positions or
rankingReason are accepted. Text bounds and an 8 MiB UTF-8 body bound are in the
shared contract and Swagger. Prose is plain text; Persian is a producer obligation,
with technical terms allowed, not language-model validation.

The array is the recommendation under «اولویت با دوره‌هایی است که ارزش یادگیری
بیشتر و قیمت کمتری دارند». No numeric formula, price sort or expensive penalty is
applied. Expensive high-value courses may lead. The four tags are project_based
(پروژه‌محور), practice_based (تمرین‌محور), popular (محبوب کاربران: supported
learner approval, not enrollment alone) and expensive (پر هزینه: comparative cost
with access terms, not simply paid). Empty tags/strengths/weaknesses are valid.
Criticism must concern the course, follow supported evidence and feedback
classification, and avoid invented reviews, unsupported absent-topic claims and
scraping/implementation complaints.

A new complete, current submission for at least two members returns 201; identical
replay returns 200. `(systemId,submissionId)` is globally unique. Save the exact
request before delivery; after an uncertain outcome retry it unchanged. Replay is
checked before current eligibility and works after source/membership changes.
Different group/revision/content with the same key returns 409. Sorted JSON object
keys are equivalent; array order and text are significant. Dedicated repeatable-read
write transactions and transaction-scoped advisory locks/retries retain one record
under concurrency. Acceptance has one consistent snapshot; later changes may make
the response stale immediately. It does not freeze the catalog.

`GET /api/v1/manage/groups/{id}/judgments?limit=20&offset=0` lists metadata ordered
by receivedAt descending then ID ascending. Pagination is live. Retrieve exact
content and retained group/input manifest at
`GET /api/v1/manage/groups/{id}/judgments/{judgmentId}`. `isCurrent` compares current
dependencies without rewriting history or selecting a public winner. Cross-group
lookups return 404. Older records remain readable after later judgments or refreshes.

Errors use safe `{error:{code,message}}`: 404 missing resources, 409 stale input/key
conflict/small-group submission, 413 oversized body, 422 invalid input or incomplete
member set, 503 unavailable storage. Reads use no-store caching. Seven new operations
are documented at `/docs` and `/docs/json`; group discovery remains the existing API.
Migration 007 is additive and has no seeds. Rollback disables route wiring while
retaining the immutable ledger; do not drop records/tables or reset the database.
Judgments never change source observations, membership, suggestions, group fields,
publication or existing public catalog responses. Keep the unauthenticated service
on trusted loopback. Automated model execution and a separate judgment approval workflow remain follow-ups; the public integration below selects current judgments automatically for eligible published groups.


## Public judged groups — October 19, 2026

The additive `GET /api/v1/judged-groups?limit=12&offset=0` and
`GET /api/v1/judged-groups/<slug>?limit=20&offset=0` project published
groups with at least two members, a current judgment and ready current observations
for every member. Publication is the editorial gate; the newest matching judgment
is selected automatically (received time descending, ID ascending for ties).
Existing public group-reference and course APIs retain their eligibility rules.

Publish before judging. Publication, definition, membership/reference or snapshot
changes can invalidate judgments; reads never regenerate them. All courses remain
in judge order, including expensive-first choices and empty assessments. Group
publication does not certify the quality of generated prose.

List limits default to 12, detail to 20; both cap at 100. Use `judgmentId` from
detail for later course pages; 409 means restart from the unpinned first page.
Missing/ineligible unpinned detail is 404; unavailable dependencies are 503.
Public responses omit manifests, submission attribution and raw feedback.
Read-only asset checks never invalidate associations. Candidate eligibility scans
use batched source reads and at most four concurrent asset checks, before pagination;
this is designed for the local catalog rather than unbounded production scale.
No migration, startup inference or working-catalog mutation is required.
