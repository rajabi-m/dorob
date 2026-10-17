# Spec Delta

## ADDED Requirements

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
