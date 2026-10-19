# Proposal

## Why

The judgment backend is implemented, but an external agent has no current, self-contained instructions for turning its evidence into useful Persian course comparisons. A portable Markdown role guide will connect the existing API protocol to thorough assessment, natural SEO-friendly hero writing, and concrete strengths and weaknesses.

## What Changes

- Add `docs/ai-judge.md`, written as direct instructions that the owner can feed to an HTTP-capable agent to assume the judge role and assess a selected group.
- Explain invocation inputs, complete revision-bound evidence traversal, qualitative learning-value/price comparison, the four supported tags, exact submission shape, idempotent delivery, recovery and readback.
- Define natural Persian editorial standards for search-relevant hero text and confident, specific course assessments without generic AI phrasing, public evidence-gap commentary or unsupported certainty.
- Require thorough review before abstention; aim for two or three distinct points in each assessment list when supported, without minimum quotas, padding or forced weaknesses. A course may have no weaknesses.
- Link the role guide from README, the catalog API documentation and the historical assessment draft; record the documentation milestone and remaining integration boundaries in Plan.md.

## Capabilities

### New Capabilities

None. This change provides documentation for a manually invoked external agent, not a new executable service or model integration.

### Modified Capabilities

None. `course-group-judgments` already defines the protocol, qualitative order, evidence-backed assessments and valid empty arrays. The guide operationalizes that existing standard without changing API behavior or validation. This documentation-only change declares `skip_specs: true`.

## Impact

Only documentation changes: `docs/ai-judge.md`, `README.md`, `Plan.md`, `docs/catalog.md` and the introductory notice in `docs/course-group-ai-assessment.md`. No application code, dependencies, migrations, schema changes, frontend SEO implementation, automated runner or live judgment submission. Existing historical material remains clearly historical. Validation will review the guide against shared contracts/routes, check Markdown links and exercise synthetic examples offline without mutating the working catalog.
