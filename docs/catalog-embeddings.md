# Local catalog embedding workflow

This experimental backend/CLI workflow generates immutable local BGE-M3 vector
revisions, matches courses against group definitions, discovers coherent overlapping
sets, and submits candidates for editorial review. It adds no frontend UI,
automatic assignment, publication, scheduling or deployment authorization.
The independent [lab](../apps/embedding-lab/README.md) and its evidence remain separate.

## Setup and explicit commands

Use the [bundled pgvector database](pgvector-migration.md), API environment setup
and `bun run db:migrate`, then `bun run dev:api`. Migrations 005–006 add application
embedding tables and integrity constraints without modifying migrations 001–004
or existing catalog facts. All six migrations are active in the working database.
`./run.sh` supplies the local API configuration and also applies migrations.
Start the already-installed local Ollama runtime with `ollama serve` if needed;
installing/downloading a model is a separate action. The selected installed model
is `bge-m3:567m` (1024 dimensions); missing runtime/artifact fails without fallback.

```sh
bun run worker:embeddings --help
bun run worker:embeddings generate --scope groups
bun run worker:embeddings generate --scope courses --course 'maktabkhooneh:10196'
bun run worker:embeddings generate --scope courses --course 'maktabkhooneh:10196' --force
bun run worker:embeddings match
bun run worker:embeddings discover
bun run worker:embeddings both --json
bun run worker:embeddings status OPERATION_UUID
bun run worker:embeddings cancel OPERATION_UUID
bun run worker:embeddings resume OPERATION_UUID
```

UUID/HASH placeholders must be replaced with actual saved IDs. Generate never
matches/discovers/delivers. Match/discover/both generate missing eligible vectors
and otherwise reuse exact compatible revisions. With no IDs, applicable course
and group scope defaults to all; repeat `--course ID`/`--group UUID` to select
subsets. `generate --scope courses|groups|all` excludes the other entity kind.
Invalid scope and no-argument help perform no work. Discovery can select group
definitions for reconciliation without assigning memberships.

`--backend-url` (or `DOROB_BACKEND_URL`) defaults to `http://127.0.0.1:3001`.
`--ollama-origin` (or `DOROB_OLLAMA_ORIGIN`) defaults to
`http://127.0.0.1:11434`. Both require credential-free loopback origins, with no
path/query/fragment/redirect following. `--model` selects an exact installed alias.
`--configuration-id HASH` uses a saved expected configuration; generation still
verifies the installed artifact when vectors are missing. No direct worker SQL
or database credentials are used.

Build with `bun run build:embedding-worker`; the same commands are available via
`bun apps/embedding-worker/dist/cli.js`. Source and built no-argument help exit
without work. Exit codes: 0 success, 1 work/network/runtime failure, 2 invalid
arguments, 130 cancellation. `--json` emits one final stdout JSON document;
progress goes to stderr without terminal-control sequences.

## Startup errors

The worker names the failed service and its configured address. If Ollama is
unavailable, the error says `Cannot connect to Ollama at http://127.0.0.1:11434`
and tells you to start `ollama serve` in another terminal, keep it open, then retry.
`./run.sh` starts Dorob and PostgreSQL; it does not start Ollama. If the API is
unavailable, the error names the Dorob backend and recommends `./run.sh`.
Timeouts identify the service and deadline; model HTTP errors identify Ollama,
the status and endpoint. Use `ollama list` to check installed model names.
No raw network exception or upstream response body is needed for recovery.
The same actionable message is retained in `--json` output. If an operation ID
was printed, inspect its saved status before choosing resume or a new run.

## Inputs, identities and storage

The [application-owned engine](../packages/embedding-engine/README.md) defines
`educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa`. It preserves Persian
negation/ZWNJ while normalizing NFC, Arabic yeh/kaf and whitespace. Educational
input is capped at 64 KiB with missing/omitted fields retained, UTF-8-safe 4 KiB
chunks, batches of at most four chunks and byte-weighted normalized pooling.
Title-only courses are sparse and excluded. Protected test group
`99fc95d2-868f-48a8-a6a0-a5c2fad96b1f` is excluded even when explicitly selected.
Unready images do not hide management courses from capture.

