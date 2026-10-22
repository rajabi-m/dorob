# Tasks

## 1. Shared catalogue presentation

- [x] 1.1 Extract shared layout/results toolbar components and migrate both callers; verify count/status, accessible heading, trigger and chip placement through shared presentation tests and the existing catalogue UI suites.
- [x] 1.2 Move common catalogue CSS to a neutral component-owned stylesheet, update route/reference imports and remove redundant toolbar overrides; verify consumer searches show no remaining cross-route shared CSS import and browser checks confirm count-right/trigger-left placement.
- [x] 1.3 Add API-independent design-system examples for the shared toolbar/layout and update ownership notes in `docs/frontend-refactor.md`; verify reference examples render without backend access and documentation matches the actual owners.

## 2. Shared catalogue interactions

- [x] 2.1 Extract shared transition navigation and page-change focus/scroll mechanics and adopt them in both catalogues; verify both paging directions, initial later-page rendering, same-page filtering and later-page filter resets with focused tests.
- [x] 2.2 Standardize pending feedback in the toolbar and retain committed results while pending; verify busy/status announcements, successful zero counts and error-without-count behavior on both catalogue callers, including a controlled pending transition.
- [x] 2.3 Preserve the shared native modal and wire both triggers consistently; verify selection closes before navigation, dismissal returns focus, keyboard containment and page-change focus precedence through interaction tests and browser checks.
- [x] 2.4 Document unified interaction rules in `docs/frontend.md` and update `Plan.md` to reflect implementation progress; verify the text matches implemented loading, filter selection and pagination behavior without changing domain contracts.

## 3. Integration acceptance

- [x] 3.1 Run isolated shared/core/web tests and route acceptance as documented in README, including both existing catalogue suites; verify URL restoration, chip removal, filter options, destinations and twelve/eighteen page sizes remain intact.
- [x] 3.2 Review `/groups` and `/courses` side by side at 320, 390, 760, 761 and 1280px across unfiltered, filtered, pending and error states; record toolbar geometry, breakpoint parity, keyboard focus/Escape/backdrop, Persian/Latin text and overflow checks in `docs/validation.md`.
- [x] 3.3 Run the RTL detector on touched UI files, workspace lint, type checking, production build and strict change validation using documented commands; record outcomes and any environment blockers in `docs/validation.md`, preserving the lockfile and unrelated working changes.
