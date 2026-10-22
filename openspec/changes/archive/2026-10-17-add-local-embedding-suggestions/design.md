# Design

## Context

See proposal.md for the revised intent. All 20 implementation tasks are complete; implementation and acceptance evidence are recorded in docs/embedding-lab.md and docs/validation.md. Its earlier draft proposed pgvector, production cosine suggestion contracts and main-admin changes; these remain outside this laboratory change and are implemented separately by integrate-catalog-embedding-workflow. The existing change ID describes the independent laboratory without modifying the main specs.

Dorob already has a Bun workspace, TypeScript, React, retained v3 observations and read-only management routes. Catalog lists and group details have bounded offset pages; current observation reads expose a retained snapshot or a missing observation independently of public thumbnail readiness. Main group/suggestion APIs support editorial decisions and must remain unchanged. Existing membership is sparse editorial evidence, not exhaustive ground truth.

The earlier planning inventory reported local BGE-M3 through Ollama, 1,024-dimensional output and an M4/16 GB environment. Recheck the runtime and artifact during implementation; the smoke test was not a retrieval benchmark. The future evaluation target is 10,000 courses, not an assertion that today's catalog has that many.

## Goals / Non-Goals

Goals: inspect actual results in a usable Persian product, compare settings without repeated inference, discover overlapping topics, capture owner feedback and preserve portable evidence for a later integration decision.

Non-goals: production embeddings or APIs, pgvector, schema/Compose changes, production suggestion submission, catalog mutations, autonomous publication, scheduled work, a distributed job service, generative naming/judging and required projection plots. No installed-runtime or quality claim is made by this planning update.

## Decisions

### 1. Independent local workspace and file storage

Implement apps/embedding-lab with Bun/TypeScript core orchestration, React UI, and a minimal loopback HTTP service. Use the existing React version and bundled Vazirmatn/design tokens where browser-safe; do not import Next server modules or production repositories. Use Bun's build tooling for a small browser bundle rather than introducing another application framework. Add explicit lab commands, separate from run.sh and ingestion. Resolve exact build/runtime APIs against installed documentation during implementation.

Keep a configurable server-owned artifact root, defaulting to ignored apps/embedding-lab/output/. Store datasets, configurations, vector cache, immutable completed runs, attempt reports and append-only feedback events as versioned JSON/JSONL or bounded binary vector artifacts with manifests/checksums. Write temporary files then atomically rename; a single local writer lock serializes mutations and reports conflicting processes rather than risking corruption. Feedback writes are flushed before success is returned. Browsers see opaque dataset/run IDs, not filesystem paths. Export/reimport validates references, sizes, versions and hashes without overwriting unrelated artifacts.

Alternative: reuse main PostgreSQL/admin. Rejected for this experiment because it entangles evaluation with schema compatibility and editorial operations. File artifacts also make comparing and sharing local experiments straightforward; a storage interface leaves future migration possible without implementing one now.

### 2. Read-only capture followed by frozen offline work

An explicit CLI import can consume a validated local bundle or GET existing management routes: paginated /api/v1/manage/courses, /api/v1/manage/courses/:courseId for retained current facts, /api/v1/manage/groups and complete paginated group membership reads. Do not use public eligibility as the dataset filter. The importer has no mutation methods or direct SQL access. Any backend credentials/configuration stay server-side and are omitted from saved datasets/logs.

Capture canonical IDs, provider/title/source URL, selected educational facts, snapshot ID/collection time, group title/description/category/target level and memberships. Do not retain raw payloads, reviews, credentials or unrelated personal data. Record capture start/end, origin without secrets, counts, explicit scope/exclusions, failures, schema version and content checksum. Validate duplicate IDs, membership references, bounded input sizes and available source fields. Re-enumerate identities/totals to detect pagination drift; describe this as a capture interval, not a transactional database snapshot. Immutable snapshot references identify the exact selected observations even if newer observations arrive later. Inconsistent or partial captures require explicit user selection, show coverage, and cannot be called a complete catalog. A fresh import creates another dataset, never silently refreshes an experiment's data.

The owner's test group remains excluded by explicit capture/run selection in documented live examples. Its records are never changed. Once captured, browsing, matching, discovery and feedback need no application connection. Generation alone needs Ollama.

### 3. Reusable versioned educational representation

Create a pure input builder owned by the laboratory initially, with documented portable DTOs rather than modifying main public contracts. Course fields: title, substantive description, outcomes, prerequisites, audience, technologies, provider level and ordered syllabus titles. Group fields: title, category label, target level and scope description. Exclude group members, IDs/slugs, price, ratings, timestamps, instructors, images and provider branding from embedding text. Member references remain available for display/evaluation. Preserve negation in scope text and disclose that embeddings may miss its meaning; no inferred suitability explanation is generated.

