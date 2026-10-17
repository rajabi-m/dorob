# course-group-suggestions Specification

## Purpose

Let external systems propose course-to-group assignments with accountable confidence and provenance while administrators retain control of actual memberships.

## Requirements

### Requirement: Submit attributed course-to-group suggestions
The local management API SHALL accept suggestions for existing course and group IDs with a stable system ID, nonblank system display name, finite confidence percentage from 0 through 100, and system-scoped submission ID. It SHALL return stored identity, server receipt time, and review state. Submission SHALL NOT add a membership, publish a group, or invoke AI.

#### Scenario: Submit an assignment candidate
- **WHEN** a system submits an existing course for an existing group with confidence 87.5 and its identity
- **THEN** the stored suggestion includes that confidence and system name while group membership and publication remain unchanged

#### Scenario: Validate a submission
- **WHEN** confidence is outside the permitted range or required identity/name is blank
- **THEN** HTTP 422 is returned without storing a suggestion

#### Scenario: Missing target
- **WHEN** the course or group does not exist
- **THEN** HTTP 404 is returned without a suggestion or membership write

### Requirement: Retry-safe immutable submissions
Submission identity SHALL be unique per submitting system. An exact replay SHALL return the original suggestion without duplication. Reusing an identity with different normalized content SHALL return HTTP 409. Fresh submissions SHALL retain previous submissions and any existing human decision for the same course/group pair.

#### Scenario: Response is lost
- **WHEN** a caller retries the same submission after an uncertain response
- **THEN** it receives the original stored identity without an additional suggestion

#### Scenario: Resubmit after rejection
- **WHEN** a system submits a new higher-confidence suggestion for a rejected pair
- **THEN** both submissions remain inspectable, the pair remains rejected, and it does not return to the pending inbox until explicitly reopened

### Requirement: Confidence-ordered paginated review reads
Group suggestion reads SHALL filter by pending, approved, or rejected pair state and return items, matching total, limit, and offset. Items SHALL include suggestion identity, course reference, system ID/name, confidence, receipt time, review version, and decision provenance. Order SHALL be confidence descending, then receipt time descending, then stable suggestion ID. Scores SHALL NOT be combined across systems.

#### Scenario: Stable equal-confidence pages
- **WHEN** unchanged suggestions with tied confidence values span multiple pages
- **THEN** the documented tie-breakers prevent duplicate or skipped items

#### Scenario: Several systems suggest the same course
- **WHEN** two systems submit suggestions for one course/group pair
- **THEN** each suggestion retains its own confidence and system identity while sharing the pair's human review state

### Requirement: Atomic explicit approval
Approval SHALL atomically record the selected suggestion as decision provenance and create one course/group membership. Pair-level decisions SHALL cover all suggestions for that pair. Approval SHALL NOT publish the group or change course observations. Repeating a completed identical approval SHALL return its recorded outcome without duplicate membership.

#### Scenario: Approve one of several suggestions
- **WHEN** an admin approves a pending suggestion for a pair
- **THEN** one membership is created, all of that pair's suggestions read as approved, and the chosen suggestion's system/confidence remains available as approval provenance

#### Scenario: Transaction failure
- **WHEN** approval fails before commit
- **THEN** neither an approved decision nor a new membership persists

### Requirement: Durable rejection and explicit reopening
Rejection SHALL record a pair-level rejected decision without creating a membership. An explicit admin reopen action SHALL return a rejected pair to pending while retaining earlier decisions and submissions. A rejected pair SHALL NOT be approved without reopening. Approved membership removal SHALL move the pair to rejected so later submissions cannot silently restore it.

#### Scenario: Reopen a rejected assignment
- **WHEN** an admin explicitly reopens a rejected pair
- **THEN** its suggestions become pending and earlier rejection history remains inspectable

#### Scenario: Reject an approved member
- **WHEN** a rejection is attempted while the pair is an approved member
- **THEN** HTTP 409 is returned and explicit membership removal is required

### Requirement: Concurrent reviews preserve decisions
Review mutations SHALL require the observed pair review version and reject conflicting stale actions with HTTP 409. Successful transitions SHALL increment that version. A retry of the same completed transition at the same input version SHALL return its recorded result; a retry after an intervening transition SHALL conflict.

#### Scenario: Two tabs disagree
- **WHEN** one tab rejects a pending pair and another approves using its earlier version
- **THEN** the second action receives HTTP 409 and does not overwrite the rejection or create membership

