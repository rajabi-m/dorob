# Design

## Context

See proposal.md for motivation and scope. `apps/api` uses Bun/Elysia, native Bun SQL, checksummed additive migrations and PostgreSQL 17. Existing pools have a four-second statement timeout. `003_group_suggestions.sql` stores immutable percentage submissions, pair-level versioned decisions, selected-suggestion provenance and transition history. Rejection survives new submissions; explicit approval creates membership.

The existing core validators, API responses, Next proxy and frontend require confidencePercent and display «اطمینان اعلام‌شده». Discovery has no tables or endpoints. The lab has independent file-backed evidence and exact algorithms. The owner selected a CLI-operated HTTP client, no frontend work, pgvector, independent generation and retained embedding history.

## Goals / Non-Goals

**Goals:** make the backend own persistent evidence and review, run local compute outside HTTP lifetimes, reuse the existing inbox, support explicit recovery and preserve traceable model/input/vector identities.

**Non-Goals:** frontend modifications, an idle queue daemon, direct worker SQL, distributed queues, automatic inference, remote fallback/downloads, generative judging/naming, approximate indexes, deployment/authentication, automatic memberships/publication and consuming lab feedback as editorial approval.

## Decisions

### 1. Finite CLI jobs through backend HTTP APIs

Provide an explicit root `bun run worker:embeddings -- <command>` entry point with source and built forms. Commands include generate, match, discover, both, status, cancel, retry/resume and promote. With no command or invalid scope, show help/error without work. Execution prints operation ID, stage, processed/total counts, generated/reused/excluded counts, elapsed time, partial coverage, delivery status and safe errors, then exits with a documented outcome. No command waits indefinitely for unrelated queued jobs. Whole-catalog course/group scope is the default for applicable commands; optional explicit IDs narrow it. Discovery may select groups for reconciliation; generation can select courses, groups or both. Matching/discovery generate missing compatible vectors automatically; generate never runs either algorithm or submits suggestions.

The backend owns operation registration, frozen capture, vector reads/writes, claims, progress, results and delivery. The worker performs local Ollama calls and exact algorithms using bounded HTTP pages/batches, without DATABASE_URL or repository/SQL imports. Inference origins remain server-side CLI configuration, loopback-only, never arbitrary API request fields. Start/claim endpoints return promptly; they do not execute inference or algorithms. Example flow:

```text
CLI --> backend: register operation, capture inputs, claim attempt
CLI <-- backend: frozen input pages, compatible vector revisions
CLI --> local model: generate missing vectors
CLI --> backend: fenced vector batches and progress
CLI --> backend: bounded computed results and delivery request
CLI <-- backend: persisted outcome and review/evidence IDs
CLI: print summary and exit
```

Use fixed versioned local management endpoint families for embedding configurations, operations (start/claim/heartbeat/progress/status/cancel/retry/evidence/result/delivery), embeddings and discoveries (list/detail/review/promotion). Swagger and additive core DTOs specify pagination, size limits and safe 404/409/422/503 responses. No generic SQL/command/path proxy. Bind to loopback; reject foreign browser Origins when present and document that authentication is deferred. Existing frontend endpoints remain unchanged.

Use backend-owned, database-time leases and fenced writes, with at most one active embedding execution across CLI processes. Heartbeat every two seconds, lease 15 seconds; competing claims return conflict. No SQL transaction spans inference or client computation. Every mutation checks attempt ownership. API/database/CLI crashes leave evidence intact; expired work becomes interrupted, requiring explicit retry. Losing ownership aborts client work. API startup only exposes interrupted state and does not resume inference.

Ctrl-C requests backend cancellation, aborts inference and yields/checks between bounded CPU/storage/delivery batches. Also support cancellation from another CLI. Target acknowledgement within five seconds while backend/worker are healthy; disclose unavailable states. Use a 60-second inference deadline. Terminal transitions decide completion/cancellation races, disclose already committed deliveries and never erase them. Noninteractive output remains useful without terminal control sequences.

