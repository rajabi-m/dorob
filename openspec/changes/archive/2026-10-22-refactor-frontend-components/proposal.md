# Proposal

## Why

The live frontend still carries prototype branches, fixture-driven comparisons and duplicated presentation code from earlier phases. Cleaning these up will make subsequent UI changes easier to apply consistently while preserving the current Persian product and its maintained design-system reference.

## What Changes

- Remove unreachable early-stage components, obsolete homepage comparison/dialog/filter branches and the unselected hero variant after confirming route, showcase, test and asset references.
- Keep `/design-system` as the maintained reference for current shared components; retain the fixture data and interactions it actually needs, rather than freezing obsolete alternatives.
- Extract shared branding, provider presentation, category presentation, Persian formatting and product styles from prototype/showcase/card files into focused reusable modules.
- Consolidate duplicated catalogue controls, price/offer presentation and bounded request plumbing where behavior is equivalent; retain explicit domain differences.
- Preserve the current homepage real-group hero, provider marquee/mobile wheel, shared breadcrumbs, group catalogue/comparisons, individual-course catalogue and administration.
- Reconcile the older sample-preservation requirement with the existing real hero and the deliberate retirement of obsolete fixture paths. Add focused regression coverage and update affected documentation.

## Capabilities

### New Capabilities

None. Shared implementation modules do not introduce a new product capability.

### Modified Capabilities

- `homepage-course-catalog`: clarify surrounding-frontend preservation around the current real-group hero and maintained design-system examples, removing an obsolete independently maintained hero-sample-dialog expectation. Existing discovery, provider navigation and price-provenance requirements remain in force.

## Impact

Frontend source, styles, fixtures, assets and nearby tests under `apps/web`, plus affected frontend/setup/validation documentation. No API contract changes, backend implementation, database writes, scraping, model execution, new dependencies, redesign or production deployment. Public detail API contracts remain even if obsolete frontend consumers are removed. The independent embedding lab and the active scraper-extraction change are outside scope.

This is deferred planning: implementation requires a later explicit apply request. Existing uncommitted product edits must be preserved and the acceptance baseline refreshed when implementation starts.
