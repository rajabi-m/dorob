# homepage-course-catalog Specification

## Purpose

Display real retained backend courses in the existing homepage course section while preserving the surrounding frontend and its sample experiences.

## Requirements

### Requirement: Homepage course section integration
The homepage `#courses` section SHALL obtain its course list from the public backend catalog. Initial results SHALL be server-rendered. Course cards SHALL preserve the existing visual language and display current provider facts, hosted images, accountable prices, and per-course collection dates. Section headings/counts SHALL describe real catalog results without unsupported popularity claims.

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
