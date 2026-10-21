# homepage-course-catalog Specification

## Purpose

Display real retained backend courses in the existing homepage course section while preserving the surrounding frontend and its sample experiences.

## Requirements

### Requirement: Homepage course section integration
The homepage `#courses` section SHALL server-render at most three eligible courses from the public backend catalogue in acceptance-time order with stable ID ties. It SHALL preserve real cards, provider facts, hosted images, accountable prices and price-associated observation dates. The section SHALL expose «مشاهده همه دوره‌ها» linking to `/courses`, without course search, filters, totals or pagination. Copy SHALL avoid unsupported popularity or quality claims.

#### Scenario: Initial real courses
- **WHEN** a visitor opens the homepage with the backend available
- **THEN** the course section renders up to the first three eligible courses without importing fixture cards or showing full catalogue pagination

#### Scenario: Missing metadata
- **WHEN** an eligible course lacks level, duration, description, or instructor facts
- **THEN** the associated course UI explicitly represents missing information without borrowing fixture facts or AI summaries

#### Scenario: Fewer than three eligible courses
- **WHEN** only one or two eligible courses exist
- **THEN** only those courses render and the all-courses link remains available without fabricated filler

### Requirement: Catalog-wide course interactions
Homepage header search SHALL navigate to `/groups` with submitted nonempty search in `q`, omitting `q` for empty normalized input. Its accessible name SHALL identify group search. Homepage category cards SHALL continue to navigate to `/groups?category=<id>`. Full individual-course discovery SHALL live at `/courses`; homepage search SHALL NOT filter the course shelf or initiate course-result paging.

#### Scenario: Query and paging
- **WHEN** a visitor submits homepage search
- **THEN** the group catalogue opens on its first page with that search, while individual-course filters and pagination remain on `/courses`

#### Scenario: Rapid query changes
- **WHEN** a visitor edits homepage search before submitting
- **THEN** typing does not issue course queries or replace the course shelf and submission uses the current input

#### Scenario: Category navigation
- **WHEN** a visitor activates a homepage category card
- **THEN** the corresponding filtered group catalogue opens rather than changing homepage course results

#### Scenario: Empty homepage search
- **WHEN** a visitor submits empty or whitespace-only homepage search
- **THEN** `/groups` opens without a search parameter or retained catalogue conditions

### Requirement: Real course details remain traceable
Public course titles and «مشاهده دوره» SHALL link directly to the course's retained provider source URL in a new tab with noopener/noreferrer and an accessible new-window notice. Neither action SHALL open a local details dialog or fetch public course details. The price-associated observation-date interaction SHALL remain independent of navigation.

#### Scenario: Open a real card
- **WHEN** a visitor activates a database course title or «مشاهده دوره»
- **THEN** the exact provider source URL opens without a local course dialog or detail lookup

#### Scenario: Course becomes ineligible
- **WHEN** a previously rendered course later becomes ineligible for new public reads
- **THEN** its existing source link still targets that card's retained provider URL and does not introduce a failed local-detail lookup

### Requirement: Scoped resilient course states
The course section SHALL present Persian loading, empty and safe retryable error states. Backend failures, timeouts or invalid responses SHALL NOT replace real results with fixtures or block surrounding homepage content. Image failures SHALL use an honest placeholder. Course source links SHALL navigate directly to providers without a local detail request or detail error state.

#### Scenario: Backend unavailable on arrival
- **WHEN** initial course fetching fails
- **THEN** surrounding homepage content remains usable and the course section shows a scoped error with retry

#### Scenario: Recovery and empty results
- **WHEN** a failed request is retried after recovery, or a valid query matches no courses
- **THEN** real results return after recovery, or a distinct empty state appears for zero matches

### Requirement: Preserve surrounding sample frontend
The public homepage SHALL retain its real-group hero, provider animations, category appearance, shared breadcrumbs and group showcase. Header search and catalogue navigation SHALL retain current destinations. Group cards and routes SHALL follow public-group-judgments. `/design-system` SHALL remain a maintained reference for current shared components with isolated fixtures; obsolete alternatives and unreachable sample flows need not remain available.

#### Scenario: Sample hero details
- **WHEN** obsolete homepage fixture branches or an unused hero alternative are retired
- **THEN** the public homepage retains the real-group hero without a sample dialog or fixture fallback, and independently retained design-system examples use their own facts without public detail lookups

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** group cards and destinations use real judged groups and documented legacy redirects, while `/design-system` remains usable as the reference for maintained components with backend-independent examples

#### Scenario: Scoped homepage discovery update
- **WHEN** the homepage is displayed
- **THEN** category cards retain their group-catalogue links, the group section retains up to three cards and its all-groups action, and the individual-course section is a bounded shelf after group discovery

#### Scenario: Real hero preserved
- **WHEN** the featured real group's eligibility or current judgment changes
- **THEN** the existing real-group hero contract determines its display or unavailable state without reintroducing saved sample courses

#### Scenario: Provider animation and section navigation
- **WHEN** a visitor uses the hero at desktop or mobile widths
- **THEN** the desktop provider strip or mobile vertical logo/name wheel retains its current presentation, reduced-motion handling and absence of pause controls or hover pause, and «دیدن مجموعه دوره‌ها» scrolls to homepage `#groups` even when that fragment is already present

#### Scenario: Public course navigation stays independent
- **WHEN** a visitor submits homepage search or activates a public course title or course action
- **THEN** search opens the group catalogue while the course link opens its retained provider URL in a new tab, without reviving fixture filtering or local course-detail dialogs

### Requirement: Accessible Persian course presentation
Integrated courses SHALL retain Persian RTL, localized numbers and Jalali dates, isolated mixed-direction text, logical layout and usable mobile layouts. Loading/results SHALL expose accessible status; paging, retry, provider links and price provenance SHALL remain keyboard usable with visible focus. Provider links SHALL identify new-window behavior without opening local details dialogs.

#### Scenario: Keyboard and mobile discovery
- **WHEN** a visitor uses paging, retries, price provenance and course source links by keyboard or on a narrow viewport with long mixed Persian/Latin titles
- **THEN** controls have visible focus, new-window behavior is announced, request states remain accessible and content does not introduce horizontal overflow

### Requirement: Environment-independent browser access
Course requests and hosted thumbnails SHALL work through the web origin without exposing a browser dependency on the API's loopback address. Backend origin configuration SHALL remain server-only. The local launcher SHALL honor its selected API port for the web integration. Browser inputs SHALL NOT select arbitrary proxy upstream origins or paths.

#### Scenario: Custom port and another device
- **WHEN** the app uses a nondefault API port and the web page is opened from a browser that can reach the web server but not the API loopback address
- **THEN** course data and hosted images resolve through the web origin using the configured backend

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
Real homepage course cards SHALL expose a secondary link labeled «مشاهده دوره», with pale blue fill, dark brand-blue text and visible keyboard focus. It SHALL open the retained provider course URL in a new tab with noopener/noreferrer and an accessible new-window notice. Title activation SHALL use the same destination. Neither action SHALL open a local course-details dialog.

#### Scenario: Activate the course action
- **WHEN** a visitor clicks or keyboard-activates «مشاهده دوره»
- **THEN** the provider course page opens in a new tab without a local details dialog or public course-detail fetch

#### Scenario: Scoped appearance
- **WHEN** real homepage cards and independent design-system fixtures are displayed
- **THEN** real card source links retain their instructor rows, price provenance and secondary-action appearance while fixture-only dialogs and global secondary buttons retain their independent behavior
