# Proposal

## Why

Dorob has a standalone AI judge guide for comparing established groups, but no equivalent instructions for reviewing discovered course collections. An operator needs to delegate the highest-similarity n collections to an agent that can assess educational fit, exclude outliers and create curated unpublished groups through the existing APIs.

## What Changes

- Add `docs/ai-group-reviewer.md`, modeled on the standalone role and operating instructions in `docs/ai-judge.md`, with an invocation example, bounded authority, exact HTTP contracts, evidence criteria, recovery and completion reporting.
- Define a run-scoped, highest-mean-similarity-first queue of n pending, current, retained candidates. Freeze the selected IDs before mutations; count reviewed candidates rather than successful approvals.
- Authorize the invoked reviewer to choose evidence-supported Persian title, description, category and level plus a valid unique Latin slug, without seeking approval for each definition or membership decision.
- Explain the existing sequence: candidate approval, empty draft promotion, all-member suggestion delivery, outlier rejection and retained-member approval. Document explicit removal for an already approved outlier and preserve the immutable discovered set.
- Keep new groups unpublished; exclude publication, course-quality judgment generation, inference, scraping, service setup and backend/UI changes from this role.
- Link the guide from the documentation hub, embedding workflow guide and judge guide, and record the documentation addition and its limitations in `Plan.md`.

## Capabilities

### New Capabilities

None. This is an operating-guide addition using existing local management capabilities; `.openspec.yaml` sets `skip_specs: true`.

### Modified Capabilities

None. The discovery and suggestion API requirements remain unchanged. The owner delegates supplying editorial group definitions to the external reviewer for its invocation; the backend still receives explicit caller-supplied fields.

## Impact

Documentation only: new `docs/ai-group-reviewer.md` and focused updates to `docs/index.md`, `docs/catalog-embeddings.md`, `docs/ai-judge.md` and `Plan.md`. No runtime agent, model integration, API/schema/database change, dependency, migration or live catalog mutation is introduced. Existing similarity values remain experimental evidence, not calibrated confidence. Implementation validation will review every documented request against routes/contracts and use non-mutating scenario walkthroughs; no working-catalog acceptance writes are required.
