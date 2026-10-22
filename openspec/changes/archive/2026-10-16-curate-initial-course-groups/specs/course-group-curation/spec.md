# Spec Delta

## MODIFIED Requirements

### Requirement: Local editorial workflow
The management workflow SHALL remain local development only, without claiming authenticated administration or production readiness. Group definitions and assignments SHALL remain editor-controlled. An explicitly requested development-agent research pass SHALL support editorial curation through existing management operations; the backend SHALL NOT call AI or automatically create groups or place courses during curation.

#### Scenario: Follow the development workflow
- **WHEN** the owner follows the documented local workflow
- **THEN** they can curate a group through the loopback-bound service without an AI provider, ingestion worker, or admin frontend

#### Scenario: Agent assists explicit editorial work
- **WHEN** the owner requests a development agent to research existing courses and manually populate groups
- **THEN** the agent records its editorial reasoning and submits explicit group definitions and course assignments, without introducing runtime AI calls, automatic placement, or claims of quality ranking

## ADDED Requirements

### Requirement: Verified pre-work database backup
Before its first backend write, initial curation SHALL create a complete restorable backup of the target PostgreSQL database and verify restoration in an isolated database. The backup SHALL remain outside version control. The report SHALL record its location, timestamp, checksum, verification outcome, and recovery instructions. Backup or restore verification failure SHALL prevent curation writes. Restoring the working database SHALL require an explicit owner request.

#### Scenario: Preserve the pre-work state
- **WHEN** initial curation is about to modify the backend
- **THEN** a verified backup preserves the schema and existing database records from before those writes, and the report identifies the backup and how to restore it

#### Scenario: Backup cannot be verified
- **WHEN** backup creation fails or isolated restore verification cannot complete
- **THEN** the agent reports the blocker and performs no curation writes

#### Scenario: Recovery is requested
- **WHEN** the owner requests restoration of the pre-work database state
- **THEN** recovery uses the recorded verified backup with writers stopped and clearly identifies that restoring it also discards database changes made after that backup

### Requirement: Evidence-based initial group definitions
Initial curation SHALL define focused comparison groups using existing accepted course observations and identified public-source evidence. Each selected group SHALL have a Persian title, stable slug, supported category, scope description, target level or explicit unspecified level, and at least two evidenced existing course members. Editorial scope SHALL remain distinct from provider-stated level and identical-content claims.

#### Scenario: Select a supported comparison set
- **WHEN** at least two existing courses have evidence supporting a common learning topic and the proposed group scope
- **THEN** the report identifies their canonical course IDs, supporting snapshot IDs and collection dates, individual membership reasons, and differences relevant to scope

#### Scenario: Insufficient or conflicting evidence
- **WHEN** a title suggests beginner coverage but retained content does not establish fit or contradicts that scope
- **THEN** the agent consults identified public sources or marks the candidate unresolved, and does not assign it based on title alone

#### Scenario: Cross-provider coverage
- **WHEN** multiple providers have suitable stored courses for a group
- **THEN** curation considers those offerings together; a justified single-provider set remains permitted and its limitation is explicit

### Requirement: Complete category coverage reporting
The initial curation report SHALL cover all six fixed categories using a dated inventory of existing courses. It SHALL distinguish supported groups, unresolved candidates, and categories with insufficient evidence or courses. Inventory limitations and incomplete reads SHALL be explicit; fabricated courses, empty placeholder groups, and unsupported category assignments SHALL NOT substitute for coverage.

#### Scenario: Catalog spans several pages
- **WHEN** stored course references exceed one management response page
- **THEN** the inventory accounts for every page and each reference's available current observation, and records any incomplete reads or catalog changes affecting coverage

#### Scenario: A category lacks suitable courses
- **WHEN** no defensible two-course group can be formed for a fixed category
- **THEN** the report names the category, documents the gap, and creates no unsupported group or new provider course to meet a quota

### Requirement: Draft-only initial curation
Initial curated groups SHALL be persisted as drafts with explicit memberships through existing management operations. Initial curation SHALL NOT publish groups, alter provider observations, ingest new courses, or overwrite unrelated groups or memberships. Publication SHALL require separate owner review and instruction. Existing public visibility rules SHALL remain unchanged.

#### Scenario: Persist a researched group
- **WHEN** the agent applies a selected group and its explicit member list
- **THEN** the backend stores the group with `isPublished: false` and the selected existing course links, while source observations and unrelated catalog records remain intact

#### Scenario: Existing slug conflicts
- **WHEN** a selected slug already identifies an unrelated group or a group whose reuse has not been established
- **THEN** curation reports the conflict and resolves it without overwriting that group's fields or memberships

#### Scenario: Owner review is pending
- **WHEN** draft creation and membership verification are complete but publication has not been requested
- **THEN** the report identifies drafts as awaiting review and the groups remain absent from public group and category eligibility

### Requirement: Auditable persistence and continuation
The initial curation report SHALL record group definitions, inclusion/exclusion scope, evidence references, canonical member IDs, backend group IDs, and operation outcomes. Persisted fields and complete membership sets SHALL be read back and verified. A continuation SHALL reconcile recorded results before writes so uncertain creates and repeated assignments do not duplicate groups or modify unrelated records.

#### Scenario: Verify completed drafts
- **WHEN** creation and assignment operations succeed
- **THEN** management readback confirms the expected fields, draft flag, distinct member count, and complete member IDs, and the report distinguishes proposed from verified persisted groups

#### Scenario: Partial or uncertain write
- **WHEN** a backend failure interrupts curation or a creation response is lost
- **THEN** the report preserves known outcomes and pending work, and continuation checks existing groups and memberships before retrying operations

#### Scenario: Public source research adds context
- **WHEN** a public source page is used to clarify group fit beyond retained facts
- **THEN** the report identifies its URL, research date, and the supporting finding separately from the stored observation without rewriting that observation
