# public-course-catalog Specification

## Purpose

Expose retained current course facts through a stable, read-only website contract without coupling visitors to ingestion management or observation history.

## Requirements

### Requirement: Automatic current-course eligibility
Public course reads SHALL expose a course only when its current accepted observation is presentation-ready under the existing thumbnail contract. Eligibility SHALL be independent of group membership and SHALL NOT introduce course publication flags. Minimal references and unready current observations SHALL remain management-only.

#### Scenario: Ready ungrouped course
- **WHEN** a course has a presentation-ready current observation and no editorial group membership
- **THEN** it appears in the public list and its public detail resolves

#### Scenario: Unready refresh
- **WHEN** a new current observation has a pending or failed thumbnail while an older observation is ready
- **THEN** the course is absent from public lists and public detail returns 404 without falling back to historical facts or images

### Requirement: Public course presentation contract
Public list items SHALL include stable course identity, title, provider identity, source URL, observation identity/time, hosted thumbnail, accountable price summary, and available level/duration/instructors. Public details SHALL additionally expose available description, syllabus, and purchase offers from the same current observation. Responses SHALL omit raw evidence, request hashes, submission IDs, history, and processing diagnostics.

#### Scenario: Source facts without management payload
- **WHEN** a visitor requests an eligible course
- **THEN** its public facts belong to its current observation and missing fields stay explicit without exposing raw HTML, locators, or private ingestion metadata

### Requirement: Accountable public pricing
Public pricing SHALL distinguish free, paid, subscription, and unknown. It SHALL retain available purchase options and currency meaning without guessing normalized amounts. A list price summary SHALL identify its selected offer or explicitly represent unavailable pricing. Zero SHALL denote free only with explicit free status; unknown pricing SHALL NOT prevent otherwise-ready visibility.

#### Scenario: Multiple known paid offers
- **WHEN** a course has several positively priced one-time toman offers
- **THEN** the summary identifies the lowest priced offer, labels it as a starting price when needed, and detail preserves the separate offers and terms

#### Scenario: Unknown or subscription pricing
- **WHEN** a course has unknown pricing or only subscription access
- **THEN** the response preserves that status and available amount/billing period without presenting unknown as free or subscription as a one-time purchase

### Requirement: Paginated catalog discovery
GET `/api/v1/courses` SHALL accept `q`, `category`, `freeOnly`, `limit`, and `offset`. It SHALL return items, matching total, limit, and offset; default limit SHALL be 18, maximum 100, and default offset zero. Eligibility and filters SHALL apply before pagination. Order SHALL be current acceptance time descending with stable course ID as the tie-breaker. Reads SHALL NOT start collection, AI, or image processing.

#### Scenario: Match beyond the first page
- **WHEN** a query matches an eligible course outside the unfiltered first page
- **THEN** it appears in the filtered pages and the total counts all matching eligible courses

#### Scenario: Deterministic paging
- **WHEN** unchanged catalog data is requested with successive offsets
- **THEN** pages follow the documented order without duplicate or skipped courses due to tied timestamps

### Requirement: Honest search and category filters
Search SHALL match title, provider identity/name, and available instructor names using consistent Persian/Arabic letter and spacing normalization. Free filtering SHALL require an explicit free offer. Category filtering SHALL use membership in currently public-eligible editorial groups of the selected fixed category, deduplicating courses. Unassigned courses SHALL appear in unfiltered discovery without guessed categories.

#### Scenario: Persian search normalization
- **WHEN** a title contains Persian letters or ZWNJ and a query uses equivalent Arabic letters or spaces
- **THEN** equivalent normalized text matches without altering stored source facts

#### Scenario: Ungrouped course and category selection
- **WHEN** a ready course has no membership in a public-eligible group for the selected category
- **THEN** it remains available in unfiltered discovery but is excluded from that category's results

### Requirement: Documented safe public reads
GET `/api/v1/courses/:courseId` SHALL accept canonically encoded course IDs. Public routes SHALL document request/response schemas in OpenAPI, return 422 for invalid inputs, 404 for missing or ineligible details, and 503 for unavailable database or required storage. Errors SHALL exclude credentials, SQL, filesystem paths, and raw internal diagnostics. Existing management and public group APIs SHALL retain their behavior.

#### Scenario: Validate requests and storage outage
- **WHEN** a client submits an invalid category or pagination value, or required storage is unavailable
- **THEN** a documented safe 422 or 503 response is returned respectively

#### Scenario: Encoded identity and compatibility
- **WHEN** a valid encoded course ID is used for public detail and existing management/group endpoints are exercised
- **THEN** detail resolves the stable identity and existing endpoint contracts remain unchanged
