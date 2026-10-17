# course-group-discovery Specification

## Purpose

Persist overlapping course-set discoveries for backend inspection and editorial review, then explicitly create drafts with reviewable member suggestions.

## Requirements

### Requirement: Preferred coherent overlapping baseline
Initial exact discovery SHALL use neighbor cosine >=0.60, k=12, every-member coherence >=0.70 and minimum size two. Canonical ordering SHALL make results deterministic; a course SHALL remain eligible for multiple sets regardless of existing memberships.

#### Scenario: Bridge course
- **WHEN** a course is close to two courses that fail mutual coherence
- **THEN** reachability alone does not combine all three

#### Scenario: Overlapping topics
- **WHEN** two coherent sets share a member but differ in other courses
- **THEN** both remain inspectable with shared-member links

### Requirement: Deduplication and suppression evidence
Discovery SHALL collapse identical canonical sets and suppress a later set only at Jaccard overlap >0.80 with an earlier retained set, ordered by size, mean pairwise similarity and canonical ties. Suppressed evidence SHALL remain inspectable.

#### Scenario: Exact boundary
- **WHEN** two nonidentical sets overlap at Jaccard .80
- **THEN** neither is suppressed solely for that boundary

#### Scenario: Suppressed set
- **WHEN** a set exceeds the suppression cutoff
- **THEN** its original members and the retained-set reference remain readable

### Requirement: Persistent paginated candidate evidence
Backend APIs SHALL expose saved runs, retained/suppressed candidate sets, representatives, exact members/vector/input references, coherence, overlap and coverage with bounded pagination. Candidate identity SHALL include run and exact member set; changed candidates SHALL NOT inherit review or promotion.

#### Scenario: Browse saved evidence
- **WHEN** a client requests a candidate after restart
- **THEN** its frozen provenance and paginated members are available without inference

#### Scenario: Changed set
- **WHEN** refresh produces a different member set
- **THEN** earlier review is related context rather than an applied decision

### Requirement: Member-supported reconciliation
Initial reconciliation SHALL retrieve at most five nearby existing group definitions by centroid, retain direct member/group scores and disclose coverage at >=.60. Covered, partial, ambiguous and potentially novel labels SHALL remain provisional and SHALL NOT assign memberships.

#### Scenario: Centroid mismatch
- **WHEN** only some members qualify for a centroid-near group
- **THEN** the response shows direct passing/failing evidence and partial coverage

#### Scenario: No qualifying group
- **WHEN** no retrieved group covers a set
- **THEN** the set stays available without an invented title or exhaustive novelty claim

### Requirement: Backend candidate approval and dismissal
Backend review SHALL support pending, approved and dismissed states with expected versions, optional manual title/note and immutable history. Candidate approval SHALL authorize eligibility for explicit promotion, not create a draft or course membership.

#### Scenario: Approve candidate
- **WHEN** an editor approves using the current version
- **THEN** review is saved without creating a group or memberships

#### Scenario: Concurrent review
- **WHEN** a dismissal arrives with a stale version
- **THEN** 409 preserves the newer review

### Requirement: Explicit idempotent draft promotion
An explicit promotion SHALL require an approved retained current candidate and owner-provided title, slug, scope, category and nullable level. It SHALL atomically create one empty unpublished draft with provenance and planned suggestions, rejecting stale/suppressed or unaccepted partial evidence.

#### Scenario: Create draft
- **WHEN** the editor explicitly promotes an eligible set
- **THEN** one empty unpublished draft and a durable all-member suggestion plan are created

#### Scenario: Conflicting or lost response
- **WHEN** promotion is retried after uncertain success
- **THEN** identical input returns the original draft; conflicting fields/version or unrelated slug returns 409

#### Scenario: Source becomes stale
- **WHEN** educational facts change before promotion
- **THEN** promotion conflicts without changing catalog groups

### Requirement: Discovery-derived suggestions for every member
Promotion SHALL submit every candidate course to the new draft through the existing suggestion ledger. Its percentage SHALL be 100 times the mean exact cosine to the other set members, with formula version and frozen evidence retained. It SHALL NOT filter or score against the draft definition, create memberships or imply calibrated suitability.

#### Scenario: Three-member promotion
- **WHEN** a reviewed three-course set is promoted
- **THEN** all three become suggestions using their individual within-set mean scores, without embedding the new definition or assigning membership

#### Scenario: Different group wording
- **WHEN** the editor supplies a scope different from the discovered topic
- **THEN** the suggestions explicitly retain discovery-based provenance and are not represented as group-definition scores

### Requirement: Recoverable promotion delivery
Draft creation and its delivery plan SHALL commit atomically. Bounded retry-safe suggestion batches SHALL disclose pending/complete delivery independently of draft creation. Explicit retry SHALL resume remaining submissions without duplicate drafts, suggestions or reopened decisions.

#### Scenario: Delivery interrupted
- **WHEN** only some planned suggestions commit
- **THEN** the draft remains empty, status exposes remaining deliveries and retry submits only missing ones

#### Scenario: New matching requested
- **WHEN** the owner later explicitly matches against the created draft
- **THEN** a separate course-to-group run evaluates the definition without rewriting discovery evidence
