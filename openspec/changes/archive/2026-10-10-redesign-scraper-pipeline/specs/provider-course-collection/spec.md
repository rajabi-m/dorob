# Spec Delta

## Purpose

Collect traceable provider course observations through reusable access policies, with Maktabkhooneh as the reference implementation for future provider adapters.

## ADDED Requirements

### Requirement: Provider access policy
Collection SHALL inspect robots rules before provider requests, honor applicable disallow rules and crawl delay, restrict requests and redirects to configured credential-free HTTPS origins, and identify its user agent. A missing robots resource with HTTP 404 SHALL permit collection; denied or unreachable robots SHALL prevent collection. HTTP 401 or 403 SHALL stop that origin's collection.

#### Scenario: Disallowed course
- **WHEN** robots rules disallow a selected course URL
- **THEN** no request is issued to that course and the run reports the access denial

#### Scenario: Missing or unavailable robots
- **WHEN** robots responds with 404
- **THEN** collection proceeds under the remaining access policies
- **WHEN** robots is unreachable after bounded retries or responds with 401 or 403
- **THEN** course collection does not proceed

#### Scenario: Redirect outside configured origin
- **WHEN** a course redirects to an origin not configured for its client
- **THEN** the redirect is rejected before requesting that destination

### Requirement: Bounded polite requests
Requests SHALL be serialized per origin and spaced by at least the configured minimum or applicable crawl delay, whichever is longer. Defaults SHALL provide 1500 ms spacing, a 30-second request timeout, a 20 MiB response limit, at most five redirects and at most three retries. Transient retries SHALL use increasing delays and honor Retry-After. Cancellation SHALL stop pending collection promptly.

#### Scenario: Rate-limited provider
- **WHEN** a provider responds with 429 and Retry-After
- **THEN** the next attempt respects that delay and retry exhaustion produces a reported failure

#### Scenario: Oversized response and cancellation
- **WHEN** a response exceeds the configured size limit or the run is canceled
- **THEN** the request is stopped and no successful observation is emitted for its incomplete response

### Requirement: Explicit bounded course selection
Collection SHALL accept explicit course URLs or discovered course URLs with a positive limit, defaulting to ten. Full discovered-catalog selection SHALL require an explicit option. Discovery SHALL canonicalize and deduplicate URLs, traverse only relevant sitemaps within a bound, and report incomplete traversal without claiming complete provider coverage.

#### Scenario: Bounded default run
- **WHEN** a run starts without explicit URLs or a full-catalog option
- **THEN** it selects at most ten discovered courses

#### Scenario: Sitemap traversal limit
- **WHEN** discovery reaches its traversal bound before completion
- **THEN** the run reports incomplete discovery and does not claim a full catalog

### Requirement: Maktabkhooneh v3 observations
Maktabkhooneh programmatic collection SHALL return validated v3 observations with stable provider-course identity, canonical source URL, successful observation time, extractor version, field evidence, required pricing and thumbnail sections, and explicit section coverage. Each fresh successful collection SHALL receive a new submission ID, including when its facts are unchanged.

#### Scenario: Recheck unchanged course
- **WHEN** a course is successfully collected in two fresh runs with identical facts
- **THEN** the observations retain the same provider-course identity and have distinct submission IDs and observation times

#### Scenario: Invalid required source data
- **WHEN** source identity, title, provenance, or required sections cannot satisfy v3 validation
- **THEN** collection reports a failure and emits no valid observation for delivery

### Requirement: Source evidence and honest coverage
Maktabkhooneh SHALL preserve supported descriptions, educational facts, offers, duration distinctions, instructors, classification, ordered syllabus, provider state, ratings, counts, anonymous feedback and selected raw evidence. Coverage SHALL distinguish uninspected, unknown, partial, failed and evidenced complete sections. Null SHALL remain unknown; empty lists SHALL require evidence. AI-derived content SHALL remain outside source facts.

#### Scenario: Partial syllabus and feedback
- **WHEN** the page exposes some syllabus or feedback but completeness is not established
- **THEN** available content, ordering, source locators and coverage reasons survive in v3 without a complete claim

#### Scenario: Optional extraction failure
- **WHEN** an optional section fails while the required core remains valid
- **THEN** the observation records that section's failure and reason without fabricating replacement content

### Requirement: Pricing and feedback preservation
Maktabkhooneh SHALL retain enabled purchase options and original price evidence, distinguish explicit free access from disabled or ambiguous zero amounts, and avoid normalized currency guesses when evidence is insufficient. Public feedback SHALL preserve its source type and sample limits while excluding known identities and detectable contact details.

#### Scenario: Disabled zero offer
- **WHEN** a disabled purchase slot contains zero
- **THEN** it does not establish a free course or replace an enabled paid offer

#### Scenario: Public review sample
- **WHEN** the source exposes a bounded review sample and a larger published total
- **THEN** the observation retains anonymous sample content and partial coverage without claiming all reviews were collected

### Requirement: Legacy export isolation
The existing Maktabkhooneh export-only command SHALL retain its v2 file format, selection options and valid checkpoint resume behavior without backend writes. Saved-v2 conversion SHALL remain explicit. TopLearn, Sabzlearn and Roocket interfaces, outputs and commands SHALL remain unchanged. New worker checkpoints SHALL NOT be accepted as legacy export checkpoints or overwrite them during incompatible resume.

#### Scenario: Existing v2 workflow
- **WHEN** an operator exports or resumes Maktabkhooneh through its existing command
- **THEN** it produces v2 data without contacting the ingestion API and remains usable by existing aggregation tools

#### Scenario: Other provider workflow
- **WHEN** an operator runs any of the other three provider commands
- **THEN** the existing v2 behavior remains available without adopting the new collection interface
