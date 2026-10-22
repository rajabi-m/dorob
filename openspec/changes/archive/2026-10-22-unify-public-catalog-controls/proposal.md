# Proposal

## Why

The groups and courses catalogues share low-level controls but separately compose their results toolbars and navigation effects. The same browsing controls consequently differ in placement, spacing, loading feedback and pagination behavior, especially on mobile.

## What Changes

- Give both public catalogues one shared results toolbar, responsive layout and style owner, using the current courses count-right/filter-left arrangement as the baseline.
- Standardize pending feedback, modal close/focus behavior and pagination focus/scroll behavior.
- Retain domain-specific filters, result cards, URL contracts, totals and twelve/eighteen result page sizes.
- Add shared interaction coverage and paired browser checks so individually passing catalogue tests cannot conceal divergent layouts.

## Capabilities

### New Capabilities

- `public-catalog-controls`: Consistent presentation and interaction of the shared browsing controls across the public groups and courses catalogues.

### Modified Capabilities

None. Existing `course-catalog` and `course-group-catalog` requirements remain in force; the new capability adds cross-catalogue consistency constraints without changing query or eligibility semantics.

## Impact

Frontend catalogue components, route CSS imports, shared catalogue styles, design-system examples and catalogue UI tests. Frontend documentation will describe the new ownership. No backend/API changes, dependencies, data operations, homepage redesign, commits or branches are included.
