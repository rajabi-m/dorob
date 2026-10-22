# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic current-course eligibility
Public course reads SHALL expose courses with a valid accepted current observation and its required accountable pricing section, independently of thumbnail readiness or file availability. Eligibility SHALL be independent of group membership and SHALL NOT introduce course publication flags. Minimal references without a current accepted observation SHALL remain management-only.

#### Scenario: Ready ungrouped course
- **WHEN** a course has a valid accepted current observation and no editorial group membership
- **THEN** it appears in the public list and its public detail resolves, with its current hosted thumbnail when recorded

#### Scenario: Unready refresh
- **WHEN** a new accepted current observation has a pending, missing or failed thumbnail while an older observation has a ready image
- **THEN** the course remains visible using the new observation's facts and no thumbnail, without borrowing historical facts or images

#### Scenario: Lost image file
- **WHEN** a recorded hosted image is deleted, unreadable or corrupt
- **THEN** the otherwise eligible course remains in discovery and detail, and image loss alone does not change matching totals or order

#### Scenario: Minimal reference
- **WHEN** a course has only a reference record and no accepted current observation
- **THEN** it remains absent from public lists and public detail returns 404

### Requirement: Public course presentation contract
Public list items SHALL include course identity, title, provider, source URL, observation identity/time, nullable thumbnail metadata, accountable price summary, and available level/duration/instructors. Details SHALL add description, syllabus and purchase offers from that observation. Responses SHALL omit raw evidence, request hashes, submission IDs, history and processing diagnostics. Missing image metadata SHALL be null, without fabricated asset identifiers.

#### Scenario: Source facts without management payload
- **WHEN** a visitor requests an eligible course
- **THEN** its public facts belong to its current observation and missing fields stay explicit without exposing raw HTML, locators, or private ingestion metadata

#### Scenario: No current hosted image
- **WHEN** the current observation has no ready hosted-image association
- **THEN** list and detail return thumbnail=null and preserve all otherwise available facts

#### Scenario: Recorded image cannot load
- **WHEN** a ready image association exists but its file is unavailable
- **THEN** metadata reads may return the recorded current image reference without inspecting its bytes or substituting another observation's image, and the website handles the failed asset request with a fallback

### Requirement: Documented safe public reads
Public course detail SHALL accept canonically encoded course IDs. Public routes SHALL document schemas in OpenAPI and return safe 422 for invalid inputs, 404 for missing or ineligible details, and 503 for unavailable database or incomplete query preparation. Metadata reads SHALL not depend on thumbnail storage availability. Asset reads SHALL retain safe storage errors. Errors SHALL exclude internal diagnostics; management and public group contracts SHALL remain intact.

#### Scenario: Validate requests and storage outage
- **WHEN** a caller submits invalid category/pagination, the database is unavailable, or thumbnail storage is unavailable
- **THEN** invalid metadata requests return 422, database failures return 503, and image-storage failure affects asset requests without hiding accepted courses or failing otherwise valid metadata reads

#### Scenario: Encoded identity and compatibility
- **WHEN** a valid encoded course ID is used for public detail and existing management/group endpoints are exercised
- **THEN** detail resolves the stable identity and existing endpoint contracts remain unchanged, including stricter retained-group image eligibility

## ADDED Requirements

### Requirement: Bounded individual-course discovery reads
Course list reads SHALL filter, count and paginate in the database before hydrating public cards. They SHALL NOT load or present every full observation to return a page, inspect thumbnail files, mutate thumbnail readiness, or initiate repair. Matching totals and items SHALL use one consistent database view. Empty and beyond-last-page responses SHALL retain the exact matching total.

#### Scenario: First-page request in a larger catalogue
- **WHEN** eighteen results are requested from a larger catalogue
- **THEN** the API hydrates at most eighteen course records and performs no course-image filesystem operations while counting all database-eligible matches

#### Scenario: Empty or excessive offset
- **WHEN** no courses match or the requested offset exceeds the matching count
- **THEN** the API returns an empty item list and the correct matching total rather than losing the count with an empty page

#### Scenario: Combined filters preserve results
- **WHEN** callers combine Persian-normalized literal search, provider, price, duration and optional category filters
- **THEN** conditions apply before paging with existing price-selection semantics, exact duration boundaries, acceptance-time ordering and stable course-ID ties

#### Scenario: Concurrent observation or editorial change
- **WHEN** ingestion or group membership changes while count and page queries execute
- **THEN** the returned total and items describe one consistent database view without mixing observation identities

### Requirement: Coherent prepared course facts
Search/filter preparation SHALL be derived from accepted observations without altering source facts. Newly accepted observations SHALL become queryable atomically with their current identity; image-state changes SHALL not exclude them. Existing records SHALL be prepared through explicit upgrade tooling before readiness. Interrupted preparation SHALL be resumable without silently serving a partial catalogue.

#### Scenario: Existing deployment upgrade
- **WHEN** the release upgrades an existing catalogue on its retained disk
- **THEN** existing eligible records are prepared without re-ingestion or image processing and the completed preparation survives restart

#### Scenario: Failed or interrupted preparation
- **WHEN** preparing existing query records is interrupted
- **THEN** startup does not claim catalogue readiness and an explicit retry safely completes preparation without overwriting accepted history

#### Scenario: Ingestion transaction failure
- **WHEN** deriving query facts fails during acceptance of a new observation
- **THEN** neither the new current identity nor partially prepared query facts become visible
