# Catalog embedding integration acceptance — October 17, 2026

The backend/CLI integration is implemented. All 24 tasks are verified; this change
was [archived](../openspec/changes/archive/2026-10-17-integrate-catalog-embedding-workflow/)
on October 17, 2026, with its requirements synced to main specs. The [workflow guide](catalog-embeddings.md)
documents explicit commands and the [migration report](pgvector-migration.md)
documents the pinned PostgreSQL 17.11/pgvector 0.8.7 image, backups and recovery.

## Original catalog preservation

The active working database has migrations 001–006. Its 18 original non-ledger
tables match complete pre-work row fingerprints, including all 1,495 courses,
20 groups, 17 memberships, retained observations and review history. Protected
group `99fc95d2-868f-48a8-a6a0-a5c2fad96b1f` is unchanged. New integration tables
are additive; no production inference, membership or publication was performed.
The original Alpine volume remains retained; the restored Debian volume is active.

Private evidence is ignored under `apps/api/storage/`. The pre-work backup folder
is `apps/api/storage/backups/pgvector-20261017T064116Z/`; see its
`verification.json`, `final-verification.json` and
`embedding-integration-verification.json`. Both databases and role definitions
were backed up and restore-tested before working-image changes. Role dumps contain
credentials and must remain private. The migration report records archive checksums.

## Real installed-model walkthrough

Acceptance used the isolated restored database
`dorob_embedding_accept_20261017_122109`, actual loopback HTTP, the built CLI and
installed Ollama/BGE-M3 `bge-m3:567m`, 1024 dimensions, exact digest:

```text
7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab
```

No model download, remote fallback or lab feedback was consumed. The initial
three-course/one-group generation accepted four vectors (operation
`121a8536-1cc5-4005-8521-e24ff9e5a870`). Subsequent generation reused four vectors.
A distinct forced operation `358f50d8-be9a-4784-92be-8c8d0006764c` generated one
new revision and retained the prior revisions. The real course scope was
`maktabkhooneh:10196`, `maktabkhooneh:10444`, `maktabkhooneh:10619`, against group
`1e6fe378-8a73-403d-aacc-8366746b3acd`.

Combined operation `b1830c69-7918-4a11-9d09-86feb851f298`, run
`621441d0-1846-4520-83cc-6dcce22c4c66`, reused four vectors, produced two matching
suggestions and one discovered set. This is a small title-selected Python sample,
including time-series and PyQt topics as well as beginner material. Similarity alone
does not establish alignment to the beginner group's scope. No precision, recall,
calibrated confidence or owner quality approval is claimed.

A controlled separate three-course synthetic fixture used actual model inference
to exercise deterministic discovery and review. Run
`660f58d8-7064-42af-987b-d9235850def0` produced candidate
`9a381a40-2255-4909-9ed6-08df92e59d3b`. Explicit review/promotion created promotion
`cf4aa096-f172-4a8c-8fe3-da3878dfa3e4` and unpublished draft
`a1cec5da-516b-4c7f-8298-4ba0b91fc81b`. All three members became suggestions;
replaying promotion/delivery created no second draft or suggestions. Identical
fixture texts produced member-mean percentages 100/100/100, which demonstrate the
formula, not quality. Ordinary approval and repeated approval passed; another
suggestion was rejected; editing the draft scope made the remaining approval
return 409. The draft began with zero memberships and was never published.

Only this isolated database gained the three fixture courses, one draft and one
explicitly approved membership (counts 1,498/21/18); its protected group and original
catalog were preserved. Temporary-schema tests independently verify unequal
three-member means, two-member equality, partial-acceptance gates, manual overrides,
source/scope locking, compatible aliases, immutable revisions and populated legacy
migration reruns.

The final built-worker verification, after migration 006, used an unavailable
model origin and successfully reused all four real vectors without inference:
operation `fdf3eb6b-e8ad-449b-b407-82b9d075d1bc`, generated 0, reused 4, complete.
Swagger exposes 36 fixed embedding endpoint paths. Existing inbox response shapes
and frontend source remain unchanged.

## Cancellation and explicit recovery

During real forced generation, SIGINT returned exit 130 and confirmed backend
cancellation in 27.17 ms. Operation `6a24179c-8ac9-4377-b230-abbcb217216f` retained
one committed revision; explicit resume reused it and generated the remaining two
against the same frozen manifest. The resumed operation completed in about two
seconds. API/CLI tests also cover lease expiration, competing claims, lost delivery
responses and delivery-only retry with no model transport.

