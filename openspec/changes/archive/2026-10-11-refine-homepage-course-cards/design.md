# Design

## Context

See [proposal.md](proposal.md) for motivation. `PublicCourseCard` already receives `instructors` and `checkedAt`; it renders the date as `catalog-source-date` and uses `PublicPrice`, which is also used inside the details dialog. Real and sample cards share `course-card.module.css`. The current `.card` clips overflow. Existing UI tests cover sparse facts, price variants, details loading, and trigger focus restoration.

This design is warranted by interaction decisions needed before coding: tooltip dismissal, touch behavior, overflow placement, and scoping shared styles. [card-preview.html](card-preview.html) illustrates the proposal with six real courses from `apps/web/src/data/provider-courses.json`, retaining recorded titles, instructors, levels, durations, and prices from October 1, 2026 (۹ مهر ۱۴۰۵). Source covers fetched for this preview, local provider marks, and locally installed Vazirmatn fonts are embedded, so opening the file needs no network or backend. Separately labeled fictional cases retain coverage of subscription, missing instructor, and long mixed-direction content. Preview content does not change application fixtures, contracts, or implementation tasks.

## Goals / Non-Goals

**Goals:** Keep instructor facts near the title; make date provenance available beside the price with equivalent pointer, keyboard, and touch access; preserve the established card geometry and existing dialog flow.

**Non-Goals:** Course-page routing, backend changes, global button redesign, instructor roles/biographies, or changes to sample cards and other destinations.

## Decisions

### Card hierarchy and instructor text

Retain thumbnail, level badge, provider/duration row, and footer divider. Keep the title and instructor paragraph in one top-aligned text group. Titles use their natural height, capped at two lines (54px at 15px/1.8), with visual ellipsis and the full accessible name retained. Instructors begin immediately after the actual title with a 4px gap; do not reserve an empty second title line. Their first line shows «مدرس:» or «مدرسان:» and at most two source-ordered names using `bdi`, with single-line ellipsis for long names. A second line shows «و N نفر دیگر» in quiet brand blue only when needed. Missing-data labels occupy their natural height.

Reserve a shared minimum height on the complete text group (approximately 110px), placing unused space after the instructor paragraph. Push the provider/duration row toward the bottom with an automatic block-start margin. Give the footer a consistent height sufficient for original and current price rows (72px in the preview), so the provider row above it aligns even when one course is free and another has a discounted price. All extra space belongs between instructor text and bottom metadata, never between title and instructors. Keep these overrides scoped to real cards.

Avoid character-count slicing, which cuts names at arbitrary points and behaves differently across widths. CSS truncation adjusts naturally to available width. Full titles and all instructor names remain available through the existing details dialog for keyboard, touch, and desktop users; the preview dialog also reveals full text. Avoid avatars and role labels, which add density without helping identify the instructor.

### Filled secondary action

Use existing semantic palette values: `--ds-primary` (#304CB2), `--ds-soft` (#EAF0FF), `--ds-ink` (#202C48), surface white, and existing border/muted tokens. The action has soft-blue fill, primary-blue text, a quiet blue border, 44px minimum height, and visible focus. Hover deepens the fill without a transform. Add a real-card-specific class rather than changing `.ds-secondary` or shared `.action` defaults. A saturated blue fill was considered but gives every card the weight of a primary page action.

Use «مشاهده دوره» for both the visible label and course-specific accessible label. Keep the current `onDetails` event and the actual button as the dialog return-focus target. When a future course route exists, navigation semantics will be designed in that separate change.

### Price provenance interaction

Keep `PublicPrice` as the existing noninteractive price renderer. Wrap it only inside real cards with a dedicated price-provenance trigger and tooltip; do not add provenance controls to every use in the dialog. Use a semantic button with reset visual styling and a subtle dotted underline as the affordance. Price status, amount, starting-price label, old price, and billing period remain unchanged. Use phrasing «قیمت ثبت‌شده در {date}» for known prices and «اطلاعات گردآوری‌شده در {date}» for unknown prices. Convert the card's `checkedAt` using the existing Tehran/Jalali formatter; retain a machine-readable time value.

Open on pointer hover or keyboard focus and toggle persistent opening on tap/click. Close on second activation, outside pointer interaction, focus leaving the interaction, and Escape. Escape suppresses automatic reopening while the same focus/hover remains; a new interaction can reopen it. Keep the tooltip open while moving from trigger to tooltip. Associate a unique `role="tooltip"` element through `aria-describedby`; use real hidden state when closed. Tooltip content has no interactive children. Price activation never bubbles into a course-details action.

Position the tooltip above the trigger within a small real-card-local container. Remove overflow clipping only for real cards while keeping the thumbnail's own overflow clipped and top corner radii intact. Size it to available card/viewport space with logical CSS properties and a stacking level above adjacent cards. This avoids a portal/dependency for a short date tooltip. Check ancestor clipping and viewport edges in a real browser during apply. The preview models this geometry and interaction, but is not a React implementation to copy verbatim.

A native `title` tooltip was rejected because touch access, dismissal, styling, and assistive behavior cannot be controlled consistently. A date in every footer keeps the original scanning clutter.

## Risks / Trade-offs

- Compact instructor summaries hide some names → show the remaining-name count and preserve the full list in details; inspect mixed Persian/Latin ellipsis and provider-row alignment at narrow widths.
- Shared selectors accidentally alter sample cards → scope all overrides to an explicit real-card class and retain existing fixture checks.
- Date could be mistaken for today's price → provenance copy identifies collection, and the details dialog retains its visible collection date and source caveat.
- Tooltip could be clipped or immediately reopen after Escape → explicitly control dismissed state and inspect edge cards, scroll, focus, and pointer transfer in browser QA.
- Hover-only discovery excludes touch users → dotted underline plus focus/tap behavior; preview instructions make review behavior easy to find.

## Migration Plan

Apply as a frontend-only change with no data migration. Extend existing interaction tests and inspect desktop/mobile output before completion. Reverting the scoped component/style change restores the current card without affecting stored data or public contracts. Course routing remains a future change.