Retry/resume uses the same finalized frozen manifest and creates an attempt; refresh creates a new operation/manifest. A failed unfinished capture may start a new read snapshot before finalization. Delivery-only retries reuse committed results. Stable request and batch identities reconcile lost HTTP responses; conflicting replay returns 409. No automatic restart of an interrupted job.

### 2. Pgvector and append-only embedding revisions

Use additive migrations after 003; preserve existing migrations and immutable triggers. Supply pgvector through a pinned compatible PostgreSQL 17 image/build and enable the vector extension in the database. Never change the major version, delete/reinitialize the data volume or silently fall back to real[]. Verify existing data and isolated backup restoration before changing the owner's database/image. Ordinary rollback stops CLI use and retains additive data; extension removal/table drops are not rollback steps.

Store configurations, frozen manifests/entities, operations/attempts, embedding revisions, finalized run/candidate rows, deliveries, score evidence and discovery reviews/promotions. Embedding records reference entity type/ID, exact source snapshot/group definition, normalized educational input hash and processing/chunk/pooling version, model name, exact digest, dimensions, generation timestamp, revision ID, vector checksum and pgvector value. Initial BGE-M3 vectors use vector(1024); model support remains explicitly registered, never inferred from arbitrary labels.

The reusable identity is entity + educational input hash + model digest/dimensions + processing version. It can have several immutable revisions. Normal generation selects a verified compatible revision; force regeneration always creates a new revision, never updates the old vector. Replays of a forced operation/batch return its same revision rather than generating duplicates. Update a separate preferred-revision reference atomically on successful acceptance, leaving an earlier valid reference intact on failure. Freeze selected revision IDs per run so later regeneration cannot change historical results. A repeat request reuses a completed computation only when selected vector revision IDs and all computation inputs match.

Model name alone is insufficient: comparison requires equal exact digest, dimensions and compatible input/chunk/pooling versions. Course and group profiles are explicitly compatible versions of the educational representation. Verify installed model artifact/dimensions before and after generation batches, disable truncation and reject wrong count/dimension, zero/non-finite or invalid normalized vectors. Persist/validate float32 round trips and checksums. A different value for an already accepted revision is an integrity conflict. Expected configuration registration does not verify a model or start inference. No remote fallback, automatic model download or silent digest substitution.

Separate representation identity from algorithm thresholds/k; policy changes reuse embeddings. Retain old embeddings and completed evidence without automatic cleanup. Backend pages expose only bounded inputs/vectors and exact compatibility. Pgvector storage does not require ANN: initial matching/neighborhood comparisons remain exact in the worker; bounded SQL cosine queries may be used if they preserve identical scope/threshold/tie semantics and are measured. No HNSW/IVFFlat approximation is authorized by this change.

### 3. Educational capture and currentness

Backend capture freezes the explicit scope in repeatable-read, paging within a bounded transaction and atomically finalizing a manifest before generation. Course input comes from current retained educational facts: title, description, syllabus and supported learning fields. Group input comes from its own title, scope description, category and target level, not member embeddings or memberships. Preserve source facts, NFC/Persian normalization, ZWNJ and negation, missing/omitted metadata, a 64 KiB input cap, UTF-8-safe 4 KiB chunks, four-chunk batches and byte-weighted normalized pooling from lab fixtures. Title-only courses are sparse and excluded with reasons.

Dedicated price, image, rating, instructor, branding, collection time and membership fields do not determine vectors. Changes only to these fields reuse input identity; substantive educational changes require another embedding on the next explicit operation. Management-only courses/unready thumbnails remain inspectable. Do not scrape sources. A server-owned exclusion registry protects test group 99fc95d2-868f-48a8-a6a0-a5c2fad96b1f; CLI selection cannot override it.