At the 10,000-course capacity scope, cancellation during exact matching CPU work
acknowledged in 14.27 ms, preserving all 10,100 revisions and committing no
suggestions for that cancelled operation
`9c5028d0-0c2e-4556-a28b-ae84afd9452c`. These are healthy local measurements, not
an availability guarantee during backend/database outages. The CLI reports
confirmed versus unavailable cancellation and requires explicit recovery.

## Preferred-policy synthetic capacity

This is a separate synthetic capacity run, not the lab benchmark or real-catalog
quality evidence. Database: `dorob_embedding_capacity_1792239980`. Hardware: Apple
M4, 10 logical CPUs, 16 GiB RAM, macOS arm64. Scope: 10,000 courses, 100 groups,
1024 dimensions. Settings: matching >=.60, 20/group; neighbors >=.60, k=12;
all-member coherence >=.70; minimum size 2; suppression only Jaccard >.80;
at most five reconciliation groups; 10,000-set cap and 120-second algorithm budget.

Deterministic synthetic unit vectors replace model inference. Backend and worker
ran in the same process for combined RSS measurement; PostgreSQL memory is excluded.
Actual HTTP, all vector writes/reads, pgvector persistence, preferred-policy exact
matching/discovery, suppression, reconciliation, result persistence and matching
suggestion delivery are included.

| Measurement | Actual result |
| --- | --- |
| End-to-end elapsed | 210.019 seconds |
| Peak combined backend/worker RSS | 423,542,784 bytes (403.92 MiB) |
| Matching stage | 12.047 seconds |
| Discovery stage | 92.288 seconds |
| Reconciliation stage | 0.766 seconds |
| Vector-generation/storage stage (synthetic inference) | 79.725 seconds |
| Saving results | 9.378 seconds |
| Delivery | 8.024 seconds |
| Retained vector revisions | 10,100 |
| Discovery candidates | 1,024 |
| Matching suggestions | 1,000 |
| Outcome | Complete, no exclusions or partial coverage |

Stage timings are sampled from progress transitions and include adjacent transport
costs; they are not profiler attribution. Algorithm stages total about 105 seconds,
inside the 120-second combined budget. Operation
`0b96c59f-0a8a-49a9-8733-b31769b9628f`, run
`be39764a-8524-4aaa-b4d8-76d75c3bd1fb`, completed. This controlled geometry does not
cover every possible overlap distribution or measure real-model generation time.
Oversized scopes are rejected; missing vectors/candidate/time limits are disclosed,
and incomplete delivery/approval requires explicit partial selection/acceptance.

## Reproduction, artifacts and limitations

Test/acceptance helpers live under `apps/api/scripts/`: `embedding-acceptance.ts`,
`embedding-real-cancel.ts`, `embedding-benchmark.ts`, and
`embedding-capacity-cancel.ts`. They guard isolated acceptance/capacity database
names and use real HTTP workers. They depend on the locally prepared restored
acceptance databases and private `/tmp` metadata; do not run them against the
working database. The ordinary documented CLI and tests are the supported entry
points. Acceptance databases remain available locally for inspecting saved history.

Private reports under `apps/api/storage/embedding-acceptance/`:

- `real-dorob_embedding_accept_20261017_122109-1792239895291.json`
- `real-cancellation-dorob_embedding_accept_20261017_122109.json`
- `capacity-dorob_embedding_capacity_1792239980.json`
- `cancel-dorob_embedding_capacity_1792239980.json`

An earlier walkthrough exposed numeric binding precision loss in the compatibility
percentage and was retained as a failed report. Exact decimal-string binding fixed
replay; regression tests and the successful walkthrough above verify the correction.
The capacity run uses no ANN indexes or real[] persistence fallback.

Final checks: 63 API tests (678 assertions) and 181 engine/core/worker/frontend/
utility tests (445 assertions) pass. Workspace lint/types and backend/engine/worker
production builds pass. The frontend production build retains the existing Bun
CommonJS page-data runtime failure after successful compilation/type checking.
See [validation](validation.md) for commands and scope.

This remains experimental local development: no authentication/deployment,
automatic ingestion hooks, daemon/scheduling, generative naming/judging, calibrated
quality promise, new frontend implementation, automatic placement or publication.
The existing inbox's reported-confidence wording is an accepted limitation; raw
matching cosine and discovery-member mean evidence remain separately inspectable.
