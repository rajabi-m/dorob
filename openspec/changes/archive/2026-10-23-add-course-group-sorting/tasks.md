# Tasks

## 1. Detail contract and retained ordering

- [x] 1.1 Extend shared detail query types/parser with the three sort values and recommended default; verify core tests cover omission, all valid modes, empty/unknown/duplicate rejection, and list-only rejection.
- [x] 1.2 Implement non-mutating full-edition sorting before detail pagination; verify repository tests cover discounted/starting amounts, free zero, ties, known subscriptions in judge order, null amounts last in both directions, cross-page completeness and unchanged recommended/discovery order.
- [x] 1.3 Extend API detail schemas, descriptions and examples; verify HTTP tests cover accepted sorting, safe 422 input errors, retained snapshot prices and unchanged pinned-edition 409 behavior. Update `docs/catalog.md` with parameter and bucket semantics and check examples against route tests.

## 2. Web navigation and controls

- [x] 2.1 Carry validated sort through query serialization, server detail loading and same-origin forwarding; verify web client/page acceptance tests cover forwarding, default compatibility, URL reload and invalid input without changing list filters.
- [x] 2.2 Add desktop RTL sorting buttons and a full-width custom mobile dropdown (up to 760px), with visible sorting label/icon and accessible selected state above course rows; reset offset while retaining limit and selected judgment pin on changes. Remove numbered thumbnail rank overlays, their accessible labels and now-unused index props/styles. Verify interaction tests cover all modes, absence of rank/position badges across sorting and pagination, unchanged assessment tags, URL/history selection and paging preservation.
- [x] 2.3 Preserve valid sort in retries and conflict restarts while dropping invalid pins and resetting offset on restart; verify retry/page tests cover refresh failure, edition conflict and safe recovery from invalid sort URLs.
- [x] 2.4 Use «ارزش خرید» for the recommended mode as a unified button with sparkle icon, brand-blue selected treatment and gold accent; remove info icon/tooltip and old inline ordering sentence, retaining the review date and AI assessment attribution. Verify UI tests cover exactly three sorting buttons, selected state, absence of help controls and unchanged date. Update `docs/frontend.md` to match the final controls and copy.

## 3. Integrated validation

- [x] 3.1 Check the comparison at 320px, 390px, 430px and desktop widths with long Persian and mixed-direction content; verify readable controls, visible keyboard focus, touch activation, paging and browser back/forward. Run the RTL detector on touched UI files and resolve findings.
- [x] 3.2 Run the relevant core/API/web suites, README-documented lint/type checking, web production build and API build; record actual results and any environment limits in `docs/validation.md`. Update `Plan.md` and `README.md` status as applicable and confirm the final diff stays within this change, with no application changes committed without user confirmation.
