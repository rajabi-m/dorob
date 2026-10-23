# Design

## Context

See `proposal.md` for motivation. The current API assembles an entire retained edition in judge order, then slices it in `createPublicGroupJudgmentRepository.detail`. `GroupPageQuery` permits only paging and judgment pins; the shared parser rejects other parameters. Web server loading, proxy forwarding and pagination use that contract. `JudgedGroupPage` currently renders an unconditional AI-order explanation and numbers rows by offset.

This spans shared contracts, API and web, so a design artifact is warranted. The existing public spec unconditionally preserves judge order; this change explicitly makes that the default/recommended behavior. The judge submission/storage rule remains unchanged.

## Goals / Non-Goals

**Goals:** Apply deterministic presentation sorting to one retained edition, preserve bounded pagination and pins, and make the selected mode reproducible through navigation.

**Non-Goals:** Recalculate recommendations, compare subscription billing periods, change selected offers, change group-card covers, or reorder individual-course catalogs. No new dependency or database field is needed.

## Decisions

### Extend the existing detail query

Add a shared sort union with `recommended`, `price-asc` and `price-desc`. Accept it only on detail queries and default omission to recommended. Extend API schemas/examples, runtime parsing, web query serialization and server detail loading together. The validated URL supplies selected mode to the UI. Detail responses also expose covers for every assessed course in canonical judge order; discovery summaries retain their existing maximum of three covers. Lists continue rejecting sort.

Alternative: client-only state would lose deep links and produce incorrect ordering across server-paginated pages. Fetching all pages in the browser would weaken bounded access and complicate edition consistency.

### Sort after retained projection and before slicing

In detail assembly, derive ordering from `course.price`, which already represents the displayed retained offer. Work on a copy so the canonical judge order and discovery covers remain intact. Recommended returns the original order. For price modes, compare these keys:

1. Fixed bucket order: known outright/free, known subscription, unknown amount.
2. In the first bucket only, free maps to zero and paid uses displayed `amount`; compare ascending or descending as requested.
3. Original judge index resolves all ties and orders the subscription and unknown buckets.

Treat paid/subscription null amounts as unknown, rather than zero. Use `amount`, never `originalAmount`, and preserve starting-price semantics. Do not normalize monthly/yearly subscription rates. This is an explicit planning default for subscription ordering: keep judge order within that bucket because periods differ.

Alternative: reverse the entire ascending array for descending would incorrectly move unknown prices first and reverse judge-order ties. Sorting raw offers would disagree with displayed prices.

### Keep the URL authoritative

Render the visible label «مرتب‌سازی بر اساس» and three adjacent mode controls («ارزش خرید», «قیمت: کم به زیاد», «قیمت: زیاد به کم») above the course rows using existing semantic tokens, with intelligent sorting first in RTL reading order. Give «ارزش خرید» a sparkle icon, soft brand-blue gradient and distinct border; use a filled brand-blue gradient and gold sparkle when selected, while price selections retain their outlined pressed state. Use existing `--ds-primary`, `--ds-soft`, `--ds-accent` and surface tokens; introduce no purple palette. Keep decorative styling secondary to the selected state. Use accessible pressed-state buttons that navigate to a constructed URL. Mode changes set offset to zero, retain limit and pin the currently displayed judgment. Preserve mode on paging and recoverable retries. On edition conflict, restart from offset zero without the invalid pin, preserving the selected mode. Reload and browser history derive both data and selected state from the URL.

Remove the numbered rank overlay from each comparison course thumbnail in all three modes, including recommended. Remove its rank-specific accessible label and any now-unused index prop or overlay styling; do not replace it with a list-position badge. Original judge indices remain internal sorting tie-breakers and require no new response field. Keep the gallery independent of row sorting and pagination: detail covers projects all canonical retained courses to courseId/title/thumbnail before sorting or slicing. The gallery consumes these covers and is keyed only by judgmentId so row navigation does not reset its active slide. The strict detail schema requires the complete unique cover list; update public examples and fixtures with this contract. Sorting must not mutate the canonical edition array or discovery-card covers.

### One activation surface and explicit purpose

Render «ارزش خرید» as a single button with a decorative sparkle, without an info icon or tooltip. The shorter label communicates the value-based recommendation directly. Remove the previous inline ordering explanation, retain the review date and assessment attribution, and place a decorative sorting icon beside the visible «مرتب‌سازی بر اساس» label. At widths up to 760px, replace the desktop label/button group with a full-width custom dropdown showing «مرتب‌سازی:» and the current mode. Use a disclosure button with aria-haspopup/menu and radio menu items. The value choice uses brand-blue styling and a sparkle icon, including on the closed trigger when selected; add no AI text label. Arrow keys/Home/End move focus; Enter/Space select; Escape restores trigger focus; outside interaction and blur dismiss. Use the same URL navigation handler as desktop buttons. CSS display rules expose only one control variant to focus and assistive technology; server rendering includes both without viewport hydration logic. Retain Persian RTL, avoid letter spacing and keep visible keyboard focus.

## Risks / Trade-offs

- Retained prices can differ from current provider prices → sort the same facts displayed in this edition and preserve source/review dates.
- Subscription amounts describe different periods → preserve their judge order in a separate bucket after outright/free prices.
- A replacement edition can arrive during navigation → retain existing 409 handling and never silently mix editions.
- URL mode could be dropped by a layer → cover parser, serialization, route forwarding, pagination and retry behavior with focused tests.
- Existing broad order assertions may assume recommendation mode → keep default regression checks and add explicit alternate-mode cases.

## Migration Plan

No data migration or new judgment is required. Release shared contracts, API and web together; existing URLs retain recommended order. Rollback removes the optional sort feature without touching retained judgments. Sorted bookmarks will fail existing strict validation after rollback, so document that limitation. During implementation, update relevant catalog/frontend documentation and record validation using the commands in README.md.
