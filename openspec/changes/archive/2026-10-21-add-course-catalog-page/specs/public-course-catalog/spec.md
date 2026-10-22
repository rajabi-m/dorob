# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
