# Spec Delta

## ADDED Requirements

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
