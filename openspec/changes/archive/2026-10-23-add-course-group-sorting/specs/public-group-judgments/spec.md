# Spec Delta

## MODIFIED Requirements

### Requirement: Consistent paginated judgment details
GET `/api/v1/judged-groups/:slug` SHALL return current group identity/slug, retained category, selected judgment ID/time, hero and paginated assessed courses (default 20, maximum 100). Courses SHALL use the selected sort before pagination and matching retained source facts; omitted sort SHALL retain exact judgment order. Later pages SHALL accept judgmentId to pin selection; withdrawn, unavailable or superseded pins SHALL return 409 instead of mixing editions.

#### Scenario: Expensive course leads
- **WHEN** the judge places an expensive course first and sorting is omitted or recommended
- **THEN** the API and page retain it first without price-based reordering or tag penalties

#### Scenario: Selection changes during traversal
- **WHEN** a visitor requests another page pinned to an edition that is no longer selected or eligible
- **THEN** the response is 409 and the interface offers restarting from the selected first page without appending mismatched courses

#### Scenario: Working data changes during traversal
- **WHEN** memberships are added or sources refreshed between pages without replacing or withdrawing the selected edition
- **THEN** its pinned next page succeeds with the same totals, ordering and retained snapshots

## ADDED Requirements

### Requirement: Validated public comparison sort modes
Public group detail SHALL accept one optional `sort` parameter with values `recommended`, `price-asc` or `price-desc`; omission SHALL mean `recommended`. Unknown, empty or repeated sort values SHALL return 422. Group discovery SHALL continue rejecting sort. Sorting SHALL be read-only and preserve the selected retained edition, facts, assessments and judgment pin conflict rules.

#### Scenario: Default compatibility
- **WHEN** a client omits sort or supplies `recommended`
- **THEN** detail returns the exact stored judge order with complete canonical covers and unchanged assessed-course facts

#### Scenario: Invalid sort input
- **WHEN** detail receives an unsupported, empty or repeated sort parameter, or group discovery receives sort
- **THEN** the API returns a safe 422 response

#### Scenario: Sort within the pinned edition
- **WHEN** a visitor changes sort with a valid judgment pin
- **THEN** sorting uses that edition's retained prices and assessments; a superseded, withdrawn or unavailable pin returns 409 under existing rules

### Requirement: Comparable retained-price ordering
Price modes SHALL order the complete edition before pagination using the displayed retained price amount, including recorded discounts or starting prices, rather than the original amount. Free SHALL count as zero. Known outright/free prices SHALL precede known subscriptions; unknown amounts SHALL be last in both directions. Within comparable outright/free prices, amounts SHALL follow the selected direction. Ties SHALL retain judge order.

#### Scenario: Discount and starting price
- **WHEN** a course displays a discounted or starting amount
- **THEN** price sorting uses that displayed amount without selecting a different offer or consulting newer snapshots

#### Scenario: Mixed price types
- **WHEN** an edition includes free, paid, subscription and unknown prices
- **THEN** ascending orders known outright/free amounts low to high, descending orders them high to low, known subscriptions follow in judge order, and all unknown amounts follow last in judge order

#### Scenario: Different subscription periods
- **WHEN** subscription courses include monthly, yearly or other billing periods
- **THEN** their relative judge order is preserved without treating those amounts as comparable full-course purchase prices

#### Scenario: Equal prices
- **WHEN** two courses have equal comparable prices
- **THEN** both directions preserve their relative recommended order

#### Scenario: Price order crosses a page boundary
- **WHEN** a lower-priced course originally occurs after the first page
- **THEN** ascending sorting places it in its full-edition price position before slicing pages, with unchanged totals and no missing or duplicated members across pinned pages

### Requirement: URL-addressable comparison sorting controls
At desktop widths, every public group course list SHALL offer «ارزش خرید», «قیمت: کم به زیاد» and «قیمت: زیاد به کم» above its rows in RTL reading order, with the visible label «مرتب‌سازی بر اساس» and a clear accessible selected state. Recommended SHALL be selected by default. Mode selection SHALL persist in the URL, reload, history and pagination; changing mode SHALL reset offset to zero while preserving page size and the selected judgment pin.

#### Scenario: Change from a later page
- **WHEN** a visitor chooses either price mode on a later page
- **THEN** the first page of the same edition appears in that mode and pagination links preserve mode, page size and judgment pin

