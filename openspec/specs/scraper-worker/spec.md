# scraper-worker Specification

## Purpose

Deliver explicitly collected provider observations to Dorob's existing backend with durable local progress, retry-safe identity and separate thumbnail outcomes.

## Requirements

### Requirement: Explicit collection and delivery
The worker SHALL accept a configured provider collector and backend destination and run only on explicit invocation. It SHALL support bounded discovery or explicit URLs and an explicit full-discovered-catalog option. It SHALL submit observations through the existing ingestion API without direct database writes, frontend fixture edits, editorial assignments, deletion or AI generation.

#### Scenario: Selected course run
- **WHEN** the operator invokes the worker with selected Maktabkhooneh URLs
- **THEN** it collects and submits those selections and reports backend course and snapshot identities without publishing groups or editing the frontend

#### Scenario: Normal service startup
- **WHEN** the API, database migrations or whole-app launcher starts normally
- **THEN** no worker collection or delivery run is started implicitly

### Requirement: Durable observation checkpoint
The worker SHALL persist each validated observation and its submission ID before attempting delivery. Versioned checkpoints SHALL retain run identity, provider/extractor configuration, backend destination, selections, observation payloads, delivery receipts, thumbnail state and failures. Writes SHALL be atomic and private; one process SHALL own a checkpoint at a time. Failed persistence SHALL prevent delivery of the unsaved observation.

#### Scenario: Crash before submission
- **WHEN** collection is checkpointed and the process exits before its ingestion request
- **THEN** resume submits that saved observation without recollecting it or changing its identity

#### Scenario: Checkpoint unavailable
- **WHEN** an observation cannot be safely saved
- **THEN** the worker stops without submitting that unsaved observation

### Requirement: Resume validation and retry identity
Resume SHALL validate the complete checkpoint and its provider, selection and backend configuration before network activity or mutation. Delivery retries SHALL reuse the exact saved payload and submission ID. Completed selections SHALL not be recollected on resume; a new refresh SHALL use a new checkpoint and fresh observation IDs. Legacy exports SHALL not be silently treated as worker checkpoints.

#### Scenario: Lost acceptance response
- **WHEN** the backend accepts an observation but the response is lost
- **THEN** retry resubmits the saved observation and receives the original snapshot without duplicate history

#### Scenario: Incompatible resume
- **WHEN** the checkpoint is invalid, legacy-formatted or names a different provider, selection or backend
- **THEN** resume fails before fetching, submitting or overwriting the checkpoint

### Requirement: Bounded backend delivery
Backend requests SHALL have finite timeouts and bounded transient retries. HTTP 200 replay and HTTP 201 acceptance SHALL record the returned snapshot receipt. Validation failures and submission conflicts SHALL be reported without changing the saved payload or generating a replacement ID. Exhausted transient failures SHALL preserve pending delivery for explicit resume and stop further provider collection in that run.

#### Scenario: Backend unavailable
- **WHEN** delivery exhausts retries during a backend outage
- **THEN** the saved observation remains pending and further provider collection stops until a later explicit resume

#### Scenario: Rejected observation
- **WHEN** the backend returns 422 or a conflicting submission returns 409
- **THEN** the worker records a terminal delivery error for that selection without silently repairing or resubmitting altered content

### Requirement: Thumbnail coordination
After acceptance, the worker SHALL request existing backend thumbnail processing for that exact course and snapshot when it has URL input and is not ready. Missing input SHALL be reported without a processing request. Image failures SHALL retain accepted facts and be tracked separately for explicit resume. Ready snapshots SHALL not be processed again; busy responses SHALL use bounded retries or remain pending.

#### Scenario: Image download failure
- **WHEN** a valid observation is accepted but its thumbnail processing fails
- **THEN** the receipt remains accepted, the image outcome is failed, and resume retries image processing without recollection or a new observation

#### Scenario: Ready or missing image
- **WHEN** the accepted snapshot has a ready thumbnail or explicitly unavailable input
- **THEN** the worker records that state without another processing request

### Requirement: Partial runs and cancellation
Individual course collection or terminal delivery failures SHALL be reported without losing other selections. Access denial SHALL stop collection; cancellation SHALL stop new requests and retain durable pending work. The worker SHALL report an interrupted run rather than claiming completion when it is canceled or fatally stopped.

#### Scenario: One malformed course
- **WHEN** one selected course fails extraction and another succeeds
- **THEN** the successful observation can be delivered and the failed selection remains visible for retry

#### Scenario: Cancellation after acceptance
- **WHEN** the operator interrupts a run after ingestion but before thumbnail processing
- **THEN** resume recovers or replays the acceptance receipt and completes only remaining work