Currentness is recomputed against educational identities at evidence reads, delivery, embedding-origin approval and promotion. Keep source staleness distinct from a configuration being superseded. Model selection for a new operation does not rewrite old runs. Recheck source identities with suitable course/group locks in approval/promotion transactions to exclude ingestion/scope-edit races. Stale evidence remains inspectable; ordinary approval conflicts, with explicit regeneration or separate manual curation available. Existing memberships are never automatically retracted.

### 4. Exact application-owned algorithms

Port pure input/vector/matching/discovery/reconciliation behavior into a server-only application package outside the lab. Keep lab code, commands and evidence untouched and test compatibility with fixtures. Core exposes browser-safe DTOs only.

Matching keeps raw cosine >=.60 before a default per-group limit of 20, with canonical-ID ties. Courses can qualify for multiple groups; empty drafts use their definitions. Discovery uses >=.60 top-k neighbors (k=12), deterministic greedy complete-link pruning with >=.70 every-member coherence and minimum size 2. Collapse exact member sets, then order by descending size, mean pairwise score and canonical membership; suppress only Jaccard>.80, retaining suppression provenance/overlap. Reconcile against at most five centroid-retrieved existing group definitions, scoring members directly at >=.60 without assignments. Matching and discovery do not boost one another or use existing memberships as training labels.

Default limits are 10,000 courses, 100 groups, 10,000 candidate sets and 120 seconds algorithm time excluding inference. Reject oversized requested scopes rather than silently taking a prefix. Keep O(N*D + N*k) resident storage and yield between bounded blocks. Caps/timeouts/missing vectors produce explicit coverage and unfinished-attempt states. No partial delivery by default; explicit allowPartial permits flagged results, with explicit partial acceptance before approval/promotion. Synthetic capacity evidence must use this preferred policy, including suppression/reconciliation and HTTP/database costs; prior lab benchmarks are not a substitute.

### 5. Existing suggestion contract with separate exact evidence

Keep confidence_percent non-null and all existing external POST/list/member-review response shapes, validators, selected-suggestion FK, review versions and immutable history. No separate cosine inbox and no frontend edits. Matching submits confidencePercent=100*rawCosine for qualifying >=.60 pairs through the existing suggestion service, with stable worker system/submission identities. Raw comparisons/order/cutoffs use unrounded values. The compatibility percentage is a declared system score, not calibrated confidence. Use distinct descriptive system names for matching and discovery submissions.

Add immutable backend evidence linked one-to-one to each worker-created suggestion: score kind (course-group cosine or discovery-member mean cosine), raw score, display mapping version, exact run/candidate/configuration/vector/input references, coverage and currentness dependencies. Expose it through separate paginated/detail backend reads; never add fields rejected by strict legacy response validators. Internal atomic delivery links evidence and suggestion, shares existing pair decisions and returns compatible responses. External callers cannot forge worker-owned evidence/system identities. Replay is once per run/pair, or promotion/member for discovery; batch deliveries have durable cursors and fencing. New submissions never reopen rejected pairs, change selected approval provenance or remove membership.

Ordinary review endpoints recognize linked embedding evidence and check educational currentness/explicit partial acceptance in the same transaction before new approval. Legacy submissions remain unchanged; repeat successful identical approvals return recorded outcomes. Backend error details/documentation explain staleness even though existing UI offers only its generic conflict handling. Membership responses still expose legacy compatible suggestion fields; richer evidence is available separately. Existing UI continues showing «اطمینان اعلام‌شده» and has no raw-evidence view: explicitly document this accepted temporary semantic limitation.

### 6. Backend discovery review and explicit draft plus suggestions

Persist exact run/member-set identity, vector/source references, representatives, mean/minimum pairwise coherence, overlap/suppression and bounded per-member reconciliation. Paginate retained/suppressed views. Mutable versioned review is pending, approved or dismissed, with optional manual title/note and append-only history. Approval here approves a candidate for promotion, not any course assignment. Changed runs/member sets do not inherit decisions; related sets provide context only.