### Requirement: Manual membership compatibility
Existing membership operations SHALL remain idempotent and synchronize pair review state. Creating or restoring a membership manually SHALL approve the pair with manual provenance; removal SHALL reject it. Repeating an existing assignment SHALL preserve its provenance. Previously stored memberships SHALL remain approved editorial assignments without fabricated suggestions or confidence. Review history SHALL survive removal and re-addition.

#### Scenario: Manually add a rejected course
- **WHEN** an admin explicitly adds an existing course through the manual membership operation
- **THEN** one membership exists and the pair is approved with manual provenance, retaining earlier system submissions

#### Scenario: Upgrade existing catalog
- **WHEN** the suggestion schema is initialized over previously curated groups
- **THEN** existing memberships and publication flags remain unchanged and appear approved with manual provenance

### Requirement: Documented persistent local suggestion API
Submission, listing, review, reopening, and history reads SHALL have validated Swagger contracts and safe errors. Invalid input SHALL return 422, missing records 404, conflicts 409, and database unavailability 503. Stored submissions and decisions SHALL survive normal restarts and migration reruns. System attribution SHALL be described as caller-supplied until authentication exists.

#### Scenario: Database unavailable
- **WHEN** a suggestion operation cannot access PostgreSQL
- **THEN** HTTP 503 returns without exposing SQL, credentials, or raw diagnostics

#### Scenario: Restart and replay
- **WHEN** services restart and a caller repeats an accepted submission
- **THEN** the stored decision, provenance, and replay identity are preserved

### Requirement: Compatible worker percentage submissions
Worker matching and discovery SHALL use the existing percentage suggestion/response contract and shared pair ledger. Matching percentage SHALL be raw cosine times 100; promotion percentage SHALL be member mean within-set cosine times 100. System attribution SHALL distinguish these score meanings without claiming calibrated confidence.

#### Scenario: Matching threshold
- **WHEN** a matching candidate has raw cosine .60
- **THEN** the inbox receives confidencePercent 60 with matching system attribution and no membership

#### Scenario: Discovery submission
- **WHEN** promotion submits a member with within-set mean .75
- **THEN** the inbox receives confidencePercent 75 with discovery attribution, not a new-group fit claim

### Requirement: Separate immutable embedding suggestion evidence
Backend evidence reads SHALL retain score kind, exact raw value, percentage mapping version, model/digest/input/vector/run references, coverage and currentness dependencies separately from strict legacy payloads. Only the controlled worker delivery path SHALL attach application-owned evidence.

#### Scenario: Inspect exact basis
- **WHEN** a client requests evidence for a worker suggestion
- **THEN** it receives matching or discovery-member-mean provenance without fabricated calibration

#### Scenario: Legacy client
- **WHEN** an existing frontend requests suggestions or member reviews
- **THEN** the established payload shape and percentage fields remain valid

#### Scenario: Forged evidence
- **WHEN** an external submission supplies worker-owned provenance
- **THEN** validation rejects it without storing forged evidence

### Requirement: Retry-safe worker delivery preserves decisions
Worker submissions SHALL use stable run/pair or promotion/member identities and the existing immutable ledger. Replay SHALL not duplicate rows; new evidence SHALL not reopen rejection, replace chosen approval provenance or remove memberships.

#### Scenario: Rejected pair resubmitted
- **WHEN** a newer run submits a higher score for a rejected pair
- **THEN** it remains rejected until explicit reopening

#### Scenario: Lost delivery response
- **WHEN** a batch is replayed after uncertainty
- **THEN** existing submissions/evidence are returned exactly once

### Requirement: Currentness checks for embedding-origin approval
New approval of a worker-linked suggestion SHALL atomically verify educational currentness and explicit partial acceptance where required, while retaining existing review versions and idempotency. Stale evidence SHALL conflict without membership writes. Legacy unlinked submissions SHALL retain their existing semantics.

#### Scenario: Stale course or group
- **WHEN** a linked suggestion references changed educational inputs or its promoted draft scope changed
- **THEN** approval returns 409 without changing review state or membership

#### Scenario: Commercial-only change
- **WHEN** only price/image/time changes
- **THEN** that change alone does not prevent approval

#### Scenario: Repeat completed approval
- **WHEN** an identical successful approval is retried at its original version
- **THEN** the recorded outcome is returned without duplicate membership