### Requirement: Observable run results
The worker SHALL report selected, collected, accepted-new, replayed, collection-failed, delivery-pending/failed and thumbnail outcomes separately. Reports SHALL retain source observation dates and distinguish accepted facts from presentation readiness. Failed, pending or interrupted runs SHALL exit nonzero; intentional unavailable thumbnails alone SHALL not fail an otherwise completed run. Logs SHALL omit credentials and raw source content.

#### Scenario: Accepted facts with failed image
- **WHEN** all facts are accepted but one image fails
- **THEN** the report distinguishes ingestion success from image failure and exits nonzero without claiming all cards are ready

#### Scenario: Successful resume
- **WHEN** resume completes all remaining work
- **THEN** the final checkpoint and report show no unresolved failures or pending operations and the command exits zero

### Requirement: Live ingestion CLI progress
The ingestion CLI SHALL announce startup and discovery or resume, then show selected count, current course position and identity, stage and elapsed time. It SHALL report retry reason, attempt and wait when retrying. During unfinished work it SHALL provide a liveness update at least every ten seconds. Normal progress SHALL be bounded without printing a success record for every selection in redirected output.

#### Scenario: Discovery and slow request
- **WHEN** discovery or a course request remains unfinished for more than ten seconds
- **THEN** the CLI indicates the active stage and elapsed time without claiming additional completed work

#### Scenario: Retrying delivery
- **WHEN** a backend request is retried
- **THEN** progress identifies delivery, its safe failure reason, attempt and retry wait

#### Scenario: Redirected progress
- **WHEN** normal output is redirected during a large run
- **THEN** progress uses readable throttled lines without cursor controls or one success line per selected course

### Requirement: Actionable safe ingestion diagnostics
The CLI SHALL immediately report failed operations with stage, course identity when available, safe reason and whether work continues or stops. Fatal option, checkpoint and discovery errors SHALL identify their specific safe cause. Diagnostics SHALL use allowlisted codes and safe context, omit credentials, raw source content, response bodies and arbitrary exception text, and distinguish unknown transport failure from a verified connection cause.

#### Scenario: Backend transport exhaustion
- **WHEN** backend delivery exhausts retries with a transport failure
- **THEN** the CLI identifies the backend destination, delivery failure and stop, explains that saved delivery remains pending, and suggests checking backend availability without asserting an unverified outage cause

#### Scenario: Course and thumbnail failure
- **WHEN** extraction or thumbnail processing fails for a course
- **THEN** the CLI names the relevant stage and safe reason, distinguishes accepted facts from image failure and states whether collection continues

#### Scenario: Invalid invocation or checkpoint
- **WHEN** invocation fails because of incompatible options, checkpoint configuration or lock ownership
- **THEN** the CLI reports that category and corrective guidance without suggesting automatic deletion of a lock or overwriting saved work

#### Scenario: Unsafe exception content
- **WHEN** an error contains credentials, source HTML, response content or terminal control sequences
- **THEN** output uses safe diagnostic context without exposing that content or executing terminal controls

### Requirement: Compact ingestion completion and recovery
The default CLI SHALL finish with a bounded summary of run status, collection, acceptance, delivery and image outcomes, and unattempted selections. It SHALL identify saved checkpoint state and give a shell-safe resume command with the matching backend when retryable work remains. Terminal failures SHALL receive review guidance rather than a promise that resume fixes them. It SHALL preserve existing stop, resume and exit-code behavior.

#### Scenario: First delivery fails in a thousand selections
- **WHEN** 1,000 selections yield one collected observation, no acceptance and exhausted delivery retries
- **THEN** the summary shows one pending delivery and 999 unattempted selections, the stop reason, saved checkpoint path and resume command without listing all selected URLs

#### Scenario: Cancellation or successful resume
- **WHEN** a run is canceled after saving work or a resume completes remaining work
- **THEN** output accurately describes saved progress and unresolved outcomes, exits nonzero on cancellation and zero on completion, and does not claim accepted courses all have ready images

#### Scenario: Failure before checkpoint creation
- **WHEN** discovery or checkpoint initialization fails before a checkpoint is saved
- **THEN** output identifies the failure without claiming that progress was saved or providing a resume command for a nonexistent checkpoint

### Requirement: Explicit machine report mode
The ingestion CLI SHALL accept `--json`. In this mode stdout SHALL contain exactly one JSON document: the existing full run report when a report is available, or a structured safe fatal error when no report exists. Human progress and diagnostics SHALL go to stderr. Default mode SHALL not serialize the full per-selection report. Existing report fields and exit-code semantics SHALL remain compatible.

#### Scenario: Machine-readable partial run
- **WHEN** a partial run is invoked with `--json`
- **THEN** stdout parses as the full run report with existing fields and no interleaved progress, stderr explains the failure, and the process exits nonzero

#### Scenario: Machine-readable startup failure
- **WHEN** `--json` is requested and startup fails before a run report exists
- **THEN** stdout contains one error document with a safe code and message, and the process exits nonzero

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