#### Scenario: Reload and browser navigation
- **WHEN** a visitor reloads, shares a sorted URL or uses browser back/forward
- **THEN** the selected control and server-rendered list match the URL's mode

#### Scenario: Keyboard and narrow layout
- **WHEN** the controls are used by keyboard or at 320px, 390px or 430px widths
- **THEN** labels remain legible, focus is visible, all modes are operable and no unintended horizontal page overflow occurs

### Requirement: Unobstructed comparison course thumbnails
Public comparison course thumbnails SHALL omit numbered recommendation-rank and list-position badges in every sorting mode, including recommended. Removed badges SHALL have no remaining rank-specific accessible announcement. Supported course assessment tags SHALL remain unchanged.

#### Scenario: Browse or change sorting without rank overlays
- **WHEN** a visitor opens a public group comparison, changes sorting or navigates to another course page
- **THEN** course thumbnails have no numbered rank or position overlay and assistive technology receives no announcement from a removed rank badge

### Requirement: Distinct intelligent sorting appearance
The recommended mode SHALL be labelled «ارزش خرید» and carry a decorative sparkle icon and distinct styling using Dorob's existing brand-blue, soft-blue and gold accent tokens. Its selected appearance SHALL remain unambiguous alongside the two price modes; decorative styling SHALL NOT imply selection when a price mode is active.

#### Scenario: Recognize intelligent sorting
- **WHEN** a visitor views or changes the comparison sort mode
- **THEN** «ارزش خرید» is visually distinct through its icon and treatment, and the actual selected mode remains clear without relying only on color

### Requirement: Unified value sorting and visible sorting purpose
The sorting label «مرتب‌سازی بر اساس» SHALL include a decorative sorting icon. «ارزش خرید» SHALL be a single unified button without a separate info icon or tooltip. The previous inline ordering explanation SHALL be removed, while the review date and course assessment AI attribution SHALL remain visible.

#### Scenario: Understand and select sorting
- **WHEN** a visitor views the sorting controls
- **THEN** the visible sorting label and icon explain the controls' purpose, and «ارزش خرید» has one uninterrupted activation surface with no info trigger or tooltip

### Requirement: Compact mobile comparison sorting
At viewport widths up to 760px, comparison sorting SHALL use one full-width custom dropdown instead of the desktop label and buttons. It SHALL show «مرتب‌سازی:» with the current mode and offer the same three options. Desktop controls SHALL be hidden from focus and accessibility on mobile, and the dropdown SHALL be hidden on desktop. Changing its value SHALL preserve existing sorting URL and paging behavior.

#### Scenario: Mobile selection
- **WHEN** a visitor opens comparison sorting at 320px, 390px or 430px
- **THEN** one full-width dropdown displays the current mode without a second row of sorting buttons, supports keyboard/touch selection, and changing mode resets offset while preserving limit and judgment pin

#### Scenario: Desktop selection
- **WHEN** the viewport exceeds 760px
- **THEN** the existing three sorting buttons are visible and operable and the mobile dropdown is hidden

### Requirement: Distinct accessible mobile sorting menu
The custom mobile dropdown SHALL distinguish «ارزش خرید» with brand styling and a decorative sparkle icon, without an AI text label. This treatment SHALL also appear on the trigger when value sorting is selected. Options SHALL announce selection. Arrow keys, Home and End SHALL move focus; Enter/Space SHALL select. Escape SHALL close and restore trigger focus; outside interaction and leaving the control SHALL dismiss the menu.

#### Scenario: Value treatment and keyboard selection
- **WHEN** a visitor opens the mobile dropdown by touch or keyboard
- **THEN** the current option receives focus, «ارزش خرید» has distinct brand styling and a sparkle icon, and keyboard selection preserves existing sorting/paging behavior

#### Scenario: Dismiss menu
- **WHEN** the visitor presses Escape, interacts outside or tabs away
- **THEN** the menu closes without changing sorting, with focus restored to the trigger on Escape

### Requirement: Independent complete hero slideshow
Public comparison detail SHALL include covers (courseId, title and retained thumbnail) for every assessed member in canonical judgment order, independent of course-row sorting, offset and limit. The hero slideshow SHALL use this complete cover list and SHALL NOT reset its active slide solely because row sort or page changes. Discovery cover limits SHALL remain unchanged.

#### Scenario: Sort or paginate comparison rows
- **WHEN** a visitor changes price sorting or navigates between course pages within the same edition
- **THEN** the hero retains its complete image list, canonical order and active slide instead of adopting the row order or page subset
