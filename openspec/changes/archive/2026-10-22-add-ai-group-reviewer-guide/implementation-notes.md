# Implementation verification — October 22, 2026

Documentation-only verification; no HTTP writes, model calls, service setup or working-catalog changes.

## Queue walkthrough (task 1.2)

A synthetic sorted list has 103 retained candidates. The first 100 contain 98 reviewed/stale entries and two pending/current entries. With n=4, read offset 0 then offset 100; the second page contains one eligible and two ineligible entries. Freeze three IDs and report requested=4, selected=3, exhausted=true. Equal means retain ascending candidate UUID order, including across the page boundary. A later dismissal consumes one reviewed slot; it does not trigger selecting a fourth ID. Concurrent state changes are reported against frozen slots. This checks the documented algorithm against the server's sort-before-pagination implementation; it does not claim an executed database acceptance run.

## Evidence walkthrough (task 1.3)

A high-mean pair consisting of beginner Python and a prerequisite-heavy time-series specialization is not approved on shared keywords. A collection duplicating a verified existing scope/member set is dismissed with its group ID; uncertain equivalence stays pending. A reference-only course with insufficient educational facts is not called unsuitable because of missing data. A three-course collection with two supported beginner alternatives and a clearly specialized outlier can proceed with two retained IDs and a factual exclusion reason. These are hypothetical review cases, not provider claims.

## Definition contract review (task 1.4)

Reviewed promotion's strict group object in `apps/api/src/embedding-routes.ts` and catalog validators: title 300 with Persian characters, description 2000, Latin hyphenated slug 100, six category IDs and nullable four-value level. The guide adds nonblank/final-product editorial discipline without adding fields to the request. It defines scope from the retained subset and has no hero, ranking or course assessment output.

## Candidate and promotion contract review (task 2.1)

Compared all six review keys and versioned response against embedding routes/results; compared the three-key promotion envelope and five-key definition against its strict object schema. Checked promotion's frozen member plan, `{promotionId,groupId}` result, exact replay and empty-draft behavior against existing embedding acceptance tests (read only). Delivery returns a per-call UUID array, whereas lookup returns cumulative numeric delivered/planned/pending counts; the guide explicitly distinguishes these. The repository delivers at most 20 suggestions per call. No examples were sent to the API.

## Subset and pair-state walkthrough (task 2.2)

For hypothetical A/B/C, approve candidate -> create empty draft -> deliver three suggestions -> collect all pending IDs and versions -> reject C -> approve A and B -> verify members exactly A/B and C rejected. Checked pair transitions and evidence guard in `group-suggestions.ts`/`embedding-results.ts`: the strict body is `expectedReviewVersion`, approval creates membership atomically, rejection affects all submissions for a pair, and frozen scores are unchanged. A shrinking pending list is never traversed with old offsets while mutating. Different submissions for A are one pair decision, not two members.

## Removal contract review (task 2.3)

Verified DELETE course-link route returns 204, encodes the whole ID, and delegates to `manualMembership` in `group-suggestions.ts`. That operation removes the link and records rejected/manual provenance; repeated removal of a rejected absent pair is a no-op. Rejecting an approved pair conflicts. The guide scopes deletion to this invocation's recovery and flags its lack of an expected-version guard; it preserves pre-existing decisions and prohibits automatic PUT/reopen bypasses.

## Recovery walkthroughs (task 2.4)

- Lost promotion response: replay exact saved UUID/body; lookup yields the original draft, never a second slug/group. Review replay also preserves the original UUID and body.
- Delivery interrupted after one of three suggestions: lookup planned=3/delivered=1/pending=2; retry original promotion delivery, then verify pending=0. Readback never advances delivery by itself.
- Source/scope stale before approval: currentness guard conflicts; do not use manual PUT or patch scope. Report candidate incomplete.
- Another actor rejects a retained pair after our read: old expected version conflicts; read history, preserve rejection, do not reopen.
- Partial candidate without explicit permission: inspect/report pending with no promotion/run-wide acceptance. Candidate-scoped explicit acceptance is documented separately.
- DELETE recovery checks state/history because there is no concurrency version in its body; unexpected re-addition is not repeatedly removed.

Reviewed these against immutable review/promotion replay paths, pair-transition replay checks, currentness guards and partial acceptance logic; no live requests were performed.

## Completion-report walkthroughs (task 2.5)

All-match: verify every original member approved, delivery zero pending and unpublished before reporting fully curated. Subset: exact A/B membership, C rejected, original candidate/scoring unchanged. Dismissal: saved dismissed review, no draft claimed. Insufficient evidence: pending/unresolved, no approval claimed. Review-only: proposed JSON/decisions without any writes or new groups. Interrupted batch: separate completed, partially delivered/curated and untouched selected entries; report requested/selected/reviewed counts independently. These cases check the guide's reporting criteria, not an executed agent-quality evaluation.

## Integration and final checks (tasks 3.1–3.2)

- Added and checked guide links from the documentation hub, embedding workflow and AI judge. `Plan.md` records the documentation-only addition and original-score/unpublished limitations.
- Strict validation: `openspec validate add-ai-group-reviewer-guide --strict` passed with the declared documentation-only `skip_specs` policy.
- `git diff --check` passed. Explicit whitespace checks also passed for the new untracked guide and these notes.
- Parsed both fenced JSON examples successfully; checked all 11 guide-local Markdown links resolve, the nine workflow sections are present and code fences are balanced. Read method/path/body examples were compared with routes/contracts; write examples were reviewed against strict schemas and persistence behavior.
- Reviewed the guide and focused integration diff against existing discovery/suggestion specs. Delegated group authorship supplies caller-provided editorial fields without changing runtime requirements.
- This task changed only the guide, four documentation integration files and this change's tracking/verification notes. Pre-existing scraper/test edits and the untracked Jadi import report were left untouched. No runtime files, main specs, lockfile or working catalog were modified by this task.
- Application lint/typecheck/build and database acceptance were not run because application code was unchanged. Existing integration tests were read for contract evidence, not claimed as executed. No actual course reviews, approvals or publication were performed.
