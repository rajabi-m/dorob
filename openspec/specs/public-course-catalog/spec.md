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
GET `/api/v1/courses` SHALL accept `q`, `category`, `freeOnly`, `provider`, `priceStatus`, `duration`, `limit`, and `offset`. It SHALL return items, matching total, limit, and offset; default limit SHALL be 18, maximum 100, and default offset zero. Eligibility and filters SHALL apply before pagination. Order SHALL be current acceptance time descending with stable course ID as the tie-breaker. Reads SHALL NOT start collection, AI, or image processing.

#### Scenario: Match beyond the first page
- **WHEN** a query matches an eligible course outside the unfiltered first page
- **THEN** it appears in the filtered pages and the total counts all matching eligible courses

#### Scenario: Deterministic paging
- **WHEN** unchanged catalog data is requested with successive offsets
- **THEN** pages follow the documented order without duplicate or skipped courses due to tied timestamps

#### Scenario: Compatible omitted filters
- **WHEN** an existing caller omits provider, priceStatus and duration
- **THEN** existing defaults, response shape, category/free-only behavior and ordering remain unchanged

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

### Requirement: Provider and pricing-status course filters
Optional `provider` SHALL accept one of `maktabkhooneh`, `toplearn`, `quera`, `sabzlearn`, or `roocket` and match the course provider ID. Optional `priceStatus` SHALL accept `free`, `paid`, `subscription`, or `unknown` and match the public price summary status. Omitted filters SHALL impose no restriction. All supplied conditions SHALL combine with AND before matching totals and pagination.

#### Scenario: Filter real course facts
- **WHEN** provider and priceStatus are supplied with text search
- **THEN** every result matches all three conditions and totals exclude nonmatching courses across the entire eligible catalogue

#### Scenario: Multiple offers
- **WHEN** a course has both a free and paid offer and its public summary is free
- **THEN** it matches priceStatus=free and does not match priceStatus=paid, without discarding its separate detail offers

#### Scenario: Subscription and unknown remain distinct
- **WHEN** eligible courses have subscription or unknown price summaries
- **THEN** they match only their respective pricing status and are not inferred to be free from a zero or absent amount

### Requirement: Content-duration course filters
Optional `duration` SHALL accept `under-3h`, `3-to-10h`, or `10h-plus`. These SHALL match content minutes below 180, from 180 inclusive to 600 exclusive, or at least 600 respectively. Filtering SHALL use source precision without display rounding or study-effort/completion-window substitution. Null durations SHALL match no selected range and remain eligible when duration is omitted.

#### Scenario: Exact boundaries
- **WHEN** courses have 179.5, 180, 599.5 and 600 content minutes
- **THEN** the first matches under-3h, the middle two match 3-to-10h, and the last matches 10h-plus

#### Scenario: Unknown duration
- **WHEN** content duration is null but an effort estimate or completion deadline exists
- **THEN** no duration range matches and unrestricted discovery still includes the otherwise-eligible course

### Requirement: Validated additive course filters
Unsupported or repeated provider, priceStatus or duration values SHALL return safe 422 responses in public API and same-origin web reads. New filters SHALL be documented in OpenAPI and forwarded without loss. Legacy `freeOnly=true` SHALL remain an alias for free summaries: absent or free priceStatus is valid; any other priceStatus with freeOnly=true SHALL return 422. Existing category validation SHALL remain unchanged.

#### Scenario: Invalid and duplicate values
- **WHEN** a caller sends provider=unknown, an unsupported duration, repeated priceStatus, or an arbitrary upstream parameter
- **THEN** a safe 422 response is returned without internal diagnostics or silently ignored filters

#### Scenario: Legacy free compatibility
- **WHEN** freeOnly=true is requested alone or with priceStatus=free
- **THEN** results retain existing explicit-free semantics

#### Scenario: Conflicting price selections
- **WHEN** freeOnly=true is combined with priceStatus=paid, subscription or unknown
- **THEN** the request returns 422 instead of silently overriding either selection

#### Scenario: Web proxy preserves conditions
- **WHEN** valid new filters are sent through `/api/courses`
- **THEN** the backend receives the same conditions with existing bounded validated responses, finite deadlines and a server-only API origin