The explicit CLI promote command calls a backend API with approved retained candidate ID/version, request UUID and owner-supplied Persian title, unique ASCII slug, scope description, supported category and nullable level. Promotion requires current source evidence and explicit partial acceptance where needed. It creates one empty unpublished draft plus a durable promotion record and an immutable planned suggestion batch. No new group-definition embedding, >=.60 group-match filter or inference is required for promotion.

Every candidate member is suggested to that draft. Define discovery-member-mean-cosine-v1 as the mean of that member's exact pairwise cosines to all other members of the retained set; confidencePercent=100*that mean, with no pre-storage rounding. Sets have at least two members and coherence >=.70 under the initial policy. This score describes within-set similarity, not course-to-new-group suitability. Store raw member mean, pairwise evidence, formula version and candidate identity separately; editable new group fields do not alter the frozen score. Creation binds the submitted group definition as an approval-currentness dependency, so subsequent substantive group edits stale these suggestions without pretending the definition was embedded.

Commit the draft/provenance/planned deliveries atomically; deliver suggestions in bounded retry-safe batches through the shared ledger. Report draft-created versus suggestions-pending/complete distinctly. A response lost after creation returns the original draft and resumes only remaining deliveries for identical content. Conflicting UUID/content, review version or unrelated slug returns 409 without overwrites. Unique promotion per candidate prevents duplicate drafts. The explicit promotion request authorizes its bounded suggestion delivery; failures require an explicit CLI retry, not background inference. No memberships/publication occur, and later explicit matching against the draft is independently available.

### 7. Preservation and acceptance

Before first owner-database writes/image changes, make a complete ignored pre-work backup, record checksum/location and verify restoration with catalog/review fingerprints in an isolated pgvector-capable PostgreSQL 17 instance. Use isolated populated databases for migration and HTTP acceptance first. Never restore the owner's working database without explicit instruction. Preserve current lab evidence and protected group/memberships/publication throughout demonstrations.

## Risks / Trade-offs

- Existing confidence wording can imply probability: retain clearly attributed score kinds in system names, document the compatibility mapping and provide exact backend evidence; defer UI relabeling.
- Discovery-based percentages do not test the supplied group scope: submit all members as requested, explicitly identify that basis and require ordinary individual review.
- Model aliases/revisions or processing changes can mix vector spaces: compare exact compatibility metadata and freeze revision references, including force-regeneration results.
- HTTP outages can lose responses: durable requests/batches, fenced claims, bounded retries and readback prevent duplicate evidence/drafts/submissions.
- Pgvector setup changes database infrastructure: pinned same-major image/build, isolated restore verification and existing-data fingerprints precede owner changes.
- Exact preferred-policy cost may exceed limits: measure real elapsed/memory/HTTP/database costs, preserve partial provenance and report failures honestly.
- Negation, broad topics and marketing text can defeat cosine quality: preserve evidence and editorial review; make no favorable quality-score gate or accuracy claim.

## Migration Plan

1. Verify isolated backup restoration and compatible pgvector installation without changing existing migrations or the working data volume.
2. Add backend embedding/revision/operation/discovery/evidence schema and APIs; verify populated legacy contracts unchanged.
3. Add pure engine, finite HTTP CLI and commands with progress/recovery/generation-only/force-regeneration documentation. Do not modify run.sh to launch work or add a worker Compose service.
4. Demonstrate bounded real runs and discovery promotion in an isolated restored database or explicit temporary records; verify existing UI consumes compatible suggestions without source edits.
5. Stop CLI operations for rollback; retain extension, vectors, frozen evidence, suggestions, decisions and memberships. Restoring/deleting data requires separate instruction.

## Open Questions

No product-scope question remains. During apply, verify the installed model digest/dimensions, select/test an available pinned pgvector-capable PostgreSQL 17 build, and measure catalog coverage/performance. Report environment failures without silently changing model, algorithms or scope.