Courses use retained title/description/education/syllabus; groups use their own
title, category, target level and scope, never memberships or member embeddings.
Dedicated price/image/instructor/rating/collection-time fields do not determine
vectors. Price-only refreshes retain educational identity. Capture uses bounded
repeatable-read and atomically finalizes a manifest; inference starts afterward.
Retry preserves finalized inputs; a fresh command captures new source facts.
Capture has a 30-second bound; the client allows 35 seconds for that endpoint.

PostgreSQL stores `vector(1024)`, not real arrays or approximate indexes.
Configurations retain exact model name/digest/dimensions/processing identity.
Compatibility uses the exact artifact digest, dimensions and representation;
model names alone never establish it. Revisions are append-only, checksum-verified
float32 values with original source/input/configuration references and timestamps.
Normal generation selects a compatible preferred revision; force creates another
revision. Replay of the same operation/entity returns its accepted revision.
Preferred references update only after successful vector acceptance. Runs freeze
selected revision IDs, so later regeneration cannot rewrite historical results.

Additive tables retain configurations, manifests/entities, operation/attempt history,
preferred references, revisions/selections, runs/result batches, candidates,
review/history, promotions, delivery plans and separately linked suggestion evidence.
Immutable triggers protect source/vector/result/review evidence. Mutable execution
state and preferred references are separate. Back up PostgreSQL and hosted image
files together; no automatic evidence cleanup is implemented. The migration report
records the complete restore-tested pre-work backup and retained original volume.

## Bounds, progress and recovery

Exact matching uses raw cosine >=.60 before the per-group limit of 20, with
canonical ties and independent multi-group eligibility. Discovery uses >=.60
neighbors, k=12, every-member coherence >=.70, minimum size 2, exact-set collapse,
and suppression only at Jaccard >.80. Size, mean score and canonical members order
suppression. Reconciliation retrieves at most five centroid-near definitions and
retains direct passing/failing member scores; it makes no exhaustive novelty claim.

Default caps are 10,000 courses, 100 groups, 10,000 candidate sets and 120 seconds
of combined algorithm work, excluding inference. Oversized scopes are rejected.
The engine stores vectors/neighborhoods rather than an N×N score matrix and yields
between bounded blocks. Source exclusions and incomplete computation are distinct.
Caps/timeouts/ownership loss do not silently authorize delivery. `--allow-partial`
permits explicitly flagged partial results; approving those requires separate
partial acceptance. A failed stage retains operation progress and accepted evidence.

The CLI prints durable operation/request IDs, stage, processed/total, generated,
reused/excluded counts, elapsed time and partial state. One database-owned execution
slot spans CLI clients. Claims last 15 seconds, with two-second heartbeats and
fenced mutations. Expired claims become interrupted and require explicit retry;
API startup never resumes work. No transaction spans inference or algorithm work.

Ctrl-C/remote cancellation abort inference and stop at bounded CPU/HTTP boundaries;
healthy cancellation targets five seconds. Backend/network outages are reported
as unavailable rather than confirmed cancellation. Completed deliveries survive.
Completion/cancellation races are decided by the persisted terminal transition.
Regular backend HTTP requests have five-second deadlines and a bounded retry;
local inference has a 60-second deadline. Request bodies are bounded at 2 MiB;
worker pages use 16 entities and result uploads at most 100 items per batch.

`resume`/`retry` creates another attempt over the same finalized manifest. Completed
results support delivery-only retry with no model access. Stable requests, vectors,
result-batch IDs and promotion/member IDs reconcile lost responses. For uncertain
initial registration, rerun the identical command with its printed `--request-id`.
Fresh input requires a new command/request ID. No automatic retry of interrupted
work is scheduled.

## Scores and the existing inbox

Matching uses `course-group-cosine-v1`; discovery promotion uses
`discovery-member-mean-cosine-v1`, the mean exact pairwise cosine to every other
member. Both map to the legacy `confidencePercent` as raw score ×100 without
pre-storage rounding. Decimal strings preserve the computed percentage through
PostgreSQL numeric storage. Thresholds and ordering use raw cosine, not display
rounding. These are experimental system scores, not calibrated confidence.

