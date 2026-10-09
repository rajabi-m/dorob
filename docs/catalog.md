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
