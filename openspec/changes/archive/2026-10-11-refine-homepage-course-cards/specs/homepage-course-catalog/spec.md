# Spec Delta

## MODIFIED Requirements

### Requirement: Homepage course section integration
The homepage `#courses` section SHALL obtain its course list from the public backend catalog. Initial results SHALL be server-rendered. Course cards SHALL preserve the existing visual language and display current provider facts, hosted images, accountable prices, and per-course collection dates through the price provenance interaction. Section headings/counts SHALL describe real catalog results without unsupported popularity claims.

#### Scenario: Initial real courses
- **WHEN** a visitor opens the homepage with the backend available
- **THEN** the course section renders the first eligible course page and matching total without importing its cards from fixtures

#### Scenario: Missing metadata
- **WHEN** an eligible course lacks level, duration, description, or instructor facts
- **THEN** the associated course UI explicitly represents missing information without borrowing fixture facts or AI summaries

## ADDED Requirements

### Requirement: Visible course instructors
Real homepage course cards SHALL display a compact source-provided instructor summary directly beneath the title, with a singular or plural Persian label and isolated mixed-direction names. The summary SHALL show at most two names on one ellipsized line and a second line with the remaining-name count when needed. Missing facts SHALL remain explicit; full names SHALL be available in course details.

#### Scenario: Single or multiple instructors
- **WHEN** a course has one or more source-provided instructors
- **THEN** the card shows «مدرس:» for one name or «مدرسان:» for multiple names, preserves source order for the first two names, separates displayed names with «،», and shows «و N نفر دیگر» with Persian digits when there are more than two

#### Scenario: Unknown and empty instructor data
- **WHEN** instructor data is null or an evidenced empty list
- **THEN** the card shows «مدرس ثبت نشده» for null and «بدون مدرس ثبت‌شده» for an empty list without inventing names

#### Scenario: Long and mixed-direction names
- **WHEN** a card has long Persian names or names containing Latin text
- **THEN** the instructor line uses visual ellipsis within its compact text group without horizontal overflow, and opening course details exposes the full list

### Requirement: Stable card content alignment
Real homepage cards SHALL keep instructors immediately below the actual title height, with no empty reserved title line. Titles SHALL be limited to two lines with ellipsis while retaining their full accessible name. Flexible space SHALL follow the title/instructor group, with provider rows anchored above equal-height footers and aligned across each grid row. Full text SHALL remain available in details.

#### Scenario: Short and long content together
- **WHEN** a row contains short titles, long mixed-direction titles, and different instructor counts
- **THEN** instructors follow their title without a blank reserved line, provider rows align near the bottom above the footers, long titles end with ellipsis, and details show complete text

### Requirement: Price-associated collection provenance
Real homepage course cards SHALL omit the separate visible collection-date row and expose their own collection date in a price-associated tooltip. The localized Jalali date SHALL derive from that card's observation. The tooltip SHALL be available on hover, keyboard focus, and touch, expose its content to assistive technology, and support dismissal without opening course details.

#### Scenario: Paid price provenance
- **WHEN** a visitor hovers over or focuses the price trigger
- **THEN** the tooltip shows «قیمت ثبت‌شده در» followed by the card's own Jalali date with Persian digits, and the separate date row is absent

#### Scenario: Free, subscription, and unknown price
- **WHEN** a card shows free, subscription, or unknown pricing
- **THEN** the same provenance interaction is available, existing price semantics remain intact, and unknown-price tooltip copy uses «اطلاعات گردآوری‌شده در» without implying a known price

#### Scenario: Touch and dismissal
- **WHEN** a visitor taps the price trigger on a touch device
- **THEN** the provenance opens without navigating or opening details and closes on a second tap or outside tap
- **AND** Escape dismisses an open tooltip without changing keyboard focus; it stays dismissed until a new trigger interaction

#### Scenario: Usable tooltip placement
- **WHEN** provenance is open in an edge card or at a narrow viewport
- **THEN** it remains inside the viewport, is not clipped by the card, can remain open while the pointer is over it, and does not obscure the focused price control

### Requirement: Secondary course details action
Real homepage course cards SHALL expose a secondary action labeled «مشاهده دوره», with pale blue fill, dark brand-blue text, and visible keyboard focus. It SHALL open the existing course details dialog and preserve focus return to its trigger. Title activation SHALL retain its existing details behavior.

#### Scenario: Activate the course action
- **WHEN** a visitor clicks or keyboard-activates «مشاهده دوره»
- **THEN** the existing dialog opens for that course and closing it restores focus to the action, without introducing course-page or provider navigation

#### Scenario: Scoped appearance
- **WHEN** the revised real homepage cards and surrounding sample frontend are displayed
- **THEN** only the real cards receive the new instructor row, price provenance interaction, and secondary action appearance; sample cards and global secondary buttons retain their existing behavior and styling
