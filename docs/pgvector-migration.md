# PostgreSQL with bundled pgvector — October 17, 2026

Dorob now runs the upstream maintained
[`pgvector/pgvector:0.8.7-pg17-bookworm`](https://github.com/pgvector/pgvector#docker)
image. Both the tag and immutable multi-platform manifest are pinned in
[`compose.yaml`](../compose.yaml):

```text
sha256:ac08538c6f8b9904c33c8224c5e5706dbe760aca29db1d096972b4052c22a75d
```

Verified locally on ARM64: PostgreSQL 17.11 (Debian package
`17.11-1.pgdg12+2`), pgvector 0.8.7. The image includes AMD64 and ARM64 manifests.
The upstream [changelog](https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md)
records the October 1, 2026 release; the image was built that day. Future updates
require deliberately refreshing the tag/digest and verifying restoration again.
No custom extension compilation is used.

## Startup and extension

Normal setup remains `bun run db:up`, API `.env` setup, then
`bun run db:migrate`. If using the documented example connection directly:

```sh
DATABASE_URL=postgres://dorob:dorob_dev@127.0.0.1:5432/dorob bun run db:migrate
```

Migration `004_pgvector.sql` enables `vector` in `public` and records its checksum.
Migrations 001–003 are unchanged. It adds no application tables, approximate
indexes, inference, background work or automatic collection. The future embedding
revision schema and HTTP/CLI integration remain unfinished.

The active Compose volume is `postgres_vector_data` (locally
`dorob_postgres_vector_data`); the service retains loopback port 5432 and the
existing user/database. Normal shutdown preserves it. Docker Compose reports a
benign ownership-label warning for this restored volume because it was created
for isolated verification before Compose adopted it. Health/startup and normal
restart passed. Fresh installations let Compose create their volume normally.

## Verified migration and preservation

The owner explicitly authorized migration. A complete logical backup of both
`dorob` and `postgres`, plus cluster roles, was saved before any owner-database
change. It restored into a separate, fresh pgvector volume without host ports.
Schemas for both databases matched after excluding dump comments/random restrict
tokens. Counts and sorted full-row hashes matched for all 19 user tables,
including the existing `catalog_test_8da14f4e92a34c44bffe72a785e61c78` schema.
Role attributes/passwords were restored privately; no credentials are recorded here.
UTF-8 and the `en_US.utf8` locale names are preserved. Logical restoration rebuilt
indexes under Debian's libc rather than reusing Alpine's physical files.

Before activation, table locks fenced writes and source fingerprints were checked
again. The verification container was stopped; the original service was stopped;
Compose activated the restored volume. The original volume was never mounted in
the Debian image or deleted. Cutover completed at October 17, 2026, 10:20:58 Tehran.
The extension migration then committed successfully and reruns passed through
integration verification. A normal database restart retained data and extension.

Final verification preserved all 18 data-table fingerprints exactly; the only
changed user table is `schema_migrations`, with its single expected fourth entry.
This includes 1,495 courses, 20 groups, 17 memberships, source snapshots,
thumbnail associations, review decisions/history and the owner's protected test
group `99fc95d2-868f-48a8-a6a0-a5c2fad96b1f`. No group publication or membership
changed. Hosted image files were not moved or rewritten.

Validation passed:

- API tests with real PostgreSQL: 55 passed, zero skipped/failed (587 assertions),
  including fresh/rerun migrations, immutable history, review replay, ingestion,
  thumbnail durability and shutdown behavior. Tests use isolated schemas.
- API lint, type checking and production build; Compose configuration validation.
- Real `vector(1024)` storage and cosine distance (self-distance zero), with the
  temporary test table rolled back.
- Actual API over a temporary loopback port: readiness 200, eligible public course
  total 1,493, management group total 20. Verification process was stopped afterward.

The first image transfer stalled and a retry hit a TLS handshake timeout despite
the VPN. Pulling the verified digest directly completed. A standalone migration
without `DATABASE_URL` initially failed safely because there is no API `.env`;
the explicit documented local connection succeeded. Neither failure changed data.

## Backup and recovery assets

Ignored private directory:
`apps/api/storage/backups/pgvector-20261017T064116Z/`.

| Archive | SHA-256 |
| --- | --- |
| `dorob.dump` | `72eefabb677f97292c48a7f482fbfa948dd797b7ae9122dc588b4199875a78b4` |
| `postgres.dump` | `e712a404931a2b828ea3d5122899c838d66ba27f6e9274f447b8b1121ad990cd` |
| `globals.sql` | `4484d5f0891c65b52c60ad0e9e9fa47bc0be15f3fea517de8d38d70ed2e16cde` |

`verification.json` records isolated restoration, schema checksums and every table
fingerprint; `activation.json` records cutover; `final-verification.json` records
post-migration/restart checks. `globals.sql` contains private role credentials;
keep the directory private and back it up separately from Git. Database archives
do not include hosted thumbnail files; preserve those alongside database backups.

The original Alpine database remains in **`dorob_postgres_data`**, with its
pre-migration schema/data. Do not delete it or reuse it with the Debian image.
Rollback requires a new owner instruction because it would activate the older
snapshot and omit changes made after cutover. To recover after that instruction:

1. Stop API/ingestion/editorial writers and back up the current pgvector database.
2. Stop the Compose database. Use a Compose override selecting
   `postgres:17.11-alpine3.23` and mounting the existing external
   `dorob_postgres_data` volume at `/var/lib/postgresql/data`.
3. Start only PostgreSQL, verify its baseline fingerprints and reconnect the API.
   Do not run the newer extension migration on the old image; `run.sh` runs
   migrations automatically, so use standalone API startup for such recovery.
4. Keep the pgvector volume and all backups until the owner decides disposition.

For logical recovery, verify archive checksums and restore into another unused
replacement database/volume first. Never overwrite the working database as an
implicit recovery action. No rollback or destructive volume removal was performed.


## Embedding integration follow-up — October 17, 2026

After isolated API/migration/real-model/capacity acceptance, migrations
`005_embedding_workflow.sql` and `006_embedding_integrity.sql` were applied to the
working database. The ledger now has six entries. Every original non-ledger table
still matches its complete pre-work row fingerprint: 1,495 courses, 20 groups,
17 memberships, the protected group and original review/source records are unchanged.
The ignored backup directory above now also holds
`embedding-integration-verification.json` with the full post-integration fingerprints.
Additive embedding tables are retained on rollback; do not drop the extension or
restore the working database without separate owner instructions. Acceptance-only
inference, synthetic courses, drafts and membership decisions live in isolated
acceptance databases, as recorded in [integration results](embedding-results.md).
