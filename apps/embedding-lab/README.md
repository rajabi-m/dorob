# Dorob embedding laboratory

A separate Persian RTL workbench for inspecting local course similarity experiments.
It never submits suggestions, edits membership, creates groups or publishes. The
application, database, ingestion tools and `run.sh` do not start it.

## Start and check

Use the repository's Bun 1.3.8 installation and existing lockfile:

```sh
bun install --frozen-lockfile
bun run build:lab
bun run start:lab
# http://127.0.0.1:3010
```

`bun run dev:lab` builds the browser bundle and watches the lab server. Re-run
`bun run build:lab` and reload after browser-source edits. `LAB_PORT=3017 bun run
start:lab` selects another loopback port. No catalog or inference request happens
on startup. Empty installations show setup guidance; saved results open offline.

```sh
bun run lint:lab
bun run typecheck:lab
bun run test:lab
bun run build:lab
bun run lab help
```

These focused commands are separate from existing root application checks.
The React, font and TypeScript versions match existing workspaces; there is no
new framework, vector database, native extension or remote inference dependency.

## Capture and model selection

Explicitly start the existing local catalog API separately, then capture through
GET-only management routes. The dated example excludes the owner's test group:

```sh
bun run lab capture --origin http://127.0.0.1:3001 --exclude-groups '["99fc95d2-868f-48a8-a6a0-a5c2fad96b1f"]'
bun run lab model --name bge-m3:567m
```

Model registration queries an already running local Ollama. Install Ollama from
its official distribution and explicitly install your chosen BGE-M3 model yourself
if it is absent. The lab never downloads or silently switches models. It verifies
the full installed digest and 1,024 output dimensions. `LAB_OLLAMA_ORIGIN` may select
another HTTP loopback origin; remote inference origins are rejected.

Capture includes unready-thumbnail courses and exact current snapshot IDs, not
just publicly eligible courses. It paginates courses/groups/memberships and repeats
enumeration/membership reads. The capture interval is not a transactional database
snapshot. Failures, missing observations, drift and exclusions are saved. A failed
initial enumeration aborts without replacing any earlier capture. Later partial
reads produce explicit incomplete evidence. A new capture always creates a new
dataset; old experiments never fetch fresh application facts.

Validated dataset import: `bun run lab import --file /absolute/dataset.json`.
Only the versioned lab dataset DTO is accepted; arbitrary scraped/raw exports
must first be converted deliberately. `bun run lab validate --file file.json`
checks artifact shape/checksum. Source payloads, reviews and credentials are absent.

## Explicit experiments

Select a saved dataset and configuration in the workbench, choose course and group
scopes, then explicitly generate vectors or run matching/discovery. All courses
and groups in the dataset are initially selected. Generation fills only missing
eligible cache entries. To keep inference bounded, narrow the course selection
before generating. Missing vectors block experiments unless **اجرای صریح با پوشش
ناقص** is selected; sparse courses remain excluded. An empty selected group scope
allows course-only discovery without group vectors or reconciliation.

CLI operations use an explicit selection JSON. Paths supplied to `--file` and
`--selection` are relative to `apps/embedding-lab`, even from root commands.

```json
{
  "datasetId": "<dataset artifact ID>",
  "configurationId": "<configuration artifact ID>",
  "courseIds": ["provider:course-id"],
  "groupIds": ["group-id"],
  "allowPartial": false,
  "settings": {
    "minimum": 0.55, "limit": 20, "k": 20, "coherence": 0.65,
    "minSize": 2, "jaccard": null, "groupLimit": 5, "candidateCap": 10000
  }
}
```

```sh
bun run lab list --kind dataset
bun run lab list --kind configuration
bun run lab embed --selection output/selection.json
bun run lab match --selection output/selection.json
bun run lab discover --selection output/selection.json
bun run lab list --kind run
bun run lab show --kind run --id <run-id>
bun run lab compare --left <run-id> --right <run-id>
```

One writer/long operation is allowed at a time. UI shows progress and cancellation;
CLI SIGINT/SIGTERM cancels embedding/runs. Inference has a 60-second request timeout
and cancellation aborts the active fetch; exact comparisons yield between bounded
blocks. Successful vectors survive interruptions. Saved runs are immutable and
identical computation identities reuse completed results. Attempts retain separate
failure/cancellation evidence. Browser result lists load in bounded visible batches.

`minimum` is the raw cosine cutoff applied before the per-group `limit`, and is
also the discovery neighbor cutoff. `coherence` requires each new member to meet
the minimum against every member already retained. `k` limits seed neighbors;
`minSize` is at least two. Exact duplicate member sets collapse; optional `jaccard`
suppresses sets only when overlap exceeds the cutoff, retaining suppressed records
and their references. Shared courses are not assigned exclusively. `groupLimit`
bounds centroid retrieval; direct member scores determine provisional coverage.
`candidateCap` truncation explicitly marks a run partial. None of these settings
is calibrated or a production policy. Comparison details cap at 50,000 overlap
associations with a warning; split/merge association counts remain complete.
Associations reflect overlap, not verified semantic splits/merges.

