# Tasks

## 1. Compact mobile hero

- [x] 1.1 Extend the existing compact hero layout and matching reduced-motion sizing through 520px in `home-hero-variants.css`; verify at 320px, 390px, 430px, 520px and 521px that the wheel remains beside the heading, description/action span both columns through 520px, all five provider identities remain available with reduced motion, and no unintended page overflow occurs.
- [x] 1.2 Record the hero breakpoint decision and browser evidence in `docs/frontend.md` and `docs/validation.md`; verify the entry also confirms the 700px/701px desktop-mobile boundary and unchanged native `#groups` action and animation behavior.

## 2. Comparison readability

- [x] 2.1 Set comparison assessment prose to at least 13px and instructor/metadata text to at least 12px in `group-detail.module.css`, retaining Persian prose line-height of at least 1.8; verify computed styles and rendered long mixed-direction content on mobile and desktop, including empty assessments and multiple offers, with usable source actions and no clipping or unintended page overflow.
- [x] 2.2 Document comparison typography and validation evidence in `docs/frontend.md` and `docs/validation.md`; run `bun test apps/web/tests/group-ui.test.tsx` separately and verify retained facts/order, sparse assessments and gallery interactions still pass.

## 3. Public header navigation

- [x] 3.1 Apply 13px header labels and at least 44px-high hit areas across homepage/catalog and comparison styles; underline the existing catalog `aria-current="page"` link without layout shift. Verify `/`, `/groups`, `/courses` and a comparison at 320px, 390px, 430px and desktop, including visible keyboard focus, logo/search spacing and exactly one selected catalog link while filtering and paging.
- [x] 3.2 Change the comparison header's group link to `/groups` and add a focused assertion in `apps/web/tests/group-ui.test.tsx`; verify the suite passes, header navigation reaches the catalog, the homepage hero still scrolls to `#groups`, and category breadcrumbs retain their filtered destinations.
- [x] 3.3 Record header sizing, current-state styling and the corrected destination in `docs/frontend.md`, with keyboard/mobile evidence in `docs/validation.md`; verify the notes match the shipped links and do not imply new navigation items.

## 4. Shared real course-card typography

- [x] 4.1 Raise public-card provider, duration, original-price amounts and currency text to at least 12px through component-owned public overrides; verify the homepage shelf and `/courses` at narrow and desktop widths using discounted, subscription, free and unknown prices, with title/current-price prominence, instructor placement and aligned provider/footer rows preserved. Confirm independent fixture styling and unrelated price/button consumers remain scoped.
- [x] 4.2 Verify real-card price provenance by hover, keyboard focus/Escape and touch toggle, plus retained provider links; run `bun test apps/web/tests/course-ui.test.tsx` separately and record typography, long-content and tooltip browser evidence in `docs/frontend.md` and `docs/validation.md`. Avoid new tests that merely inspect CSS declarations.

## 5. Integrated validation

- [x] 5.1 Run the README commands `bun run lint`, `bun run typecheck` and `bun run build`, run `python3 .agents/skills/rtl-design/scripts/detect.py` on touched UI files, and run the relevant catalog suites separately (`catalog-interactions.test.tsx`, `group-catalog-ui.test.tsx`, `course-catalog-ui.test.tsx`); verify results and record any actual build/environment limitations in `docs/validation.md` without claiming a full production build if page-data collection fails.
- [x] 5.2 Review `/`, `/groups`, `/courses` and an eligible comparison together at mobile and desktop widths; verify consistent header and card typography, preserved filters/page sizes/data/source destinations, mixed-direction readability, keyboard focus and absence of unintended page overflow. Review `Plan.md` for a concise accurate completion note and run `openspec validate polish-public-frontend --strict` plus `git diff --check`; verify the final diff remains within this change without committing or modifying unrelated work.

## 6. Owner follow-up: purchase disclosure

- [x] 6.1 Remove purchase-option disclosures from every public comparison row and unused styles, retaining price/source actions and underlying data; verify the English A1 page has zero disclosures and two retained prices/actions, group UI tests and lint/types/RTL checks pass, and document the existing production build failure.
