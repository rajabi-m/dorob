# Spec Delta

## MODIFIED Requirements

### Requirement: Legacy export isolation
The existing Maktabkhooneh export-only command SHALL retain its v2 file format, selection options and valid checkpoint resume behavior without backend writes. Saved-v2 conversion SHALL remain explicit. TopLearn, Sabzlearn and Roocket SHALL expose v3 collection and ingestion only; their legacy export commands and the standalone dashboard/aggregation commands SHALL be retired. New worker checkpoints SHALL NOT accept or overwrite legacy exports during incompatible resume.

#### Scenario: Existing v2 workflow
- **WHEN** an operator exports or resumes Maktabkhooneh through its existing command
- **THEN** it produces the existing v2 file without contacting the ingestion API, with unchanged selection and resume behavior; the retired dashboard is not a supported consumer

#### Scenario: Other provider workflow
- **WHEN** an operator collects TopLearn, Sabzlearn or Roocket through a supported interface
- **THEN** it returns v3 observations or invokes explicit v3 ingestion; no v2 adapter or export command is available for that provider

#### Scenario: Retired dashboard and preserved local files
- **WHEN** the supported utility commands are inspected after migration
- **THEN** the dashboard and aggregation entry points are absent, their obsolete code/docs are removed except the owner-approved pure aggregation helper needed by the protected Maktabkhooneh test (its executable CLI is retired), and existing local exports, journals, database records and images have not been deleted

## ADDED Requirements

### Requirement: Three-provider native v3 observations
TopLearn, Sabzlearn and Roocket SHALL emit validated v3 observations with stable provider-course identity, canonical URL, successful observation time, fresh submission ID, extractor version, field evidence and section coverage. They SHALL preserve required pricing and thumbnail sections and SHALL NOT construct or consume a v2 course record during collection.

#### Scenario: Fresh observation of unchanged facts
- **WHEN** any migrated provider successfully collects the same course in two fresh runs
- **THEN** provider-course identity remains stable, each run has a fresh submission ID and observation time, and both payloads validate as v3

#### Scenario: Invalid core evidence
- **WHEN** required title, identity, provenance or required sections cannot satisfy v3 validation
- **THEN** collection fails without delivering a fabricated or invalid observation

### Requirement: Rich source-fact preservation
Each migrated provider SHALL collect publicly supported descriptions, outcomes, prerequisites, audience, technologies, practice/assessment/support, classification, durations, instructors, curriculum, offers, enrollment, provider state, features and feedback. Populated fields SHALL retain source evidence. Unavailable facts SHALL remain unknown; supported extra facts SHALL use sanitized namespaced provider data.

#### Scenario: Published rich course metadata
- **WHEN** a public course page, embedded data or permitted supplementary response exposes supported facts
- **THEN** those facts survive in the matching v3 sections, including all explicitly published instructor entries and original price/currency evidence

#### Scenario: Unpublished educational claims
- **WHEN** marketing prose mentions a topic without establishing outcomes, level, technology version or language
- **THEN** collection does not infer those facts from prose or generate AI-derived source facts

#### Scenario: Additional source fields
- **WHEN** useful published course facts have no matching v3 field
- **THEN** anonymous, bounded values and their evidence may be retained in the existing namespaced provider-data section without raw HTML or personal information

### Requirement: Distinct feedback and rating counts
Migrated providers SHALL retain anonymous comments/reviews with source type, text, evidence and available individual rating/date. Aggregate rating value, explicit scale and rating-vote count SHALL be independent of collected-item count and published feedback count. Ambiguous mixed comment/reply totals SHALL NOT become rating or review totals. Missing rating scales or counts SHALL NOT be guessed.

#### Scenario: Known aggregate and sampled feedback
- **WHEN** a course publishes an aggregate rating, its scale and vote count, plus a smaller feedback sample
- **THEN** aggregate rating/count and collected sample size remain distinct and the sample does not imply complete feedback coverage

