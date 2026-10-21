# Proposal

## Why

Approving Jadi's Python course made the existing three-course comparison disappear because public selection requires a judgment matching the entire current working group. Routine membership additions and source refreshes should preserve an established comparison, including the exact course data on which its assessments were based.

## What Changes

- **BREAKING behavior:** replace exact-current-revision public eligibility with retained comparison editions. Keep existing endpoint shapes and URLs.
- Build each edition from one immutable judgment, its stored group context/member manifest, and those members' exact retained source snapshots and hosted thumbnails. Freeze prices, offers, ratings, titles, instructors, durations, source dates and assessment order together.
- Keep newly approved courses internal until a complete replacement judgment includes them. Additions, source refreshes and editorial definition edits do not alter the displayed edition or its counts/covers.
- Select complete, presentation-ready judgments automatically with the existing newest-time/ID tie rule; replace all public comparison content together. No new publish button or model execution.
- Preserve current unpublishing and explicit removal of an assessed course as visibility overrides. Preserve strict revision checks for new judgment submissions and truthful management `isCurrent` history.
- Keep homepage group cards, the featured shelf, group catalogue, comparison page and metadata consistent with the selected edition, with accurate historical dates and no public pending-update notice.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-group-judgments`: retained edition selection, historical source projection, waiting additions, coherent discovery/detail summaries, replacement/pinning and explicit visibility overrides.

## Impact

Primary runtime scope: `apps/api/src/public-group-judgments.ts`, its integration tests, public route documentation/examples, and affected web tests/copy. Reuse `course_group_judgments.input_manifest`, stored group context and immutable `course_snapshots`; no schema migration or duplicate course-data store is planned. Public individual-course APIs continue using latest facts, independently of comparison editions.

Update developer documentation and the judge operating guide to distinguish working freshness from public visibility. No scraping, AI automation, membership mutation, judgment generation, public history browser, admin judgment UI or manual edition publication workflow is included. Implementation must coexist with the active frontend refactor without overwriting its changes.