Normalize only the embedding copy: NFC, line endings, repeated whitespace and consistent Persian/Arabic letter variants; retain source text and ZWNJ. Version field order and truncation. Initial profile cap: 64 KiB UTF-8 with deterministic field priorities and syllabus order, explicit omissions and coverage. Split into UTF-8-safe chunks of at most 4 KiB, including all chunks and byte weights in the input identity. Call local Ollama with silent truncation disabled. Normalize each vector, byte-weight-average and normalize again. Bounds/pooling are experiment assumptions, not proven optimal; changing them creates a new configuration and another comparison run.

Cache identity includes entity type/ID, educational input hash, exact model digest, dimensions, input-format, chunking/pooling/normalization versions. Validate output count, dimensions, finite values and nonzero norm. Verify the model artifact remains selected before accepting batches. Initial model selection is BGE-M3 with its resolved installed digest; do not download or switch a model silently. A price-only import can reuse matching vectors. A substantive edit or changed configuration cannot. Sparse title-only profiles are inspectable but excluded from matching/discovery. Keep successful entities after failures and generate missing entries on the next explicit invocation; no durable queue is required.

### 4. Explicit operations and immutable run manifests

Expose import, embed, match, discover, compare and export commands. The UI can explicitly start embed/match/discover using a selected dataset and settings; starting the server or opening a result starts no computation. One long operation runs at a time, with progress, bounded timeouts and cancellation between bounded batches. Reject a conflicting start with a useful message. The local HTTP API serves dataset/configuration/run lists and details, starts selected operations, reports status/cancellation and appends feedback. It has no forwarding endpoint to production mutations.

Computation identity hashes dataset, exact selected vector references, selected entity IDs/exclusions, input/model configuration, operation/algorithm version and parameters. Reuse completed identical results. Attempts have separate identities for errors/timing; cancelled or failed runs never impersonate a completed run. Missing vectors block by default; explicit partial execution records exact excluded IDs and a partial-coverage label. Chunk inference calls and exact vector comparisons; keep only bounded nearest-neighbor results rather than an N-by-N matrix. Benchmarks record elapsed time, peak memory, batch size and candidate coverage; 10,000 courses is a test target, not a promised latency. Truncation of a top-k neighborhood is disclosed.

### 5. Existing-group matching stays independent

For every selected group, compute exact cosine with all eligible course vectors under one compatible configuration. Apply a visible experimental minimum, then a per-group result limit, with course-ID tie-breaking. Return several groups for a course when independently qualified. Empty draft groups work from their definition; no existing membership is required. Display retained membership separately. Known members are not the only positive examples and missing memberships are not negative examples.

Keep this first baseline free of member-centroid boosts, lexical blending or generative reranking. Its results are exploratory and may be viewed at any valid user-selected threshold. Remove the previous mandatory 90%/30-held-out acceptance gate: nothing is submitted to production in this experiment. Future commissioning needs its own reviewed evaluation and integration change.

### 6. Overlapping neighborhood discovery baseline

The initial method is deterministic overlapping neighborhoods with pairwise coherence pruning, not exclusive partitioning. It is intentionally small enough to inspect and compare before choosing a more complex clustering family.

1. Compute each eligible course's bounded top-k course neighbors above a discovery cosine threshold, excluding itself, in exact blocks with stable ID ties. Every eligible course can seed a set, including already assigned courses.
2. For each seed, traverse candidates by descending seed similarity. Add a candidate only if it meets the configured minimum cosine against every currently selected member. This greedy complete-link constraint prevents a bridge alone from merging unrelated ends of a similarity chain. Keep sets with the user-selected minimum size, at least two.
3. Canonicalize member IDs, collapse exact duplicate sets and compute mean/minimum pairwise similarity and a medoid representative (highest mean similarity, stable ID tie). Preserve shared courses across remaining sets. Do not use connected components as the grouping rule.
4. Optionally suppress near-identical sets using a visible Jaccard cutoff: sort by size descending, then mean similarity descending and canonical member IDs; suppress a later set only if its Jaccard overlap exceeds the cutoff against a retained set. Record suppressed sets and reasons. A shared member alone never triggers suppression. Turning this filter off is supported.

Parameters include neighbor k, seed/discovery threshold, pairwise coherence minimum, minimum size and optional deduplication cutoff. Validate ranges; initial UI presets are labelled uncalibrated. This baseline is order-sensitive despite deterministic ordering, favors tightly similar courses, can miss broad or rare useful topics and is limited by k. Candidate count/time caps produce explicitly partial runs. Record all of this for comparison. Pairwise coherence checks use bounded per-seed sets and block/cache limits; no unbounded all-pairs graph or clique enumeration is required.

Alternative: stock Sentence Transformers community_detection removes overlap in its final selection, so it does not directly meet this experiment's overlap contract. K-means imposes one partition and a chosen cluster count. HDBSCAN/soft clustering or other graph approaches can be later adapters if baseline results justify them; they are not implementation dependencies of this change. No assertion is made that the initial algorithm is optimal.

