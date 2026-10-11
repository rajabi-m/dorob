# homepage-course-catalog Specification

## Purpose

Display real retained backend courses in the existing homepage course section while preserving the surrounding frontend and its sample experiences.

## Requirements

### Requirement: Homepage course section integration
The homepage `#courses` section SHALL obtain its course list from the public backend catalog. Initial results SHALL be server-rendered. Course cards SHALL preserve the existing visual language and display current provider facts, hosted images, accountable prices, and per-course collection dates through the price provenance interaction. Section headings/counts SHALL describe real catalog results without unsupported popularity claims.

#### Scenario: Initial real courses
- **WHEN** a visitor opens the homepage with the backend available
- **THEN** the course section renders the first eligible course page and matching total without importing its cards from fixtures

#### Scenario: Missing metadata
- **WHEN** an eligible course lacks level, duration, description, or instructor facts
- **THEN** the associated course UI explicitly represents missing information without borrowing fixture facts or AI summaries

### Requirement: Catalog-wide course interactions
Existing homepage search, category, and free controls SHALL drive backend course queries without changing their layout or styling. New pagination controls SHALL be confined to the course section. A filter change SHALL reset paging. Responses from superseded requests SHALL NOT overwrite newer results. Counts and empty states SHALL represent the entire matching eligible catalog.

#### Scenario: Query and paging
- **WHEN** a visitor searches or changes a filter and moves to another page
- **THEN** results use the selected conditions, show the matching total, and navigate bounded pages rather than filtering only loaded cards

#### Scenario: Rapid query changes
- **WHEN** an older request completes after a newer selection
- **THEN** the course section retains the newer selection's results

### Requirement: Real course details remain traceable
Opening a database course card SHALL show public details for that stable course identity, with available description, syllabus, offers, provider link, and observation date. Missing fields SHALL remain explicit. If the current observation changed since the card loaded, details SHALL identify their own observation/time rather than implying that they are the card's earlier snapshot.

#### Scenario: Open a real card
- **WHEN** a visitor opens a database course card
- **THEN** the dialog uses that course's public facts and provider URL without fixture content or sample-only labels

#### Scenario: Course becomes ineligible
- **WHEN** a course's public detail returns 404 after its card was rendered
- **THEN** the dialog explains that details are unavailable and permits closing or refreshing results without showing historical or sample substitutes

### Requirement: Scoped resilient course states
The course section and real-course dialog SHALL present Persian loading, empty, and safe retryable error states. Backend failures, timeouts, or invalid responses SHALL NOT replace real results with fixtures or block surrounding homepage content. Image failures SHALL use an honest visual placeholder without claiming that a source image was retrieved.

#### Scenario: Backend unavailable on arrival
- **WHEN** initial course fetching fails
- **THEN** surrounding homepage content remains usable and the course section shows a scoped error with retry

#### Scenario: Recovery and empty results
- **WHEN** a failed request is retried after recovery, or a valid query matches no courses
- **THEN** real results return after recovery, or a distinct empty state appears for zero matches

### Requirement: Preserve surrounding sample frontend
The hero and its course shelf/provider strip, groups, topic/category appearance, header/navigation/footer, group routes, and design-system previews SHALL retain their existing appearance, data, and behavior. Only control wiring necessary for real course queries SHALL change outside the course section. Hero sample-card details SHALL retain their sample facts and labels independently of real-course details.

#### Scenario: Sample hero details
- **WHEN** a visitor opens a hero sample card after viewing a database course
- **THEN** the sample dialog still shows that fixture's own data and sample provenance without triggering a public course-detail lookup

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** their fixture content, links, presentation, and interactions remain unchanged

### Requirement: Accessible Persian course presentation
Integrated course content SHALL retain Persian RTL presentation, localized numbers and Jalali dates, isolated mixed-direction text, logical layout properties, and usable mobile layouts. Loading/results SHALL expose accessible status, paging/retry SHALL be keyboard usable, and real-course dialogs SHALL retain focus handling and return focus to their triggering control.

#### Scenario: Keyboard and mobile discovery
- **WHEN** a visitor uses paging, retries, and course details by keyboard or on a narrow viewport with long mixed Persian/Latin titles
- **THEN** controls have visible focus, the dialog restores focus, announcements reflect request state, and content does not introduce unintended horizontal overflow

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
Real homepage course cards SHALL expose a secondary action labeled «مشاهده دوره», with pale blue fill, dark brand-blue text, and visible keyboard focus. It SHALL open the existing course details dialog and preserve focus return to its trigger. Title activation SHALL retain its existing details behavior.

#### Scenario: Activate the course action
- **WHEN** a visitor clicks or keyboard-activates «مشاهده دوره»
- **THEN** the existing dialog opens for that course and closing it restores focus to the action, without introducing course-page or provider navigation

#### Scenario: Scoped appearance
- **WHEN** the revised real homepage cards and surrounding sample frontend are displayed
- **THEN** only the real cards receive the new instructor row, price provenance interaction, and secondary action appearance; sample cards and global secondary buttons retain their existing behavior and styling
