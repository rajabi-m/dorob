# Tasks

## 1. Portable judge role and API workflow

- [x] 1.1 Create `docs/ai-judge.md` as a directly usable role prompt with invocation inputs, trusted local API scope, selected-group submission authority, review-only override and missing-tool/service handling; verify a copied file gives an HTTP-capable agent enough instructions without repository access.
- [x] 1.2 Document group selection, all seven judge operations, URL encoding, pagination, one-revision traversal, full section/feedback review, null/coverage semantics and untrusted source text; verify paths and query rules against `group-judgment-routes.ts` and manually walk through multiple member/feedback pages plus a reference-only member.
- [x] 1.3 Document qualitative learning-value/price ordering and the four tags, including offer comparability and comment/review distinctions; verify consistency with the shared contract and work through an expensive-first course and enrollment-only popularity evidence without inventing numeric thresholds.
- [x] 1.4 Add the strict envelope/content contract, actual limits and a synthetic request; validate the documented JSON offline with `parseJudgmentSubmission`, including a valid empty weakness list and no forbidden extra fields.
- [x] 1.5 Document exact request preservation, 201/200 outcomes, distinct 409 causes, bounded error recovery, immutable history/detail reads and freshness reporting; verify with manual traces of a stale traversal, confirmed stale rejection, lost POST response followed by exact replay, key conflict and stale accepted readback, without live API writes.

## 2. Persian editorial quality

- [x] 2.1 Add field-by-field SEO-friendly hero instructions and contrasting Persian examples; verify natural topic/level search intent, distinct useful field content, no keyword stuffing or unsupported claims, plain text and actual hero character limits without adding metadata fields.
- [x] 2.2 Add concrete strengths/weaknesses writing rules and Persian examples, targeting two or three distinct points where supported while permitting fewer or no weaknesses; verify examples have learner consequences and no forced criticism, filler, invented feedback or missing-data complaints.
- [x] 2.3 Add the final diligence and copy checklist covering every member, all retained evidence, course-specific assessment, tags, order and natural confident prose; verify the guide distinguishes thorough abstention from skipped analysis and omits unsupported claims rather than disguising uncertainty as fact.

## 3. Documentation integration

- [x] 3.1 Link the new guide and show a selected-group invocation in README; add a guide pointer to the catalog API reference and the historical assessment introduction; verify local links resolve and the historical draft stays clearly superseded.
- [x] 3.2 Update Plan.md with the manual role-guide milestone and remaining automated execution/public integration boundaries; verify it accurately describes a Markdown deliverable without claiming a runner, publication or a live judgment run.
- [x] 3.3 Review the completed documentation together for protocol/editorial consistency, local link integrity and whitespace; run `git diff --check` and `openspec validate add-ai-judge-guide --strict`, then report offline checks and the absence of live submissions. Application lint/typecheck/build are unnecessary unless scope changes to application code.
