# Individual-course query preparation

`packages/core/src/course-query-facts.ts` owns normalization, searchable provider
names, offer selection and exact source duration. `COURSE_QUERY_VERSION` must
increase when these rules or provider names change; a release must explicitly
rebuild the projection before readiness. Display rounding never changes filtering.
Search is normalized literal substring matching, including `%`, `_` and backslash.

Migration 008 is additive and references `(course_id, snapshot_id)` together.
Ingestion serializes each course and writes its current pointer and query entry in
one transaction. Historical replay returns its original observation without
changing current facts. A deferred database guard invalidates readiness if an
older writer changes a pointer without maintaining its matching projection.

Stop the API and all remote/old writers before preparation. Run the normal
`bun run db:migrate` with the intended `DATABASE_URL`; it applies immutable SQL
migrations and then prepares at most 100 courses per committed keyset batch.
A session advisory fence also blocks new-version ingestion during preparation.
The API checks the expected complete version before listening; public metadata
reads check it in their consistent read transaction. An interrupted run retains
its last committed checkpoint and remains unready; rerun the same command.
SQL migration completion alone is not preparation completion.

For a rule/version change, or re-upgrade after using an older image, explicitly run
`bun run db:migrate --rebuild-course-queries` with writers stopped. This creates a
new generation, immediately invalidates readiness and resumes in bounded batches.
Old-version pointer writes are additionally caught by the database guard, so a
retained complete marker cannot silently authorize stale facts after rollback.
Rebuild does not modify snapshots, images or editorial records. Do not downgrade
or edit checksummed migrations. Startup's existing 30-second migration subprocess
deadline remains: for a larger catalogue use this same command offline before
normal startup; committed batches survive termination. Failure messages explicitly
acknowledge committed SQL migrations/batches rather than claiming full rollback.

Focused isolated tests cover populated pre-008 upgrade, one-batch interruption,
resume, no-op repeat, stale snapshot rejection, old-writer invalidation and explicit
new-generation rebuild. The 1,495-course restored catalogue prepares successfully
within one second locally with PostgreSQL capped at 0.5 CPU/1 GiB (host Bun is not
capped); deployment hardware may differ.

This is a coordinated API/client upgrade: individual `thumbnail` is now nullable
in shared types, runtime validation and OpenAPI. External consumers must handle
null and image-load errors. No fabricated UUID/path or historical image replaces
absence. Group covers/assessed courses explicitly retain nonnull schemas and types;
their evaluated-asset eligibility remains independent and strict.

Individual discovery now includes every accepted current observation, including
unknown pricing and missing/pending/failed images. Reference-only courses remain
private. Current ready image associations supply recorded metadata without file
access; absent associations return null. Deleted/corrupt files affect asset reads
and the browser fallback, not matching totals or current facts. Metadata reads
neither inspect storage nor invalidate attempts and never borrow historical images.
Management presentation readiness, processing/retry and retained-group evaluated
asset checks preserve their existing stricter behavior.

List counts and page selection run in one repeatable-read transaction. Selection
joins both current course/snapshot identity and preparation version/generation;
parameterized filters precede `LIMIT/OFFSET`. Categories use `EXISTS` against
published groups with at least two memberships, so overlapping groups never
multiply a course. Only selected cards' JSON paths cross the boundary; detail
alone loads one full observation. Exact totals survive empty pages.

The restored 1,495-row catalogue's first-page selection plan uses a compact
sequential/hash join and 27-KiB top-N sort (1.20 ms, 140 shared buffer hits), not
full JSON observation reads. PostgreSQL may prefer this at this small size; the
matching timestamp/`C`-collated ID index supports larger ordered scans. The
Roocket/free/under-3h count uses BitmapAnd of the provider/order and price/duration
indexes (9 matches, 0.046 ms, 11 shared hits). These targeted indexes support
provider ordering and combined numeric filters; no speculative substring index
is added for literal `strpos`. Counts/search can scan compact facts and are not
claimed constant time. These are supporting selection/filter plans, not an SLA
or a claim that joins/hydration have no additional cost.

The container provides listener-free `prepare-course-queries` and
`rebuild-course-queries` modes with an independent finite preparation deadline;
see the [existing-disk runbook](container-deployment.md#course-query-optimization-release-on-the-existing-darkub-disk).
A compatible rollback image must retain the exact additive migration in its
migration bundle because the previous checksum runner rejects unknown ledger
versions. Final completion verification locks its state row against deferred
old-writer invalidation before proving there are no current/version/generation
gaps. Restart never prepares within a public request.
