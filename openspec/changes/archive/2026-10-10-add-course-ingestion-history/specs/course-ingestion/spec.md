# Spec Delta

## Purpose

Preserve traceable provider course observations through a flexible local API, retaining history and exposing current facts without requiring every scraper to collect every supported field.

## ADDED Requirements

### Requirement: Required ingestion core
The ingestion API SHALL require schema version, submission ID, provider/course identity, nonblank title, HTTPS source URL, successful observation time, extractor identity/version, collection method, field evidence, pricing, thumbnail input, and coverage. It SHALL generate course identity, snapshot identity, receipt time, and content hash server-side.

#### Scenario: Minimal valid observation
- **WHEN** a client submits the required core with explicit unavailable pricing and thumbnail reasons and omits optional educational sections
- **THEN** the observation is accepted and retained without invented descriptions, prices, or images

#### Scenario: Missing required sections
- **WHEN** pricing or thumbnail input is omitted, or source identity/provenance is invalid
- **THEN** HTTP 422 rejects the submission without creating a course or snapshot

### Requirement: Optional source-fact sections
The API SHALL accept validated descriptions, images, instructors, educational content, classification, delivery, offers, duration, syllabus, provider state, ratings, counts, anonymous feedback, features, and selected normalization evidence covering the v2 contract. Optional sections SHALL be omittable. Provider extensions SHALL be namespaced and bounded; unknown top-level fields SHALL be rejected.

#### Scenario: Rich observation round trip
- **WHEN** a client submits all supported v2 source facts through the v3 envelope
- **THEN** snapshot detail returns the validated facts, original price evidence, list ordering, coverage, and source locators without dropping supported fields

#### Scenario: Sparse observation
- **WHEN** a client collects only basic metadata and required pricing/thumbnail sections
- **THEN** ingestion succeeds without requiring syllabus, instructor, review, or outcome data

### Requirement: Collection-state semantics
Coverage SHALL distinguish complete, partial, unknown, and failed collection per submitted section. Omission SHALL mean uninspected. Null SHALL mean unknown, and empty lists SHALL require confirmed emptiness. Failed or partial collection SHALL include a reason; complete SHALL require supporting evidence, not merely nonnull data.

#### Scenario: Failed curriculum extraction
- **WHEN** a new observation reports failed curriculum extraction
- **THEN** current detail reports that snapshot's failed curriculum state and earlier curriculum remains accessible only through history

#### Scenario: Confirmed empty content
- **WHEN** a later complete observation explicitly establishes an empty list
- **THEN** the current section becomes empty and the previous nonempty observation remains in history

### Requirement: Mandatory pricing accountability
Every observation SHALL include pricing coverage and offers or an explicit unavailable reason. Pricing SHALL distinguish free, paid, subscription, and unknown, retain original currency evidence, and support multiple offers. Zero SHALL require explicit free evidence; unverified currency SHALL NOT yield a guessed normalized amount.

#### Scenario: Known and unknown pricing
- **WHEN** one submission establishes a free offer and another cannot establish a price
- **THEN** the first stores zero with free status and the second stores unknown pricing with a reason, without equating missing price to free

#### Scenario: Multiple purchase options
- **WHEN** the provider publishes content-only and full-access offers with different prices and terms
- **THEN** both offers and their separate source evidence are retained

### Requirement: Immutable observation history
Accepted source observations SHALL remain individually addressable with submitted facts, coverage, source timestamp, receipt timestamp, and server-calculated hash. New observations SHALL NOT overwrite earlier facts or erase group memberships. Unchanged successful observations SHALL remain traceable independently of fact-change hashes.

#### Scenario: Provider price changes
- **WHEN** two observations of one course have different prices
- **THEN** both snapshot IDs resolve to their respective prices and the stable course ID and group links remain intact

#### Scenario: Unchanged later check
- **WHEN** a new submission observes identical facts at a later time
- **THEN** it receives a separate observation identity and receipt time while its facts hash remains unchanged

### Requirement: Idempotent submission retries
Submission IDs SHALL be unique per course. Replaying the same submission content SHALL return the original snapshot without duplicate history or assets or changing which snapshot is current. Reusing an ID with changed content SHALL return HTTP 409. Concurrent writes SHALL preserve one course identity and serialized snapshot acceptance.

#### Scenario: Retry after lost response
- **WHEN** a client repeats an accepted submission with the same ID and content
- **THEN** HTTP 200 returns the existing snapshot and history contains one observation for that submission

#### Scenario: Conflicting retry
- **WHEN** a client changes content while reusing an accepted submission ID
- **THEN** HTTP 409 returns a safe conflict without modifying the original observation

### Requirement: Whole-snapshot current detail
Current detail SHALL use the latest newly accepted snapshot as a whole, ordered by per-course acceptance. All facts, coverage, timestamps, and thumbnail association SHALL belong to that snapshot. Missing, unknown, partial, or failed fields SHALL remain explicit without historical fallback. Earlier accepted snapshots SHALL remain separately addressable in history.

#### Scenario: Price refresh omits curriculum
- **WHEN** an observation updates pricing and leaves curriculum uninspected
- **THEN** current detail exposes that snapshot's pricing and omitted curriculum without importing an older syllabus

#### Scenario: Latest acceptance determines current detail
- **WHEN** a new valid snapshot is accepted after the existing current snapshot
- **THEN** it becomes current as a whole without ranking sections by completeness or source timestamp

#### Scenario: Replay historical submission
- **WHEN** a client replays an accepted submission after another snapshot has become current
- **THEN** the original snapshot is returned and the current snapshot remains unchanged

### Requirement: Management detail and history access
The local API SHALL document ingestion, current course detail, paginated snapshot history, and snapshot detail in Swagger. Reads SHALL use canonical encoded course IDs and expose thumbnail processing and presentation-readiness state. Invalid input, missing records, conflicts, and unavailable storage SHALL return safe documented errors.

#### Scenario: Inspect history through Swagger
- **WHEN** the developer ingests a course and requests current detail and its paginated history
- **THEN** the current facts and exact retained observations are separately inspectable, including incomplete thumbnail processing

### Requirement: Legacy compatibility and factual separation
Existing minimal registration, group eligibility, and membership endpoints SHALL retain their behavior. An explicit conversion utility SHALL map v2 exports to v3 submissions without modifying source exports or launching scraping. AI conclusions SHALL remain outside source facts; feedback and selected raw evidence SHALL preserve existing anonymization constraints.

#### Scenario: Existing minimal reference
- **WHEN** an editor registers or groups a minimal reference without an ingestion snapshot
- **THEN** existing endpoints behave as before and no complete course facts or thumbnail readiness are implied

#### Scenario: Convert sparse v2 export
- **WHEN** a v2 record has null offers or image and incomplete evidence
- **THEN** conversion retains its facts and warnings, records explicit unknown sections, and does not manufacture price, image, or completeness

### Requirement: Persistent additive initialization
Explicit migrations SHALL preserve existing courses and memberships and retain snapshots across normal service restarts and migration reruns. Initialization SHALL NOT scrape, generate AI facts, create memberships, or delete historical observations.

#### Scenario: Migrate and restart
- **WHEN** migrations are rerun and API/database are normally restarted
- **THEN** existing references, memberships, observation IDs, and their facts remain available
