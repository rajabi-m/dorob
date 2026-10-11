# Tasks

## 1. Card hierarchy and secondary action

- [x] 1.1 Add the instructor row and scoped filled-secondary action to `PublicCourseCard`, preserving title/dialog activation and focus return; update existing UI tests for one/multiple/null/empty instructors, isolated Latin names, the «مشاهده دوره» label, and dialog closing. Verify with `bun test apps/web/tests/course-ui.test.tsx`.
- [x] 1.2 Add real-card-specific layout/style overrides using existing semantic tokens, natural-height titles capped at two lines, tightly grouped first-two-name instructor summaries and Persian remaining-name counts, flexible space below the text group, bottom-anchored provider rows, and consistent footer heights. Extend existing UI assertions for counts and full accessible titles/details; verify the compact title-to-instructor gap, provider-row and footer alignment across free/discounted cards, correct ellipsis, 44px action height, and unchanged sample-card/global-button appearance against the preview at desktop and mobile widths.
- [x] 1.3 Record the new instructor and action behavior in the relevant frontend status documentation without overwriting concurrent work; verify documented behavior matches the actual card and still describes the dialog destination.

## 2. Accessible price provenance

- [x] 2.1 Replace the real card's collection-date row with a dedicated price trigger and date tooltip based on `checkedAt`, keeping `PublicPrice` semantics and dialog uses intact. Extend existing UI tests for per-course dates, paid/free/subscription/unknown prices, missing visible date row, and unique accessible descriptions; verify the course UI tests pass.
- [x] 2.2 Implement hover/focus/tap opening, pointer transfer, second/outside tap closing, blur and Escape dismissal without reopening until a new interaction. Add focused interaction assertions for dismissal, retained focus, and no accidental details activation; verify the course UI tests pass.
- [x] 2.3 Scope overflow and tooltip geometry to real cards and retain clipped thumbnail corners; verify tooltip visibility and viewport containment in edge cards at 320px, 390px, and desktop widths, including long mixed-direction titles/names and pointer movement onto the tooltip.
- [x] 2.4 Update the affected frontend/validation documentation with provenance behavior and any verified limitations; verify it clearly distinguishes collected prices from current source prices.

## 3. Integration validation

- [x] 3.1 Run `bun test apps/web/tests`, `bun run lint`, `bun run typecheck`, and `bun run build`; record results and environment/unrelated failures accurately in `docs/validation.md` without changing unrelated contributor work.
- [x] 3.2 Run `.agents/skills/rtl-design/scripts/detect.py` on touched UI files and fix findings; complete browser QA for Persian text, keyboard focus and dialog focus return, all tooltip input modes, mobile overflow, and surrounding sample experiences. Record observable results and any remaining limitations.
