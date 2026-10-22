# Spec Delta

## MODIFIED Requirements

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

### Requirement: Preserve surrounding sample frontend
The existing hero and its current real-group shelf/provider strip, topic/category appearance, group showcase and design-system previews SHALL retain their presentation and data behavior. Header search and public catalogue navigation SHALL follow the new discovery destinations. Homepage group cards and group routes SHALL continue to use the public-group-judgments contract. Independent design-system fixtures SHALL remain isolated from real public course details.

#### Scenario: Sample hero details
- **WHEN** a visitor opens an independently maintained design-system hero sample card after viewing a database course
- **THEN** the sample dialog retains its own fixture facts and provenance without triggering a real public course-detail lookup, while the public homepage continues to use its existing real-group hero

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** group cards and destinations use real judged groups and documented legacy redirects, while design-system fixture content, links, presentation and interactions remain unchanged

#### Scenario: Scoped homepage discovery update
- **WHEN** the homepage is displayed
- **THEN** category cards retain their group-catalogue links, the group section retains up to three cards and its all-groups action, and the individual-course section is a bounded shelf after group discovery

#### Scenario: Real hero preserved
- **WHEN** the featured real group's eligibility or current judgment changes
- **THEN** the existing real-group hero contract determines its display or unavailable state without reintroducing saved sample courses

### Requirement: Real course details remain traceable
Public course titles and «مشاهده دوره» SHALL link directly to the course's retained provider source URL in a new tab with noopener/noreferrer and an accessible new-window notice. Neither action SHALL open a local details dialog or fetch public course details. The price-associated observation-date interaction SHALL remain independent of navigation.

#### Scenario: Open a real card
- **WHEN** a visitor activates a database course title or «مشاهده دوره»
- **THEN** the exact provider source URL opens without a local course dialog or detail lookup

#### Scenario: Course becomes ineligible
- **WHEN** a previously rendered course later becomes ineligible for new public reads
- **THEN** its existing source link still targets that card's retained provider URL and does not introduce a failed local-detail lookup

### Requirement: Secondary course details action
Real homepage course cards SHALL expose a secondary link labeled «مشاهده دوره», with pale blue fill, dark brand-blue text and visible keyboard focus. It SHALL open the retained provider course URL in a new tab with noopener/noreferrer and an accessible new-window notice. Title activation SHALL use the same destination. Neither action SHALL open a local course-details dialog.

#### Scenario: Activate the course action
- **WHEN** a visitor clicks or keyboard-activates «مشاهده دوره»
- **THEN** the provider course page opens in a new tab without a local details dialog or public course-detail fetch

#### Scenario: Scoped appearance
- **WHEN** real homepage cards and independent design-system fixtures are displayed
- **THEN** real card source links retain their instructor rows, price provenance and secondary-action appearance while fixture-only dialogs and global secondary buttons retain their independent behavior

### Requirement: Scoped resilient course states
The course section SHALL present Persian loading, empty and safe retryable error states. Backend failures, timeouts or invalid responses SHALL NOT replace real results with fixtures or block surrounding homepage content. Image failures SHALL use an honest placeholder. Course source links SHALL navigate directly to providers without a local detail request or detail error state.

#### Scenario: Backend unavailable on arrival
- **WHEN** initial course fetching fails
- **THEN** surrounding homepage content remains usable and the course section shows a scoped error with retry

#### Scenario: Recovery and empty results
- **WHEN** a failed request is retried after recovery, or a valid query matches no courses
- **THEN** real results return after recovery, or a distinct empty state appears for zero matches

### Requirement: Accessible Persian course presentation
Integrated courses SHALL retain Persian RTL, localized numbers and Jalali dates, isolated mixed-direction text, logical layout and usable mobile layouts. Loading/results SHALL expose accessible status; paging, retry, provider links and price provenance SHALL remain keyboard usable with visible focus. Provider links SHALL identify new-window behavior without opening local details dialogs.

#### Scenario: Keyboard and mobile discovery
- **WHEN** a visitor uses paging, retries, price provenance and course source links by keyboard or on a narrow viewport with long mixed Persian/Latin titles
- **THEN** controls have visible focus, new-window behavior is announced, request states remain accessible and content does not introduce horizontal overflow
