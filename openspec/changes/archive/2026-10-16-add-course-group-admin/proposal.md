# Proposal

## Why

Course groups and memberships already persist in PostgreSQL, but reviewing them requires management API calls. Dorob needs a local Persian admin interface and a durable suggestion inbox so external systems can propose course-to-group assignments for human approval.

## What Changes

- Add a local-only RTL admin group list, draft creation/editing, publication controls, and group details with approved members and a suggestion review inbox.
- Build admin pages with Dorob's existing design system. Add any new reusable components or variants to `/design-system` using the same implementations and clearly labelled sample data.
- Add persisted course-to-group suggestions with submitting system identity/name, confidence percentage, submission identity, timestamps, and review state. Suggestions do not create memberships until approved.
- Add submission, paginated confidence-ordered reads, approval, rejection, and explicit reopening endpoints; preserve provenance and decisions across retries and new submissions.
- Support manual course selection/removal using existing catalog records and management APIs, with searchable management reads and useful retained course facts even when a course is not publicly eligible.
- Show a disabled judge-AI action explaining that judging is not implemented. The submission/review workflow works independently of an AI producer.
- Preserve existing groups, memberships, source observations, public eligibility rules, and API compatibility. Existing memberships have no invented AI confidence.

## Capabilities

### New Capabilities

- `course-group-administration`: Local Persian admin pages, editable groups, publication controls, manual membership management, suggestion review presentation, and unavailable judge action.
- `course-group-suggestions`: Durable system submissions, confidence ordering, pair-level review decisions, provenance, and atomic membership approval.

### Modified Capabilities

- `course-group-curation`: Extend the local editorial workflow to include an admin frontend and searchable management reads while retaining explicit human-controlled membership and the existing public eligibility contract.

## Impact

Touches `apps/web` admin routes/components and bounded same-origin management handlers, `apps/api` management repositories/routes and explicit SQL migrations, and browser-safe contracts in `packages/core`. Adds API/repository/integration and focused web tests plus documentation updates. Reuses the Bun/Elysia/PostgreSQL and Next.js workspace; no ORM or AI SDK is required.

Validation is focused on essential behavior and material regression risks. Reuse existing coverage and consolidate overlapping scenarios; do not add exhaustive permutations, tests that mirror implementation, or repeatedly run passing suites without a new change or failure. Required lint, type checking, and build checks remain in scope.

This change is local development only. Admin authentication and production deployment are deferred by owner decision. Runtime AI generation/judging, course-to-course similarity, group deletion, category administration, and replacing public sample group pages/cards are outside scope. Implementation acceptance uses temporary fixtures; publishing the seven existing drafts is not part of implementation.