Distinct descriptive system names identify score meaning. Existing frontend
validators, suggestion/member response fields, selected-suggestion FK, review
versions, sticky rejection, manual overrides and immutable history are retained.
The unchanged UI still says «اطمینان اعلام‌شده» and has no raw-evidence view;
this is an accepted temporary wording limitation. Rich evidence is read separately.
External suggestion submissions cannot attach evidence or use worker-reserved
system IDs. Controlled internal delivery links suggestions/evidence atomically.

Educational currentness is recomputed at reads/delivery/ordinary approval/promotion.
Approval and promotion hold suitable parent locks against source/definition edits.
Stale evidence conflicts with 409; regenerate or use explicit manual curation.
Changing model selection does not itself stale old source evidence. Completed
approval replays retain their recorded result. No existing membership is retracted.

## Discovery review and promotion

```sh
bun run worker:embeddings inspect CANDIDATE_UUID
bun run worker:embeddings review CANDIDATE_UUID --version 0 --decision approved
bun run worker:embeddings promote CANDIDATE_UUID --version 1 \
  --title 'عنوان نمونهٔ صریح ویرایشگر' --slug example-draft \
  --description 'دامنهٔ آموزشی صریح ویرایشگر' --category code
bun run worker:embeddings promotion-retry PROMOTION_UUID
bun run worker:embeddings accept-partial RUN_UUID
```

The Persian fields above are labelled examples. Supply actual owner-selected group
fields and optional `--level beginner|intermediate|advanced|mixed`. Review supports
pending/approved/dismissed with expected version, optional title/note and immutable
history. Candidate approval approves promotion eligibility, not memberships.
Suppressed/stale/unapproved/unaccepted-partial candidates cannot be promoted.

Promotion atomically creates one **empty unpublished draft**, provenance and a
planned suggestion for **every** member. It does not embed the new definition,
apply a new-group threshold, infer suitability, assign members or publish.
Suggestions retain within-set mean provenance and the exact supplied group scope
as a currentness dependency. Source/scope changes can stale later approvals.
Bounded delivery follows the committed plan; explicit retry cannot duplicate the
draft or reopen decisions. Later matching against that draft is a separate command.

## HTTP evidence and local trust

All new routes live under `/api/v1/manage/embeddings`, separate from strict legacy
responses. Swagger documents bounded bodies and safe 404/409/422/503 responses.

| Family | Operations |
| --- | --- |
| `/configurations` | POST expected configuration; GET `/:hash` |
| `/operations` | POST register; GET `/:id`, `/:id/request`, `/:id/run` |
| `/operations/:id` | POST `/capture`, `/claim`, `/cancel`, `/retry`; GET `/inputs` |
| `/heartbeat`, `/finish` | POST fenced progress/terminal state |
| `/vectors` | POST immutable revision; POST `/read` compatible selection pages |
| `/results` | POST `/reuse`, `/begin`, `/batch`, `/finalize`, `/delivery` |
| `/manifests/:id`, `/revisions/:id` | GET exact frozen scope or immutable vector/source identity |
| `/runs` | GET pages; GET `/:id`, `/:id/revisions`, `/:id/discoveries` |
| `/runs/:id/accept-partial` | POST explicit run partial acceptance |
| `/suggestions/:id/evidence` | GET exact raw score/provenance/currentness |
| `/discoveries/:id` | GET typed candidate; GET `/evidence`, `/overlap`, `/history` |
| `/discoveries/:id` | POST `/review`, `/promote` |
| `/promotions/:id/delivery` | POST explicit delivery/retry |

GET pages use bounded `limit`/`offset`; discovery listing accepts `suppressed=true`.
Overlap links are independently paginated; the candidate carries `overlapCount`.
No API field selects arbitrary SQL, commands, filesystem paths or inference origins.
Worker routes reject non-loopback hosts and foreign browser Origins when present.
This remains trusted local development without authentication or verified caller
identity; do not expose it on shared networks. Deployment/authentication are deferred.


## Verified acceptance

All 24 integration tasks are complete. See [results and limitations](embedding-results.md)
for actual run IDs, installed model identity, isolated review/draft acceptance,
10,000-course capacity, cancellation measurements and original-data preservation.
API/engine/worker builds, workspace lint/types and 244 combined regression tests pass.
The existing frontend production build still fails during page-data collection in
Bun's CommonJS runtime after compilation/types succeed. No frontend code was changed.
