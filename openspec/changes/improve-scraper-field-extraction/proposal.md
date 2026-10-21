# Proposal

## Why

The October 20 audit of 1,495 retained courses found extractable educational facts left in descriptions, archived free Roocket courses losing their free designation, zero-vote averages represented as ratings, and unresolved curriculum/feedback gaps. Improve the four collectors through small, evidenced extraction fixes while keeping every existing data-model and delivery contract unchanged.

## What Changes

- Improve course-scoped extraction of explicitly labeled educational statements in TopLearn, Sabzlearn, Roocket and Maktabkhooneh, including nested labels, Persian spacing and observed heading variations.
- Preserve Roocket's explicit free designation independently from archived provider state using existing pricing and provider-state fields; keep disabled paid offers excluded and reject contradictory free evidence.
- Emit no normalized aggregate rating when an explicit vote count is zero; normalize Sabzlearn scores only when a public source establishes their scale, retaining an unknown vote count where permitted.
- Repair verified alternate curriculum markup or omitted embedded structures; keep unresolved count mismatches and absent lists honestly unknown/partial.
- Recheck TopLearn's disclosed comments integration and improve it only when a verified public response supports the existing parser contract. Preserve current feedback bounds, privacy, access policy and failure isolation.
- Correct misleading free-price warnings and populated-section coverage, and add focused real-page regression fixtures and an outcome report for each provider.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-course-collection`: Add explicit collector behavior for contract-preserving extraction corrections, archived free designation, unrated aggregates, educational label traversal and evidence-bounded gap recovery.

## Impact

Implementation is confined to `apps/utils/scrapers/`, relevant utility fixtures/tests, and affected developer documentation. No changes to shared types, schemas, field names or enum values, API payloads/routes/projections, database schema, frontend, CLI options/defaults, journal format, dependencies or lockfile. Existing optional/raw/provider-data containers may retain bounded evidence without establishing a new consumer contract. Provider/course identities and legacy export shape remain stable; changed extractors receive version updates through the existing mechanism.

No catalog refresh, ingestion, thumbnail processing, saved-output rewrite, scheduling, commit, branch or push is included. Read-only bounded live checks are allowed. Full review traversal for Maktabkhooneh, new calendar representations, new audit-report formats and UI exposure of retained facts are deferred. Evidence-gated gaps may remain unresolved with a documented source reason rather than a fabricated fix.
