# Proposal

## Why

The current public frontend has an established visual identity, but the mobile hero squeezes copy at intermediate phone widths and important course-comparison facts are rendered too small. A focused polish pass can improve readability and navigation without replacing the accepted design.

## What Changes

- Extend the existing compact hero arrangement through 520px so the description and action use the full content width while the provider wheel stays beside the heading.
- Increase comparison assessment text to 13px and instructor/metadata text to at least 12px, retaining Persian line spacing.
- Give public header navigation 13px labels, at least 44px-high hit areas and a visible current-catalog underline on `/groups` and `/courses`.
- Route the comparison header's «مجموعه دوره‌ها» link to `/groups`, matching catalog navigation; retain the homepage hero's intentional `#groups` action.
- Increase real course-card provider, duration, original-price and currency-unit text to at least 12px on the homepage shelf and `/courses`, preserving title/price hierarchy and aligned footers.

The planning scope includes all five findings from the preceding review; hero layout, comparison readability and navigation polish take priority. Footer changes, search-input sizing, animation changes, extra navigation items, redesign, backend work and catalog data changes are outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `homepage-course-catalog`: Compact phone hero arrangement and readable supporting typography for shared real course cards, including their `/courses` consumer.
- `public-catalog-controls`: Readable public header links and a visible current-catalog indication.
- `public-group-judgments`: Readable comparison facts/assessments and a consistent header route back to the group catalog.

## Owner follow-up

Hide the purchase-options disclosure for every public comparison course, regardless of offer count. Retain the price summary, provider link and underlying offer data.

## Impact

Changes are confined to public web presentation: `home-hero-variants.css`, `home.css`, `product.css` or narrowly scoped semantic typography tokens if needed, `course-card.module.css`, `group-detail.module.css`, `catalog-shell.tsx` and `judged-group-page.tsx`, plus relevant component checks/reference examples and frontend validation documentation. Existing components should carry the refinements across their consumers without a new layout abstraction. No API, dependency, database, retained-edition, filter, pagination, pricing or source-link contract changes are required. No commit or branch is included.
