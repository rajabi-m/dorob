# Group discovery, assessment and publication

Milestone 4, October 4, 2026. Implementation is offline-capable; acceptance results are in [validation](validation.md). Live generative/Jev/embedding access, Persian quality and calibration remain untested. No model is selected by default. The taxonomy is provisional; test review identities are not production review.

## Boundaries and persistence

All commands below are local operator CLI actions authorized by database access. Visitors only read stored, published DTOs. Run migrations and queue setup explicitly, then start the independent API and workers as described in [operations](backend-operations.md). Milestone 4 itself included no frontend integration, schedule, cloud deployment or additional collection. Milestone 5 now consumes its approved public output; see [integration](frontend-integration.md).

Discovery and generation extend `placement_requests`, `model_attempts`, `model_budgets`, `model_admission` and `placement-v1`; there is no second model pipeline. New retained tables are `discovery_proposals`, `group_definition_history`, `group_review_history`, `group_analysis` and the optional `group_ai_settings` policy fence. Definition data/bindings, analysis inputs and editorial review history are immutable in PostgreSQL. Edits append a new definition with a parent ID. Published snapshots remain immutable.

## Discovery

First import retained version-2 exports. Explicitly seed/review/activate a taxonomy, create a bounded model budget, and index the selected courses using [placement commands](placement.md). Index possible unmatched peers too; lexical discovery cannot retrieve unindexed courses. Embeddings are optional and require an explicit compatible model, dimension and evidence-bundle identity. There is no hidden embedding call.

Retrieve options using `candidates` with `kind: "unmatched-course"`. Submit a selected subset:

```json
{"documentId":"INDEXED_SOURCE_DOCUMENT_ID","candidateIds":["provider:peer-1","other:peer-2"],"limit":10,"budgetId":"BUDGET_UUID","model":"EXPLICIT_JEV_MODEL"}
```

```sh
bun run backend:cli discovery /absolute/path/discovery.json
bun run backend:cli proposal PROPOSAL_UUID
```

Select 1–11 peers plus the source, at most 12 courses. Retrieval limit is 1–100. Candidate IDs must belong to the returned lexical/hybrid set. Self-matches are rejected and duplicate selections collapse. Current approved members are excluded; “unmatched” means no current approved membership, not proof that a new group is warranted. Retained document variants collapse by source identity. RRF scores are retrieval signals, never approvals.

The proposal retains its source, full selection, exact revisions, curated evidence and retrieval provenance. Each peer gets a focused Jev topic/prerequisites/scope check against the source, with separate sufficiency questions. Level is checked when both sources supply level evidence. Triage outcomes are `fit`, `no-fit` (incompatibility), `uncertain`, `insufficient-evidence` or an explicit operational request failure. The anchor remains explicitly pending operator comparability review. These provisional thresholds do not approve membership.

Equivalent proposals use a unique sorted source-identity set plus taxonomy; source order, anchor, scores and transport identity cannot create parallel duplicates. At approval, a second PostgreSQL uniqueness gate prevents separate proposals creating groups with identical normalized topic, level, target learner, outcomes, scope, prerequisites and rubric. This is conservative structural equivalence; paraphrased semantic duplicates still need editorial review. A conflicting approval rolls back; inspect the existing group and use a correction rather than inventing another slug.

## Draft definitions and correction

```json
{"proposalId":"PROPOSAL_UUID","budgetId":"BUDGET_UUID","model":"EXPLICIT_GENERATIVE_MODEL","maxOutput":2000}
```

```sh
bun run backend:cli definition /absolute/path/definition-request.json
bun run backend:cli proposal PROPOSAL_UUID
```

The worker authors a structured Persian draft with `titleFa`, taxonomy `topicId`, `targetLearnerFa`, `outcomesFa`, `scopeFa`, `prerequisitesFa`, `level`, `rubric`, `evidenceIds` and `limitationsFa`. Each rubric item has a stable ID, Persian title and criterion. `unknown` level maps to null on the group; `multi-level` is separate explicit coverage. Definitions bind retained evidence/revisions, immutable taxonomy digest, requested/served model, schema, prompt `group-evidence-fa-v1` and policy `unranked-operator-v1`.

OpenRouter's current official [API reference](https://openrouter.ai/docs/api_reference/overview) and [structured-output guide](https://openrouter.ai/docs/guides/features/structured-outputs) were checked October 4, 2026. The injectable generative client uses non-streaming `POST /api/v1/chat/completions`, explicit `model`, `messages`, bounded `max_tokens` and strict `response_format.json_schema`. Provider routing requires parameter support and disables provider fallback; there is no model fallback or tool/plugin execution. Only a single completed `stop` choice is accepted; requested and served model IDs are recorded separately. Proposed model names in architecture documents remain unverified proposals. Verify availability, parameter support, context/output limits and pricing before selecting a live model.

Corrections and approvals are separate. The following is an illustrative Persian definition shape; replace its text and references after reviewing your retained sources:

