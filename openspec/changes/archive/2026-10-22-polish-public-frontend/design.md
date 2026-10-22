# Design

## Context

See `proposal.md` for motivation and the three delta specs for the acceptance contract. This is a cross-component presentation change, so the decisions below coordinate existing public consumers rather than introduce architecture.

Observed in the preceding browser review: at 430px the hero copy column measured 171px, while the 390px treatment allowed its description to span both columns. Source review identifies the 420px compact breakpoint below the 700px mobile composition. Comparison bullets use 11px text; mobile instructor/metadata text uses 10px. Shared real cards use 11px provider, 10px duration/original-price and 9px currency text. `CatalogShell` already supplies `aria-current="page"`, but public styles have no selected treatment. The comparison header still links to `/#groups`.

`Plan.md` records the accepted palette, font and real-group hero. The homepage preservation spec explicitly retains provider animations, reduced-motion handling and the section action. Those constraints remain compatible with adjusting the compact layout breakpoint. An unrelated existing discrepancy between the homepage shelf's documented three-item bound and current six-card presentation is outside this change; do not alter shelf fetching or counts while polishing.

## Goals / Non-Goals

**Goals:**
- Apply the five scoped refinements through existing component/style ownership.
- Keep shared real-card typography identical on the homepage and course catalog.
- Preserve logical layout, mixed-direction isolation, keyboard focus and final-product Persian copy.

**Non-Goals:**
- Rebuild page shells, add a general header abstraction or create a new design system.
- Change fixtures' independent interactions, admin/lab surfaces, catalog semantics or retained data.
- Change animations, footer navigation, search-input sizing, tags or assessment content.

## Decisions

### 1. Extend the existing narrow hero treatment to 520px

Use the current compact layout as the implementation basis: description and action span the two columns; the small wheel shares only the heading row. Move its associated reduced-motion sizing boundary coherently so all five static provider identities fit. Keep the existing 700px desktop/mobile switch. This avoids a new mobile composition or changing copy to compensate for a narrow column. A fluid wheel alone was considered, but would leave descriptive copy unnecessarily constrained. The 520px threshold is a proposed implementation default based on the 430px observation, rather than a claim of completed acceptance.

### 2. Raise supporting text locally

Set comparison assessment prose to 13px and its instructor/metadata text to 12px or greater, retaining the existing 1.9 prose line-height. Set real-card provider, duration, original-price amounts and currency units to at least 12px. Preserve title/current-price prominence; do not enlarge all buttons or labels globally. Use component-owned styles and public-card overrides, reusing semantic typography tokens if available; add narrowly named shared tokens only if genuinely reused. Avoid changing `.ds-button` or `.discovery-price` globally, since they serve fixtures and unrelated views.

Keep title clamping, natural instructor placement, provider alignment and footer minimums. Allow price/footer content to wrap or grow locally when required by the larger units, while preserving alignment across neighboring cards. Card height may increase; suppressing text is not the remedy.

### 3. Style existing header links and current-page semantics

Use 13px navigation labels and inline-flex links with at least 44px block-size, logical padding and the existing focus ring. Apply the same sizing to the homepage/catalog header styles and the comparison header module without changing footer or admin links. Use a reserved underline decoration on the existing `aria-current="page"` selector for catalogs, so selection is distinguishable without color and adds no layout shift. Keep the homepage neutral; retain only the comparison page's existing header link.

An additional active-state store or router hook would duplicate existing semantics. Replacing headers with a new reusable abstraction is unnecessary for this scope.

### 4. Correct only the comparison header route

Change its existing «مجموعه دوره‌ها» target to `/groups`. Preserve the native homepage hero `#groups` action and category breadcrumbs. Add a focused assertion in the existing group UI suite for this behavior; use existing catalog assertions to verify current-page semantics rather than duplicating layout tests in happy-dom.

## Risks / Trade-offs

- Larger Persian text can wrap prices and crowd mobile course rows → inspect long titles/instructor names, discounted and subscription prices, missing facts and neighboring cards; permit local height growth and preserve tooltip overflow.
- Enlarged navigation targets can crowd the logo or search → inspect 320px and the existing header breakpoints; use logical spacing and wrapping within current header patterns.
- The compact wheel's reduced-motion stack can be clipped when the breakpoint changes → inspect all five identities at 320px, 430px and 520px with reduced motion enabled.
- Happy-dom does not validate rendered CSS geometry → use browser screenshots and computed styles for typography, target sizes, overflow and breakpoint acceptance; do not add tests that merely search CSS source.
- The existing Bun production page-data collection failure may remain → run the documented production build, distinguish compilation/type success from full build success, and record the actual result in validation documentation.

## Migration Plan

No migration, dependency installation or data operation is required. Ship the scoped frontend changes through the existing app workflow after apply-time validation. Roll back by reverting those styles and the single header destination; no persisted state needs restoration. This proposal does not authorize a commit, branch, deployment or server restart.

## Owner follow-up: purchase disclosure removal

The owner explicitly requested removing «گزینه‌های خرید» from all public
comparison courses, including multiple-offer courses. Remove the disclosure
markup from `JudgedCourseRow` and its unused module styles; preserve the public
price summary and source action. This supersedes the earlier preservation of
visible purchase-option details, while leaving retained data/API contracts intact.
