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
