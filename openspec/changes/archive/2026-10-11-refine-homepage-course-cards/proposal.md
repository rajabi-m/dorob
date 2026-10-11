# Proposal

## Why

Homepage course cards spend visible space on collection dates while leaving instructor names inside the details dialog. Moving provenance to the price and surfacing instructors will make scanning courses more useful, with a clearer secondary action.

## What Changes

- Show source-provided instructor names immediately beneath each real homepage course title, including honest missing-data states.
- Group the title and instructors tightly: titles clamp to two lines without reserving an empty second line, and instructors follow immediately with first-two-name summaries and remaining-name counts. Place flexible space below this group and anchor aligned provider rows above the footer. Keep full text available in details.
- Replace the visible collection-date row with a price-associated tooltip available on hover, keyboard focus, and touch. Use each course's own collection date, with Persian digits and a Jalali date.
- Give the card action a pale blue fill and dark brand-blue text; rename it «مشاهده دوره». Preserve the existing details dialog and focus return until a separate course-page change introduces navigation.
- Include [card-preview.html](card-preview.html), an offline, responsive Persian RTL design preview with six real courses from the frontend's October 1, 2026 provider snapshot and a separately labeled fictional edge-case section. Recorded prices are not live; source covers and provider marks are embedded. It is a review artifact, not application code.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `homepage-course-catalog`: Define visible instructors, accessible price provenance, and the secondary details action for real catalog cards.

## Impact

- Target implementation: `apps/web/src/components/public-course-card.tsx`, scoped styles in `course-card.module.css`, and relevant cases in `apps/web/tests/course-ui.test.tsx`.
- Existing `PublicCourse.instructors` and `checkedAt` already supply the facts. No API, ingestion, database, dependency, or contract changes are needed.
- Preserve all price states, thumbnails, provider/duration rows, catalog queries, dialog behavior, and surrounding sample experiences. Shared card styles must not inadvertently restyle sample cards or global secondary buttons.
- No course route, provider redirect, commit, or implementation is part of this proposal.