### 7. Reconcile discovery sets without blanket assignment

For each retained set, calculate a normalized centroid to retrieve a bounded list of nearby existing group definitions, then compute direct group/course cosine for each member against those candidates. Centroid closeness is candidate retrieval only, not proof of coverage. Save per-member scores, fraction passing a separate matching minimum, and the centroid score with their distinct labels. If a group limit cuts off the search, expose that bound.

Use experimental labels: no qualifying group is a potentially novel set; some matched members is partial coverage; every member passing for one group is potentially covered; several qualifying groups is ambiguous. All labels are provisional and reviewed in the UI. The user can inspect/select another existing group using the independent matching view; no set is hidden solely because its centroid has a nearby group. These results create no production suggestions. No title is required: use a local Persian label with count/representative course; optional owner title is an annotation, not source fact.

### 8. Persian workbench, comparison and feedback

Provide dataset/configuration selection with coverage and generation state, and three primary views:

- Existing groups: scope, parameter controls, candidates with source facts/input inspection, raw cosine, imported memberships and local feedback.
- Discovery: retained/suppressed sets, representatives, members, overlap links, coherence and existing-group reconciliation. Support unnamed candidates and optional manual annotations.
- Compare runs: manifest/settings side by side, additions/removals for course/group pairs and member differences for sets. Match sets across runs for display by Jaccard overlap; permit many-to-many correspondences to show splits/merges. This display association never transfers labels automatically. Different dataset/model identities get explicit warnings and scores are not placed on a universal confidence scale.

Use shared semantic visual foundations, lang=fa/dir=rtl, logical CSS, bidi-isolated Latin identifiers, Persian numerals/Jalali display dates, visible focus and mobile-friendly detail panels. Source material renders as text. Show empty/error/loading/cancelled/partial states. Lists and details are primary; projection plots are deferred because they are not required to judge suitability and can distort apparent proximity.

Feedback events target the exact run and canonical course/group pair or discovered member set, with suitable/unsuitable/uncertain, optional note and server timestamp. Latest effective label is shown while events remain. Local requests carry idempotency IDs to avoid duplicate feedback on retries. Regenerating identical runs preserves labels through stable target IDs. Changed runs can show earlier related feedback as context, not approved labels. Exports contain manifests, selected facts/inputs/results and feedback; vector payloads are opt-in. Reimports validate integrity/reference closure. No export is automatically submitted to another service.

### 9. Evaluation and local boundaries

Review summaries report labelled counts and suitable fraction among reviewed determinate candidates, explicitly disclosing selection bias and excluding uncertain/unreviewed entries from that denominator. Recall needs a separate defined reviewed reference set; do not infer it from the catalog. Software acceptance and owner model-quality evaluation are separate: deliver a real runnable sample and evidence even when model results are weak, and report unknown quality honestly. Human labels are not required to browse experiments and no automatic threshold training is included.

Bind server and inference to loopback defaults, validate Origin for mutation/start operations and Host against local bindings, accept only validated fixed IDs/settings, and confine all file resolution to the artifact root. CLI import origin is explicitly configured; browser clients cannot choose arbitrary upstream targets or paths. Keep request/body/result bounds and operation cancellation. Do not add authentication/deployment scope; this remains a trusted-machine experiment.

## Risks / Trade-offs

- Similarity can miss level/prerequisite boundaries and negation: retain educational evidence and include hard negatives in review examples.
- Greedy coherent neighborhoods may fragment topics or suppress useful close variants: compare settings and retain suppression provenance; do not call the baseline a final taxonomy.
- Whole-course pooled vectors may blur multi-topic courses: inspect exact inputs and version future representation experiments rather than silently changing them.
- Frozen imports can be incomplete or capture a changing catalog: show capture interval/coverage and never silently treat partial data as complete.
- CPU exact comparisons may be slow at 10,000 courses: benchmark bounded blocks and report actual results before considering ANN or another runtime.
- Feedback can be biased toward displayed results: separate reviewed-sample statistics from general accuracy claims.
- Local artifacts can grow large: expose sizes and keep them ignored; no automatic destructive cleanup is included.

## Migration Plan

There is no database migration. Add a standalone workspace and explicit commands, then capture a read-only dataset, generate real local vectors and save experiments. Update README.md, Plan.md and relevant documentation during implementation to distinguish the lab from live catalog behavior. Rollback stops/removes the lab code while preserving ignored artifacts; production services and data have no migration to reverse. A later, separately reviewed OpenSpec change decides pgvector/storage, application suggestion contracts and operational scheduling from exported evidence.

## Open Questions

No product-scope question blocks implementation. Actual model digest, runtime capacity, useful thresholds, dataset coverage and 10,000-course performance must be measured rather than invented. The implementation report records these observations and unresolved quality limitations. Owner acceptance of the algorithm for production is a later decision, not implied by accepting the lab.
