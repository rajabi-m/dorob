# Placement and hybrid retrieval operations

Milestone 3 is complete for locally validated offline acceptance and implements the operator-driven workflow. All measured model results use explicitly synthetic transports. **No live Jev or embedding call was made.** The bundled taxonomy is provisional, not a human-reviewed production taxonomy; test review records certify only synthetic acceptance exercises. No automatic membership acceptance, new-group generation, generative analysis, ranking, frontend integration or schedules are enabled.

## Model contracts verified October 4, 2026

Implementation checked the official [OpenRouter Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request), [TypeSafe API](https://docs.typesafe.ai/api), [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), and [confidence](https://docs.typesafe.ai/confidence). The client posts `{model,state,questions}` to `https://openrouter.ai/api/alpha/decisions`. It never calls chat completions or a Jev routing model. Choice uses a criteria map and returns a selected key, probabilities summing to one and confidence. Noul returns `type: "noul"` and `noul: P(yes)`; it has no independent confidence field. Question IDs must match exactly, types and options must match, probabilities/confidence must be finite in [0,1], and the selected option must have maximal probability.

The requested identity is explicit in every request; the served identity and reported usage/cost are retained in attempts and responses. Jev aliases can serve a different version, which remains visible to the reviewer. Production evaluation should pin an available version before calibrating policy. No model is selected by default. Provider text is supplied as untrusted state and cannot override the question instructions. This instruction boundary is mitigation, not a guarantee against model misjudgment.

The embedding client uses the official [OpenRouter embeddings contract](https://openrouter.ai/docs/api/api-reference/embeddings/submit-an-embedding-request), requesting a single float vector with explicit model and dimensions. A served identity differing from the requested pinned identity is rejected. `text-embedding-3-large` remains only a proposal: its availability, full provider-qualified ID, supported dimensions, price and Persian retrieval quality have not been verified by a live request. No paid embedding default is silently chosen.

## Versioned evidence and taxonomy

`dorob-provisional-v1` contains پایتون/Python, جاوااسکریپت/JavaScript/JS and ان‌ایت‌ان/n8n, with explicit aliases. Taxonomy JSON requires `status: "provisional"` or `"test"`, unique topic IDs, Persian labels and bounded aliases. Seeds and their digests are immutable; changes require another version. Review identity/time are separate from seed status. An operator must review and activate a taxonomy before approving a model result. Activation makes previous-taxonomy work stale at acceptance/review time; it retains historical results and publication.

The evidence bundle retains field paths, revision-bound IDs, source URL/locator, original title/description/outcomes/prerequisites/audience/provider level/technologies/syllabus and honest coverage. It omits raw HTML, feedback identities, prices, logos and credentials. Missing prerequisites or incomplete scope cannot prove incompatibility; absent level evidence produces an effective derived `unknown` even if a synthetic/model Choice returns beginner. `multi-level` requires its own Choice outcome and level evidence; it never means unknown. Provider-stated level stays in immutable source facts, separate from derived classification. Evidence sufficiency checks do not establish that source claims are true.

Versions are `placement-questions-v1`, `operator-only-v1`, and `educational-evidence-v1`. Requests bind kind, course revision, group definition revision, taxonomy digest, model, transport mode, questions, coverage and these versions. Equivalent requests coalesce even when submitted with another budget; inspection shows the original budget that owns the work. Live/offline requests cannot coalesce with each other. Exact retained responses can be reused only for the same request; changed revisions, questions, taxonomy, policy, model or bundle make another identity.

## Manual workflow

Run migrations and `queue-setup` explicitly after upgrading, then start the independent worker. Use `bun run backend:cli --help`. Commands read JSON files from disk; IDs below are placeholders, not credentials.

```sh
bun run db:migrate
bun run queue:setup
bun run backend:cli taxonomy-seed provisional
# taxonomy-review JSON: { "version": "dorob-provisional-v1", "operator": "YOUR_REVIEW_ID" }
# Execute only after actually reviewing the taxonomy; seeding does not record review.
bun run backend:cli taxonomy-review /absolute/path/taxonomy-review.json
bun run backend:cli taxonomy-activate dorob-provisional-v1
# Inspect the new/revised-course transactional outbox (at most 100 rows).
bun run backend:cli placement-pending
```

Create a bounded run with `model-budget PATH`: `{ "mode": "offline", "maxCalls": 5, "maxUsd": 1, "perCallUsd": 0.1 }`. These USD figures are examples for synthetic testing, not price recommendations. `mode: "live"` authorizes that run only in an independently enabled/configured worker. `model-budget-inspect UUID` shows counts/reservations; `model-budget-cancel UUID` prevents further admission. It does not retract an already admitted remote call.

Submit one classification with `placement PATH`:

```json
{
  "kind": "classify", "budgetId": "BUDGET_UUID", "courseId": "provider:identity",
  "taxonomyVersion": "dorob-provisional-v1", "model": "EXPLICIT_MODEL_ID"
}
```

Inspection and recovery:

```sh
bun run backend:cli placement-inspect REQUEST_UUID
bun run backend:cli placement-status provider:identity
bun run backend:cli placement-resume REQUEST_UUID
bun run backend:cli placement-cancel REQUEST_UUID
```

An offline budget requires a worker started with injectable offline clients. Production startup contains no fixture-mode environment switch, and an offline request never uses a live client even when live calls are enabled. Tests inject clients through `startWorker({decision,embedding})` or `processPlacement`; retained/synthetic files are mounted only by the acceptance runner. Offline production requests without an injected client remain durable and require explicit resume after an appropriate test worker is available. Missing live configuration does not stop imports, factual workflows, lexical retrieval or tests.

Classification approval records review; it does not add group membership. Review JSON is `{ "requestId": "REQUEST_UUID", "action": "approve", "operator": "YOUR_REVIEW_ID", "note": "Reason after evidence review" }`; run `placement-review PATH`. `reject` records a rejection without altering provider facts. Approvals require a current completed result and the reviewed active taxonomy.

Index a bounded selection with `retrieval-index PATH`: `{ "taxonomyVersion": "dorob-provisional-v1", "courseIds": ["provider:identity"], "groupIds": ["GROUP_UUID"] }`. The total selection is 1–100. Output document IDs bind entity/revision, taxonomy and bundle/text hash. Historical documents stay retained. No catalog-wide indexing loop runs implicitly.

For each document, submit `{ "kind": "embed", "documentId": "DOCUMENT_ID", "budgetId": "BUDGET_UUID", "taxonomyVersion": "dorob-provisional-v1", "model": "EXPLICIT_PINNED_EMBEDDING_ID", "dimensions": 2 }` to `placement`. Two dimensions are suitable only for synthetic fixtures, not a proposed live embedding configuration. Group and course embeddings use the same versioned store and call admission ledger. Request and response dimension/model/bundle mismatches fail validation; zero vectors are rejected.

Run `candidates PATH` with:

```json
{
  "documentId": "SOURCE_COURSE_DOCUMENT_ID", "kind": "group", "limit": 10,
  "embedding": { "model": "EXPLICIT_PINNED_EMBEDDING_ID", "dimensions": 2, "bundleVersion": "educational-evidence-v1" }
}
```

Omit `embedding` to explicitly request lexical-only retrieval; a missing compatible query vector never silently degrades a hybrid request. `kind: "unmatched-course"` finds current courses with no current approved group membership for later discovery. It does not generate groups. Self-matches are excluded; unique source identities and entity-level collapsing prevent duplicate revisions from occupying multiple ranks. Stale query documents are rejected and stale target documents excluded. Re-index changed revisions/definitions/taxonomy and embed their new document IDs.

Evaluate one candidate group with `placement PATH`: `{ "kind": "evaluate", "courseId": "provider:identity", "groupId": "GROUP_UUID", "budgetId": "BUDGET_UUID", "taxonomyVersion": "dorob-provisional-v1", "model": "EXPLICIT_JEV_MODEL_ID" }`. Focused Noul checks cover topic, prerequisites and intended outcomes/scope; level is checked only when the group specifies a target level. Each has a separate evidence-sufficiency question. Coverage gaps or insufficiency produce `insufficient-evidence`, ambiguous probabilities produce `uncertain`, and supported incompatibility produces `no-fit`. Operational failure is a separate review outcome, never no-fit.

The provisional 0.2/0.8 Noul bands label triage outcomes only. They are uncalibrated and never authorize membership. Even `fit` creates a pending review with no membership write. An explicit operator `approve` for a current fit writes membership bound to both course and group definition revisions, resolves the review and inserts/coalesces the factual workflow in one transaction. Only current supported topics can be accepted. Rejections, uncertain/insufficient/no-fit cases require investigation or changed evidence/definition, not confidence-based automatic acceptance. Course placement status is retained as `unmatched`, `needs-review` or `matched`; unmatched is the absence of approved current alternatives, not proof that generative group creation is appropriate. Review histories remain in request/review tables after newer work.

Factual publication remains separate:

```sh
bun run backend:cli inspect GROUP_SLUG
bun run backend:cli publish GROUP_SLUG
```

Publication still requires at least two current available/explicitly unknown alternatives approved for that group definition, and a completed current factual snapshot. Model/retrieval results never publish. Published history is retained; definition/evidence changes fence new acceptance and can hide public output below the eligibility gate. Definition editing/generative group authoring UI is outside this milestone. Existing `group PATH` continues to be an explicit operator approval route for factual groups.

## Retrieval policy

Only search text is normalized: Unicode NFKC/lowercase; Arabic ي/ى/ك to Persian ی/ک; Persian/Arabic digits to Latin digits; removal of diacritics/tatweel; punctuation/ZWNJ/spacing to normalized spaces. Original retained evidence is never rewritten. Explicit whole-token/phrase aliases expand each identified topic to its configured Persian/Latin names. Substring resemblance is not an alias.

PostgreSQL `to_tsvector('simple', ...)`, OR queries over at most 100 unique normalized query tokens and `ts_rank_cd` implement lexical retrieval. This is PostgreSQL full-text ranking, **not BM25**. There is no Persian stemming. Exact cosine distance searches pgvector only within the same model, dimensions and bundle version; no ANN index is installed. Entity-level maxima/minima collapse documents before ranking. Each channel returns up to `min(100, 4 × requested limit)` candidates, with bytewise stable ID ties. Equal-weight reciprocal rank fusion uses `sum(1 / (60 + rank))`, one-based ranks; merged ties use stable ID. The limit is 1–100. A score merely orders review candidates and never approves membership. Retrieval quality beyond synthetic alias/vector fixtures remains unmeasured.

## Live enablement, budgets and recovery

Live calls require all of: explicit `LIVE_MODEL_CALLS_ENABLED=true`, server-only `OPENROUTER_API_KEY`, explicit configured Jev and/or embedding model, worker `MODEL_RUN_BUDGET_USD`, and a database live run with maxCalls, maxUsd and conservative perCallUsd. The run ceiling must fit the worker ceiling. Embedding model and dimensions must be configured together; Jev IDs must identify `typesafe/jev-...`. Verify availability and current pricing separately before selecting either. No live authorization/configuration was requested because it is unnecessary for offline acceptance.

Jev and embeddings share **one global PostgreSQL call slot** (`JEV_CONCURRENCY=1`); raising this limit is deliberately unsupported in this milestone. Worker local concurrency does not weaken it. Separate dedicated sessions hold request and admission advisory locks, outside the application pool, across the whole call. PostgreSQL atomically reserves call count and conservative USD allowance before network work. Admission uses PostgreSQL time, avoiding host-clock skew. Attempt tokens fence late responses and prevent an obsolete worker from releasing a replacement reservation. A persisted 60-second reservation survives abrupt host/connection loss; calls are bounded to 30 seconds. Reserve an extra database connection for each active placement handler. The finite cooldown cannot prove that a provider stopped computing after a disconnected request; unknown remote outcomes remain visible and no exactly-once billing is promised.

Runs admit at most 100 calls and $100 in configured reservations; each request has at most three attempts. Reservations never shrink on timeout, cancellation or failure; reported cost above reservation increases accounted usage and can mark the run `overrun`, preventing later admission. **USD admission is based on an operator-supplied upper estimate, not a remote-provider hard billing cap.** Unknown costs stay reserved; choose perCallUsd conservatively using verified price/token limits and a provider account spending cap when available. Small call counts, bounded evidence and no automatic expansion are the primary protection against unknown charges.

Payloads are bounded to 64 KiB, responses to 128 KiB, embedding dimensions to 16,000, and question/option counts by the small taxonomy/check contract. The Decisions endpoint documents no output-token request parameter: the implementation does not invent a chat parameter. It validates reported output against `MODEL_MAX_OUTPUT_TOKENS` (default 2,000), and rejects oversize bodies/results; this is a validation bound, not a provider-side generation cap. No SDK/transport/pg-boss model retry loop multiplies attempts. Model jobs have `retryLimit: 0`; manual resume is the sole retry authority.

If another host owns the slot, the cooldown remains active, configuration is absent or the budget is exhausted, no call is admitted. The durable request remains inspectable; jobs do not wait actively for review or a slot. Resume queued/running/failed work after readiness/cooldown, preserving its original attempt and budget counters. A redelivery marks an abandoned attempt `unknown`; cancellation fences domain acceptance and records an unknown remote outcome when appropriate. Failed run admission creates an operational review task. A completed transport response, served identity, reported usage and any cost overrun are retained before domain acceptance, so domain rollback cannot defer spend accounting and a subsequent acceptance transaction failure can resume with the same validated response and no new charge. A crash before response persistence may require another paid call.

Completed requests coalesce and cannot be forced to rebill by resume. Revised evidence, a new group definition/taxonomy/model/question/policy version creates a new identity; superseded inputs cannot approve membership. Accepted results, review creation, vector persistence and outbox status advance transactionally. Membership approval and downstream queue insertion roll back together. New-course/revision placement triggers share the existing validated importer/ingestion transaction, alongside the group invalidation outbox; they do not start a competing collector or implicit model run. `placement-pending` is the manual configuration/review handoff, and no schedules are added.

## Validation limits

Unit/database tests cover normalization, aliases, deterministic ranks, vector incompatibility, Choice/Noul validation, confidence/coverage, outcome distinctions, unknown/multi-level separation, duplicate delivery, bounded retry/resume, shared budgets and admission, host-loss attempt accounting, cancellation, response reuse after rollback, atomic approval/downstream handoff, stale course/group/taxonomy work and publication gates. The full `test:backend:containers --dashboard` suite includes ingestion recovery; `--placement-only` reruns model placement/retrieval/review and recovery against the final images. Container acceptance uses an actual backend CLI and two actual workers with mounted synthetic decision/embedding transports, including kill/restart/resume after a persisted model reservation. See [measured validation](validation.md).

These checks prove local orchestration/contracts against synthetic outcomes. They do not establish live API availability, credentials, paid model behavior, embedding quality, Jev Persian accuracy/calibration, human-reviewed production taxonomy, production cost estimates, cloud connectivity/TLS or operational recovery for every failure. Generative group creation, educational comparison prose, ranking/badges and frontend integration remain later milestones.

## Milestone 4 extension

[Group discovery/assessment operations](group-discovery-assessment.md) extends the same `placement_requests`, model attempts/budgets/admission and `placement-v1` queue with `discover`, `definition` and `assess`. Existing inspect/resume/cancel commands apply, retaining the three-attempt limit, unknown costs and exact-input response reuse. The global slot now coordinates Decisions, embeddings and generation across independent hosts. Membership/publication cannot be approved by similarity, model confidence or a generation result; definitions, memberships, assessment and publication have explicit retained operator review. Rankings/badges stay disabled. No live generative request was performed.
