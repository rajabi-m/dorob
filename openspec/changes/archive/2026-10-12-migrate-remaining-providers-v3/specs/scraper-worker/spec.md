# Spec Delta

## ADDED Requirements

### Requirement: Three-provider explicit ingestion commands
`ingest:toplearn`, `ingest:sabzlearn` and `ingest:roocket` SHALL use the existing v3 ingestion and thumbnail lifecycle. Each SHALL support explicit URLs, bounded discovery, explicit full discovery, private checkpoints, resume, backend selection, human progress and machine JSON reports. Course selection SHALL default to ten. They SHALL NOT write directly to the database or start automatically.

#### Scenario: Provider command invocation
- **WHEN** an operator explicitly invokes one migrated provider command with selected URLs and a new checkpoint
- **THEN** that provider collects v3 observations, durably saves them, submits them through the API and separately reports thumbnail outcomes

#### Scenario: Default bounded selection and machine output
- **WHEN** a migrated provider command runs without URL/full-discovery flags and with `--json`
- **THEN** it selects at most ten discovered courses and stdout contains one machine report, with progress and diagnostics on stderr

### Requirement: Collection configuration on resume
For the three migrated providers, checkpoints SHALL persist effective feedback page/item limits and other observation-affecting collection settings. Resume SHALL restore saved settings when omitted and reject incompatible settings before provider/backend network activity or checkpoint mutation. Saved observations SHALL retain their exact payload and submission ID on retries.

#### Scenario: Resume without repeated limits
- **WHEN** a provider run resumes with its checkpoint but without feedback limit flags
- **THEN** it uses the saved limits and does not recollect completed observations or generate replacement IDs

#### Scenario: Changed limits or legacy export
- **WHEN** resume receives conflicting collection limits, a different provider/destination or a v2 export
- **THEN** it fails before network activity or mutation and gives safe corrective guidance without converting or overwriting the file

### Requirement: Provider-correct recovery guidance
Human summaries and fatal diagnostics for migrated provider commands SHALL identify the selected provider and emit a shell-safe recovery command using that provider's ingestion entry point, checkpoint, matching backend and required saved configuration. Recovery SHALL distinguish retryable collection/delivery/image work from terminal rejection.

#### Scenario: Roocket pending delivery
- **WHEN** Roocket ingestion exhausts delivery retries after saving an observation
- **THEN** its summary identifies pending delivery and unattempted selections and provides `ingest:roocket` recovery guidance rather than a Maktabkhooneh command

#### Scenario: Image-only recovery
- **WHEN** an accepted observation has an ordinary thumbnail failure
- **THEN** resume retries thumbnail processing for the same accepted observation without recollection or additional snapshot history

### Requirement: Existing Maktabkhooneh behavior preservation
Shared foundation changes SHALL preserve Maktabkhooneh's existing native collection, ingestion command, reports, checkpoint compatibility, legacy export and explicit conversion behavior. This migration SHALL NOT change Maktabkhooneh source or entry points, remove shared code it uses, or require operators to replace valid existing checkpoints.

#### Scenario: Existing Maktabkhooneh checkpoint
- **WHEN** an existing valid Maktabkhooneh journal is resumed after shared changes
- **THEN** its previous selection, configuration, submission identities and delivery/image resume behavior remain supported

#### Scenario: Additive provider settings
- **WHEN** a new provider uses feedback settings and provider-correct reporting
- **THEN** shared defaults remain compatible with existing Maktabkhooneh callers that do not supply those new settings

### Requirement: End-to-end course-section acceptance
Each migrated provider SHALL be validated with real bounded collection, retained v3 ingestion, hosted-image readiness, public list/detail reads and browser rendering in the existing homepage courses section. Acceptance SHALL require representative paid/free courses where publicly available. Fixture tests alone SHALL NOT establish live frontend success; blocked checks SHALL remain explicitly unverified.

#### Scenario: Ready course reaches homepage
- **WHEN** a representative provider course is collected, accepted and has a ready hosted thumbnail
- **THEN** its stable course/snapshot identity resolves through the public API and it renders in the actual homepage courses section with source title, Persian provider name, available instructors, accountable price and usable details

#### Scenario: Ungrouped or paginated course
- **WHEN** an accepted ready course has no editorial category membership or lies outside the first catalog page
- **THEN** verification clears category/free filters and uses existing search/pagination to locate it without adding fixture data or assigning an editorial group

#### Scenario: Feedback not exposed by current website
- **WHEN** comments, ratings or other rich fields are retained but absent from the current public presentation contract
- **THEN** acceptance checks them in the retained observation, while browser verification covers the existing course card/detail fields without expanding the website contract

#### Scenario: Live acceptance blocked
- **WHEN** provider access, network, Docker/database, image processing or browser availability prevents an acceptance step
- **THEN** the report identifies the specific blocked step and does not mark live course-section acceptance complete based on mocks or API-only checks

### Requirement: Restricted frontend modification
This migration SHALL preserve the existing frontend layout, components, filters, routes, fixtures and presentation contract. Permitted frontend edits SHALL be authentic missing provider logo assets/existing mappings and owner-requested nearest-whole-minute course-duration presentation in existing cards/details. Source duration precision SHALL remain unchanged. Logos SHALL not be required for a course to render. Responsive Persian RTL and keyboard behavior SHALL remain intact.

#### Scenario: Missing Sabzlearn or Roocket logo
- **WHEN** a migrated provider lacks a logo asset or card mapping
- **THEN** only its authentic asset and mapping may be added; card layout, data fetching and course detail behavior remain unchanged

#### Scenario: Visibility defect
- **WHEN** an ingested course does not appear in the homepage courses section
- **THEN** agents inspect retained identity, readiness, public responses, filters and pagination first; any required frontend change beyond a logo is reported as outside scope

#### Scenario: Fractional course duration presentation
- **WHEN** a retained course duration contains fractional minutes
- **THEN** existing cards and details display the nearest whole minute with Persian digits while stored source values remain precise