## Inputs, cache and storage

The pure educational profile preserves source records and builds an embedding copy
from title, description, outcomes, prerequisites, audience, technologies, source
level and ordered syllabus titles. Group inputs use title, category label, target
level and scope, without member boosts. Dedicated prices, ratings, instructors,
images, IDs and provider-brand fields are excluded. Source descriptions may still
contain marketing language or provider names; inspect the actual text for bias.
NFC/line-ending/whitespace and Persian letter normalization preserve ZWNJ/negation.
Title-only courses are sparse; substantive educational evidence is required.

Profile `educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa` selects at most
64 KiB in versioned field order and chunks into at most 4 KiB each, with explicit
missing/omitted fields. Batches contain up to four chunks, with Ollama truncation
disabled. Chunk vectors are normalized, byte-weight averaged, then normalized.
Cache compatibility includes entity/educational input identity, exact model digest,
dimensions and representation versions. Price/time-only changes reuse vectors;
educational changes do not. Inspect these assumptions before judging quality.

Default artifacts are ignored under `apps/embedding-lab/output/`, or set an
absolute canonical `LAB_OUTPUT` path. Symlinked artifact roots/directories are
rejected. Preserve the whole root when backing up experiments:

```text
output/
  dataset/        immutable capture facts/provenance, SHA-256 IDs
  configuration/ immutable installed-model/profile identities
  vector/         validated normalized cache records
  run/            immutable manifests, exact inputs, results, settings
  attempt/        completed, failed and cancelled attempt reports
  feedback/       immutable flushed review events, latest effective labels
  evidence/       validated imported portable bundles
  .writer.lock    one-writer PID/creation marker while mutating
```

Artifacts use canonical JSON SHA-256 content checksums, portable catalog IDs and
schema version 1. Files are bounded to 256 MiB; collections have explicit count
limits. Temporary files are flushed and linked atomically without overwriting
completed artifacts. `.pending-*` remnants are ignored after interruption. Lock
recovery is explicit: inspect it, ensure the process stopped, then `bun run lab
unlock`. Live/ambiguous owners are never unlocked. PID reuse may require manual
inspection; do not delete an active process's lock. No automatic cleanup deletes
evidence. Model cache storage is JSON, intentionally simple rather than compact.

## Review and portable evidence

Pair/set feedback belongs to the exact run and target. Suitable, unsuitable and
uncertain labels, notes and optional manual set titles are local review events.
Retries carry stable event IDs. Older events remain; related earlier-run reviews
are context and never automatically transferred. A suitable label does not approve
catalog membership. Reviewed-sample fractions use suitable/(suitable+unsuitable),
exclude uncertain/unreviewed and disclose selection bias. No recall/accuracy claim
is inferred from imported memberships or the software passing checks.

The UI exports the selected run and imports a local evidence file. CLI supports
several runs sharing one dataset/configuration:

```sh
bun run lab export --runs '["<run-id>"]' --vectors false --file output/evidence.json
LAB_OUTPUT=/absolute/fresh-lab-root bun run lab reimport --file output/evidence.json
```

Vectors are opt-in (`--vectors true` / UI checkbox). Bundles include frozen facts,
selected exact inputs, manifests/settings/results and feedback. Reimports validate
versions, checksums and reference closure before writes, and reject conflicting
review-event identities. Results without vector arrays are inspectable offline;
new experiments still need compatible vectors or explicit generation. Reimport
into an existing root is retry-safe and never overwrites valid earlier artifacts.
The UI request cap is 32 MiB; use CLI for larger bundles up to the artifact cap.
Exports never submit to another service.

## Local boundary and known limits

The server binds `127.0.0.1`, validates Host, and requires matching Origin/JSON for
starts and local writes. Static files use a restrictive content policy. The browser
cannot supply inference origins or filesystem paths; source text renders through
React text nodes. There is no authentication, deployment mode or shared-network
support. Use a trusted local machine. Catalog capture origin is a CLI argument;
credentials and runtime settings are not bundled into browser code.

See the [dated results walkthrough](../../docs/embedding-lab.md) for real candidates,
weak matches, feedback/export evidence and separately measured synthetic capacity.
For reproducing the bounded sampling after capture/model registration:
`bun apps/embedding-lab/scripts/prepare-demo.ts` from the repository root writes an
explicit 51-course-style selection (six lexical title samples per category plus
imported members; exact size depends on data). Run generation yourself after
reviewing the saved selection. This helper never starts inference.

`bun apps/embedding-lab/scripts/benchmark.ts` explicitly runs the separate seeded
10,000-vector capacity benchmark. It saves `output/benchmark-10000.json`; no real
quality result is implied. Broad/rare topics, negation, source boilerplate, pooling,
top-k caps and greedy order sensitivity remain evaluation limitations. Main-app
integration, pgvector, generation-based judging/naming and scheduling need a later
reviewed proposal based on exported evidence.
