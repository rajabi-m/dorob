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
