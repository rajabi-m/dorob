# course-catalog Specification

## Purpose

Provide a dedicated individual-course catalogue where visitors search retained offerings and narrow results using evidenced course facts, independently of comparison-group discovery.

## Requirements

### Requirement: Dedicated individual-course destination
`/courses` SHALL server-render eligible retained courses with the existing real course cards and direct provider links. It SHALL show the full matching count and eighteen results per page, except a shorter final page. Course eligibility SHALL remain independent of group assignment. The page SHALL expose search, provider, pricing-status and content-duration controls without category or level filters.

#### Scenario: Ungrouped course discovery
- **WHEN** a presentation-ready course has no group assignment
- **THEN** it remains discoverable on `/courses` and its title and «مشاهده دوره» open its retained source URL on the provider website in a new tab

#### Scenario: Existing card behavior
- **WHEN** a visitor activates a course title or «مشاهده دوره» on `/courses`
- **THEN** the exact retained source URL opens in a new tab with noopener/noreferrer and an accessible new-window notice, without a Dorob detail modal or detail fetch

#### Scenario: Card price provenance
- **WHEN** a visitor interacts with a card price
- **THEN** the instructor summary, title alignment, price-status semantics and observation-date tooltip remain available without navigating or opening a modal

### Requirement: Course catalogue filter semantics
Provider SHALL allow one supported provider or all providers. Pricing SHALL allow free, paid, subscription, unknown, or all statuses, using the displayed price summary. Duration SHALL allow under 3 hours, 3 to under 10 hours, 10 hours or more, or unrestricted, using content minutes. Active conditions SHALL combine with AND across the entire eligible catalogue before counting and paging. Missing duration SHALL match only unrestricted duration.

#### Scenario: Combined filters outside the first page
- **WHEN** a matching course lies beyond the unfiltered first page and the visitor selects its provider, pricing status and duration range with matching text
- **THEN** it appears in the filtered results and the total covers every matching eligible course

#### Scenario: Duration boundaries and unknown facts
- **WHEN** eligible courses have null, 179.5, 180, 599.5 and 600 content minutes
- **THEN** null matches no active duration range, 179.5 matches under 3 hours, 180 and 599.5 match 3 to under 10 hours, and 600 matches 10 hours or more, without rounding before filtering

#### Scenario: Pricing follows the card
- **WHEN** a course has several purchase options or unknown pricing
- **THEN** its pricing filter result follows its public summary status, and unknown is never treated as free or paid

### Requirement: Shareable course catalogue state
Submitted search SHALL use `q`, selected provider `provider`, pricing status `priceStatus`, duration range `duration`, and a one-based `page` in the URL. Refresh and Back/Forward SHALL restore controls and results. Empty search, unrestricted filters and page one SHALL omit their parameters. Changing search or a filter SHALL preserve other conditions and reset to page one. Superseded responses SHALL NOT replace newer results.

#### Scenario: Reload and history
- **WHEN** a visitor opens `/courses?q=Python&provider=roocket&priceStatus=free&duration=under-3h&page=2`, reloads it or returns through browser history
- **THEN** the committed conditions and matching page are restored

#### Scenario: Edit conditions from page two
- **WHEN** a visitor submits a new search or changes one filter on page two
- **THEN** the URL and results use page one while retaining the other committed conditions

### Requirement: Filter-aware course pagination
Previous and next controls SHALL preserve all committed course conditions and be unavailable at boundaries. Positive pages beyond the last matching page SHALL resolve to the last page, or page one for zero matches. The page SHALL use the public catalogue's acceptance-time order and stable ID ties without introducing relevance or quality ordering.

#### Scenario: Catalogue shrinks
- **WHEN** a requested page exceeds the last matching page after catalogue changes
- **THEN** the URL and results resolve to the last matching page without misleadingly reporting no matching courses

### Requirement: Course catalogue recovery states
The page SHALL expose removable chips for active search and filters and clear-all to `/courses`. Removing one chip SHALL preserve other conditions and reset paging. Loading, no matches, no eligible courses, invalid selection and retryable failure SHALL be distinct Persian states without fixture fallback. Retry SHALL preserve committed conditions. Provider navigation SHALL NOT fetch Dorob course details or open a course modal.

#### Scenario: Remove one filter
- **WHEN** a visitor removes the provider chip with search and pricing active
- **THEN** page one includes all providers matching the remaining conditions

#### Scenario: Empty and failed requests
- **WHEN** valid filters match nothing or the backend fails
- **THEN** zero matches offers revision/clear controls, while failure offers retry with the same conditions and never claims a zero matching total

### Requirement: Safe course catalogue URLs
Repeated recognized parameters, search longer than 200 characters, unsupported provider/status/duration selections, and invalid or unrepresentable pages SHALL show a safe Persian invalid-selection state with a link to `/courses`. Unrelated parameters SHALL NOT influence queries. Category and level parameters SHALL NOT apply course filters or infer categories. Unsupported selections SHALL NOT silently broaden results.

#### Scenario: Malformed selection
- **WHEN** a visitor opens `/courses?provider=unknown`, `/courses?page=0`, or repeated `q` values
- **THEN** an invalid-selection state appears without an unfiltered catalogue masquerading as the requested result

#### Scenario: Unrelated category parameter
- **WHEN** a visitor opens `/courses?category=code` without recognized conditions
- **THEN** the page remains an unrestricted individual-course catalogue with no category control or category-based exclusion

### Requirement: Accessible Persian course catalogue
The page SHALL use Persian RTL, localized numerals, logical layout, isolated mixed-direction text and visible keyboard focus. Desktop filters SHALL appear on the right. Mobile filters SHALL use a labelled modal with focus containment, Escape dismissal and focus return. Search, chips, paging, retry and provider links SHALL remain keyboard operable with accessible request/result status and no unintended horizontal overflow.

#### Scenario: Mobile filters and long titles
- **WHEN** a keyboard user opens filters, selects a condition and closes the panel at 320px or 390px widths with long Persian/Latin results
- **THEN** focus remains inside while open, returns to the trigger on dismissal, and controls and cards remain readable and operable without horizontal scrolling

### Requirement: Connected public discovery destinations
Homepage and both catalogue navigation areas SHALL expose clearly labelled links to `/groups` and `/courses`; the course link SHALL read «همه دوره‌ها». The homepage course shelf SHALL link to `/courses`. The group catalogue's no-groups course-discovery fallback SHALL link directly to `/courses`. Search on each catalogue SHALL stay scoped to its own catalogue.

#### Scenario: Switch discovery paths
- **WHEN** a visitor follows «همه دوره‌ها» from the homepage or group catalogue, or the no-groups fallback
- **THEN** `/courses` opens without importing group-category or group-search conditions

#### Scenario: Course-scoped search
- **WHEN** a visitor submits the `/courses` search
- **THEN** individual-course results update on `/courses` while `/groups` search continues to search groups