```json
{"definitionId":"DEFINITION_UUID","draft":{"titleFa":"مقایسه دوره‌های پایتون","topicId":"python","targetLearnerFa":"یادگیرنده با پیش‌نیازهای اعلام‌شده","outcomesFa":["پوشش موضوع‌های درج‌شده در سرفصل"],"scopeFa":"یادگیری پایتون طبق سرفصل عمومی","prerequisitesFa":"طبق پیش‌نیازهای اعلام‌شده در منابع","level":"unknown","rubric":[{"id":"scope","titleFa":"مقایسه دوره‌های پایتون","criterionFa":"پوشش سرفصل منتشرشده"}],"evidenceIds":["REVISION_UUID:description"],"limitationsFa":["این تعریف نیازمند بررسی شواهد منبع است."]},"operator":"OPERATOR","note":"Reason for correction"}
```

```sh
bun run backend:cli definition-edit /absolute/path/correction.json
```

Use the returned new definition UUID. Editing refreshes the retained evidence binding to current selected revisions. Reference IDs in the supplied correction must resolve to those current revisions. Optional `taxonomyVersion` explicitly rebinds to a reviewed active taxonomy. For an approved group, editing increments its definition revision, clears its draft snapshot and invalidates approved definitions/analysis; previous memberships require explicit reapproval. Superseded drafts cannot be approved; late definition jobs cannot undo corrections.

```json
{"definitionId":"NEW_DEFINITION_UUID","action":"approve","slug":"python-reviewed","courseIds":["provider:peer-1","other:peer-2"],"operator":"OPERATOR","note":"Reviewed topic, learner, scope, prerequisites and each selected/excluded candidate"}
```

```sh
bun run backend:cli definition-review /absolute/path/definition-review.json
```

This explicitly approves both the definition and the listed current memberships; at least two eligible distinct alternatives are required. The operator may correct model triage using evidence and a recorded reason. The full proposal selection and excluded IDs remain inspectable; the review records the approved subset. Membership writes and the factual build job commit atomically. Generation never creates a group or membership automatically.

Use `action: "reject"` with `definitionId`, `operator`, `note` to reject a draft. Use `proposal-reject` with `{proposalId,operator,note}` to reject an open proposal. Rejection is retained and fences late work. No review waits with an active job.

## Assessment and evidence review

```json
{"groupId":"GROUP_UUID","definitionId":"APPROVED_DEFINITION_UUID","budgetId":"BUDGET_UUID","model":"EXPLICIT_GENERATIVE_MODEL","maxOutput":2000}
```

```sh
bun run backend:cli assessment /absolute/path/assessment-request.json
bun run backend:cli analysis ANALYSIS_UUID
```

One ledger request per current approved candidate keeps failures isolated. Input includes the complete candidate revision set, definition/rubric, taxonomy, model, prompt and policy; each call receives its candidate's curated evidence and the same rubric. Analysis creation and all candidate job requests share one transaction. Inspection accounts for every candidate, including pending, canceled, stale and failed requests. No failed candidate disappears from the comparison.

Each assessment has course/revision IDs, `assessed`, `insufficient-evidence` or `needs-review` status; an outcome for every rubric criterion (`advertised`, `not-listed`, `unknown`); bounded coverage/tradeoff claims; and Persian evidence limitations. Claims distinguish `provider-fact` from `ai-inference` and require evidence IDs plus exact supporting excerpts. References resolve to immutable course revisions and fields, source URLs/locators and observation times. Structural validation rejects wrong course/revision, nonexistent/foreign refs, fabricated excerpts, unsupported dimensions, omitted rubric outcomes, ranks/badges and unsafe generated text. `not-listed` requires a complete published syllabus reference; it never claims absence from paid media. Insufficient evidence cannot emit assessment claims.

The curated bundle includes title, description, explicit outcomes/audience/prerequisites/level, technologies, published syllabus, learning support, duration and offers. It excludes raw HTML, images, ratings, popularity, instructor identities and **all feedback** in v1. Omission/coverage records explain this boundary; no review theme, student-satisfaction or feedback-completeness claim is produced. Provider text is untrusted input with fixed system instructions, no tools and no executable output. Missing evidence is distinct from an evidenced educational tradeoff.

Exact quotations and resolvable IDs do **not** deterministically establish semantic entailment. The operator must inspect each claim, scope and source coverage before approval. A separate model reviewer is not implemented and would not provide independent proof. Teaching quality, employment, popularity, reputation, unsupported beginner suitability and overall winners are outside the accepted policy.

## Qualified comparison and publication

All requests must reach a terminal outcome before assessment approval: complete, failed or canceled. Resume unfinished work or explicitly cancel it first. A partial result can be approved only as a qualified comparison with failed candidates retained, null assessments and visible limitations; original source facts remain usable. Per-course coverage claims give useful differences without choosing a winner.

```json
{"analysisId":"ANALYSIS_UUID","action":"approve","operator":"OPERATOR","note":"Reviewed every claim/reference, evidence gaps and all candidate outcomes"}
```

```sh
bun run backend:cli assessment-review /absolute/path/assessment-review.json
bun run backend:cli inspect python-reviewed
```

