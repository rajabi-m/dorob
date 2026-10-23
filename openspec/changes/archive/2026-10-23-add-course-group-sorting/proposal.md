# Proposal

## Why

Course-group visitors currently have only the judge's recommendation order. Letting visitors compare prices in either direction makes budget-based browsing easier while keeping the judge's order as the default and explaining it briefly.

## What Changes

- Give «ارزش خرید» a distinctive sparkle icon and AI-associated treatment with an unambiguous selected state.
- Use a full-width custom sorting dropdown on mobile (up to 760px), with the current mode visible; retain desktop buttons.
- Add three controls above each public group course list: «ارزش خرید», «قیمت: کم به زیاد», and «قیمت: زیاد به کم».
- Default to the exact stored judge order under «ارزش خرید». Keep this a unified button without an info icon or tooltip.
- Sort the complete retained edition by displayed price before pagination; preserve judge order for ties. Keep subscriptions after outright/free courses and unknown amounts last in both price modes.
- Preserve sorting in the URL, pagination, reload and browser history; changing mode returns to the first page of the same selected edition.
- Remove the existing inline ordering explanation, retaining the review date and course assessment AI attribution. Add a sorting icon beside the visible «مرتب‌سازی بر اساس» label.
- Keep the hero slideshow in canonical recommendation order with all assessed course images, independent of row sorting and pagination. Detail responses include the complete covers list.
- Remove numbered rank badges from course thumbnails in every sorting mode so the images remain unobstructed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-group-judgments`: Extend detail sorting and add accessible Persian controls and clear value-based recommendation labelling while retaining edition consistency.

## Impact

- Shared detail-query contracts and validation in `packages/core/src/public-group-judgments.ts`.
- API repository, route schemas/examples and detail pagination in `apps/api`.
- Web detail loading, same-origin forwarding, query serialization, pagination/retry links and `JudgedGroupPage` styles/interactions.
- Focused contract, repository and UI acceptance coverage; developer documentation.
- Additive detail query parameter; omitted sorting preserves existing behavior. Existing unconditional judge-order requirements will be narrowed to recommended mode. No storage migration, judge resubmission, inference, scraping, group-discovery ordering or individual-course catalog changes.