#### Scenario: Sabzlearn unresolved rating metadata
- **WHEN** only a raw rating score and mixed comments count are evidenced
- **THEN** rating scale and vote count stay unknown, the raw score may remain sanitized provider evidence, and the audit records which public sources were inspected

#### Scenario: Public comments are not verified reviews
- **WHEN** a source exposes comments without review classification or enrollment evidence
- **THEN** collected items remain comments, verified enrollment stays unknown, and author identities/contact details are excluded or redacted

### Requirement: Bounded supplementary feedback collection
Migrated providers SHALL follow evidenced public feedback pagination within configured positive page/item limits. Defaults SHALL be ten feedback pages and 500 retained items per course. Requests SHALL follow the existing access policy on each configured origin. Collection SHALL record pages read, counts, selection, omissions, has-more and stop reason, without claiming completeness after a limit, failure or exclusion.

#### Scenario: Public next page
- **WHEN** a permitted response establishes further course-specific feedback pages and configured limits allow another request
- **THEN** collection follows that pagination, deduplicates safely and preserves anonymous source order and item locators

#### Scenario: Limit or failed later page
- **WHEN** a page/item limit is reached or a later feedback request fails ordinarily
- **THEN** earlier items, aggregate rating, counts and other valid facts survive with partial/unknown coverage and an explicit stop reason

#### Scenario: Access denial on supplementary origin
- **WHEN** a supplementary origin returns access denial or collection is canceled
- **THEN** collection stops under the existing access/cancellation rules rather than treating denial as ordinary missing feedback

#### Scenario: Confirmed empty source
- **WHEN** the source explicitly establishes an empty feedback list and no further pages
- **THEN** an evidenced empty list can be emitted; absence of a list alone remains unknown

### Requirement: Ordered curriculum and isolated optional failures
Migrated providers SHALL preserve published chapter/lesson identity, order, titles, descriptions, types, durations and counts. Curriculum coverage SHALL report missing pages or count mismatches; matching counts alone SHALL NOT prove completeness. An optional extraction failure SHALL preserve valid independent facts and record its scope and reason without invalidating a valid core observation.

#### Scenario: Partially loaded table of contents
- **WHEN** a public curriculum contains incomplete chapters, lessons or additional permitted pages
- **THEN** collection follows evidenced supplementary access within bounds and retains ordered available content with honest coverage

#### Scenario: Malformed optional chapter
- **WHEN** one optional curriculum response cannot be parsed while identity, pricing and other sections remain valid
- **THEN** the observation retains valid independent sections and marks the affected section failed or partial with evidence of the failure

#### Scenario: Roocket comments unavailable
- **WHEN** Roocket's public comments API fails ordinarily after its course page supplied an aggregate rating and instructors
- **THEN** rating, vote count, instructors and curriculum remain retained; feedback items/coverage reflect the failure without blanking independent facts

### Requirement: Provider identity and currency evidence
TopLearn SHALL preserve verified legacy-shortlink/canonical identity resolution. Sabzlearn SHALL preserve embedded course identity and published Jalali date text without guessed normalization. Roocket SHALL preserve course-scoped structured identity, additional-origin access and evidenced currency conversion. Every migrated provider SHALL distinguish explicit free access from missing, disabled or ambiguous zero prices.

#### Scenario: TopLearn canonical identity proof
- **WHEN** a selected TopLearn page requires a canonical-page request to establish stable identity
- **THEN** the controlled supplementary request verifies the same course before a v3 observation is emitted

#### Scenario: Roocket paid currency proof
- **WHEN** course-scoped price evidence confirms a rial/toman relationship
- **THEN** normalized price and original source currency survive; absent or contradictory proof leaves normalized amounts unknown

#### Scenario: Sabzlearn published update date
- **WHEN** a provider publishes a Jalali update date without enough information for a verified timestamp
- **THEN** its source text survives as sanitized evidence and normalized provider update time remains unknown

#### Scenario: Ambiguous zero purchase amount
- **WHEN** a purchase slot is unavailable, disabled or zero without explicit free-access evidence
- **THEN** it does not establish a free course or replace an enabled paid option
