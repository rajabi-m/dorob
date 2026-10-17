# course-group-curation Specification

## Purpose

Let Dorob's owner define comparison groups and explicitly assign provider courses, preserving editorial control without automated group creation or placement.

## Requirements

### Requirement: Persistent editorial group definitions
The management API SHALL create, list, read, and edit groups with a stable ID, unique lowercase ASCII slug, nonblank Persian title and scope description, supported category ID, nullable target level, and publication flag defaulting to false. Editing SHALL preserve group identity and memberships. Membership SHALL NOT imply identical content, ranking, or provider-stated level.

#### Scenario: Create a draft
- **WHEN** an editor creates a valid group without a publication flag
- **THEN** HTTP 201 returns the stored group with a generated ID, `isPublished: false`, and zero members

#### Scenario: Edit scope without replacing identity
- **WHEN** an editor edits a group's description or target level
- **THEN** the existing group ID and member courses remain unchanged

#### Scenario: Conflicting slug
- **WHEN** an editor creates or edits a group using another group's slug
- **THEN** HTTP 409 reports a conflict and neither group changes

### Requirement: Minimal provider-course registration
The management API SHALL register and list course references with provider ID, provider-course ID, nonblank title, and HTTP(S) source URL. Identity SHALL be unique by provider ID and provider-course ID. Re-registering that identity SHALL update its title and URL without duplicating the course or resetting memberships. These references SHALL NOT be presented as complete or freshly ingested course facts.

#### Scenario: Register a course twice
- **WHEN** an editor registers the same provider/course identity again with an updated title
- **THEN** the original stable course ID and existing assignments are retained, and only one reference exists

#### Scenario: Register without assigning
- **WHEN** an editor registers a course without selecting a group
- **THEN** it remains available in management reads with no group assignments

### Requirement: Explicit course membership
The management API SHALL add and remove existing course/group links explicitly. One course SHALL support multiple groups. Repeated assignment or removal SHALL be idempotent. Missing course or group references SHALL return HTTP 404 without writes. Course counts SHALL reflect distinct stored links. Course-reference updates SHALL preserve memberships.

#### Scenario: Assign to two groups
- **WHEN** an editor assigns the same course to two existing groups
- **THEN** both groups contain that course once

#### Scenario: Repeat membership operations
- **WHEN** an editor adds a link twice or removes an already absent link between existing records
- **THEN** the operation succeeds without duplicate membership or an inflated count

#### Scenario: Unknown record
- **WHEN** an editor assigns a nonexistent course to an existing group
- **THEN** HTTP 404 is returned and no link is created

### Requirement: Public group eligibility
Public reads SHALL expose only groups whose publication flag is true and which have at least two distinct member courses. Management reads SHALL include drafts and smaller groups. Public group details SHALL include stored group fields, the calculated course count, and minimal member references. Visibility SHALL be computed from current membership without silently changing the publication flag.

#### Scenario: Published group with enough courses
- **WHEN** a published group has two members
- **THEN** it appears in the public list and its slug resolves to public details

#### Scenario: Draft or insufficient membership
- **WHEN** a group is a draft or has fewer than two members
- **THEN** it is absent from public lists and public detail returns HTTP 404, while management still exposes it

#### Scenario: Remove and restore a member
- **WHEN** removal reduces a published group's count from two to one and a second member is later added
- **THEN** it disappears and reappears in public reads while its publication flag remains true

### Requirement: Validated documented API behavior
All category, course-reference, group, and membership operations SHALL have documented request and response schemas in the existing local Swagger/OpenAPI service. Invalid input SHALL return HTTP 422, missing records HTTP 404, conflicts HTTP 409, and database unavailability HTTP 503. Errors SHALL exclude credentials, internal SQL, and raw database diagnostics.

#### Scenario: Invalid course source URL
- **WHEN** an editor registers a course with a non-HTTP(S) URL or a blank title
- **THEN** HTTP 422 is returned without storing the record

#### Scenario: Database outage
- **WHEN** a catalog operation requires a database that is unavailable
- **THEN** HTTP 503 returns a safe error while greeting, liveness, categories, and documentation remain available

#### Scenario: Exercise curation through Swagger
- **WHEN** a developer opens local Swagger
- **THEN** they can register courses, create/edit groups, assign/remove memberships, and inspect management and public reads

### Requirement: Repeatable schema initialization and persistence
The project SHALL provide an explicit migration command that applies catalog schema changes once, preserves existing records and assignments on rerun, and does not execute automatically during API startup. Groups, course references, and assignments SHALL persist across normal API and database restarts. Initialization SHALL NOT fabricate provider courses or automatic memberships.

#### Scenario: Rerun migrations
- **WHEN** migrations are run again after groups and assignments have been created
- **THEN** existing records and memberships remain intact without duplicate initialization

#### Scenario: Restart services
- **WHEN** the API and database are normally stopped and started
- **THEN** stored groups and assignments remain available with the same IDs

### Requirement: Local editorial workflow
The management workflow SHALL remain local development only, without claiming authenticated administration or production readiness. Group definitions and assignments SHALL remain editor-controlled through the existing frontend and management API. Explicit CLI local embedding operations and external suggestions SHALL support review. Draft creation from discovery SHALL require explicit editorial action; memberships and publication SHALL remain separate decisions.

#### Scenario: Follow the development workflow
- **WHEN** the owner follows the documented local workflow
- **THEN** they can curate a group through the loopback-bound admin frontend or management API without an AI provider or ingestion worker

#### Scenario: Agent assists explicit editorial work
- **WHEN** the owner requests a development agent to research existing courses and manually populate groups
- **THEN** the agent records its editorial reasoning and submits explicit group definitions and course assignments, without introducing runtime AI calls, automatic placement, or claims of quality ranking

#### Scenario: System suggests an assignment
- **WHEN** an external system submits a course-to-group suggestion
- **THEN** the local workflow retains the suggestion for human review without treating it as an approved membership
#### Scenario: Explicit CLI embedding work
- **WHEN** the owner explicitly runs generation, matching or discovery from CLI
- **THEN** the worker uses backend HTTP APIs and local inference without automatically assigning or publishing courses/groups

#### Scenario: Discovery promotion with suggestions
- **WHEN** the owner explicitly promotes an approved discovered set with valid group fields
- **THEN** an empty unpublished draft is created and every discovered member is submitted as a discovery-scored suggestion, leaving assignment/publication to separate actions

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

### Requirement: Searchable management catalog
Management group lists SHALL support normalized text search, category and publication filters; course-reference lists SHALL support normalized text search. Filtering SHALL precede pagination and totals. Search SHALL normalize equivalent Persian/Arabic letters and spacing without rewriting stored text. Existing unfiltered response shapes, pagination limits, and ordering SHALL remain compatible.

#### Scenario: Search all pages
- **WHEN** a matching course or group lies beyond the first unfiltered page
- **THEN** a filtered request includes it and reports the full matching total

#### Scenario: Combine group filters
- **WHEN** an admin selects category, publication status, and search text together
- **THEN** only groups satisfying every supplied filter are returned, including drafts when selected

#### Scenario: Existing client omits new filters
- **WHEN** an existing management client requests lists without filters
- **THEN** it receives the established paginated shape and deterministic ordering