Approval creates a distinct immutable assessment snapshot, preserving the original factual snapshots. It does not publish. Rejection uses the same command with `action: "reject"` and preserves the analysis and reason.

```json
{"slug":"python-reviewed","operator":"OPERATOR","note":"Approved this current qualified comparison for publication"}
```

```sh
bun run backend:cli publish-reviewed /absolute/path/publication-review.json
curl http://127.0.0.1:4000/v1/groups/python-reviewed
```

Assessment publication requires this recorded operator approval, current eligible memberships, at least two distinct alternatives, current definition/rubric, active taxonomy and current model/prompt/policy-bound analysis. History and editorial publication decisions are retained. `publish SLUG` remains available for explicitly reviewed factual snapshots with `analysis: null`; it cannot bypass assessment approval for an analytical snapshot.

Public analysis separates derived claims from current provider facts. It lists every candidate and limitations, with `ranking: "disabled"` and no badges. Code projects price/access facts preserving offer types, normalized and original currencies, unknowns, periods and access text. It computes signed price differences only between verified amounts of the same offer type/currency and time horizon; ambiguous/unknown/subscription horizons are not compared. This does not claim equal entitlements, total study cost, economical value or lifetime access. There is no currency guess, subscription multiplication, overall score, ranking, badge or winner.

Source, membership, definition, taxonomy or policy changes fence unfinished acceptance and publication. Public reads drop stale analytical output and retain factual usability subject to the existing minimum gate; published history is never rewritten. Policy versions outside the implemented disabled-ranking policy block new acceptance/publication. Rankings/badges need a separate reviewed, calibrated implementation.

## Bounds, cancellation and recovery

Jev, embeddings and generation share the existing PostgreSQL session slot and persisted 60-second host-loss reservation. Independent hosts cannot evade budgets/admission through process-local state or clock expiry. Each request has at most three attempts; pg-boss model delivery has zero automatic retries. Timeout is at most 30 seconds, HTTP input 64 KiB and output 128 KiB. Generative output requests are 100–8000 tokens and must also fit the configured worker ceiling (default 2000). Evidence is capped per candidate; excessive input fails explicitly without truncating candidates or feedback coverage.

`model-budget` requires mode, 1–100 calls, finite maxUsd and perCallUsd conservative admission reservations. All live calls additionally require explicit user authorization, `LIVE_MODEL_CALLS_ENABLED=true`, credentials, explicitly configured model IDs and `MODEL_RUN_BUDGET_USD` worker ceiling. No live calls were authorized/performed for this milestone. Production workers have no offline fixture switch; synthetic transports are injected only in tests. Missing credentials do not block offline imports, review, publication or tests.

```sh
bun run backend:cli placement-inspect REQUEST_UUID
bun run backend:cli placement-resume REQUEST_UUID
bun run backend:cli placement-cancel REQUEST_UUID
bun run backend:cli model-budget-inspect BUDGET_UUID
bun run backend:cli model-budget-cancel BUDGET_UUID
```

These commands apply to discovery, definition and assessment requests too. Busy admission retains queued domain work; its pg-boss delivery may finish without spending budget. Resume after the active call/cooldown ends. Failed/unknown attempts consume their original budget; resume does not reset attempts. Completed responses are reused after domain rollback only for the exact immutable versioned input and active attempt. Different revisions/definition/rubric/taxonomy/model/prompt/policy cannot share a response. Exhausted unchanged requests require operator correction/new versioned inputs rather than an unbounded retry reset.

Reported usage, served identity and cost are retained even when schema validation fails; unknown costs remain unknown. Reported costs exceeding reservations close the budget as overrun. Cancellation/host loss can leave billed calls with unknown outcomes. Conservative USD reservations are admission estimates, not a billing cap; exactly-once billing is not promised. Attempt tokens fence late acceptance and prevent an old host releasing a replacement reservation. Accepted definition/results and domain writes are atomic; approval/snapshot/downstream jobs also roll back together.

After changed source evidence, use `proposal-reprocess` with `{proposalId,budgetId,model,operator,note}` for an open proposal. It keeps previous input/review history, fences obsolete jobs, refreshes retained revisions and creates bounded checks only for the new exact inputs. Unchanged open requests use resume/edit rather than resetting budgets. Rejected proposals can be explicitly reopened; reuse retained drafts through an appended correction. Approved groups use `definition-edit` with current evidence references and, if needed, explicit active `taxonomyVersion`, followed by definition/membership approval and a new assessment. No history is deleted.

## Validation limits

Retained/synthetic fixtures and actual PostgreSQL/container orchestration establish contract and recovery behavior, not live integration or educational quality. Production use still requires a human-reviewed taxonomy/evaluation set, selected available models, bounded authorized live verification and Persian claim/fit calibration. Feedback assessment, optional independent derived review, ranking/badges, richer price terms, schedules and cloud release remain future work. Milestone 5 public integration and selected manual refresh are implemented, with outstanding browser acceptance documented separately.
