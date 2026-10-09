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
The initial management workflow SHALL be documented as local development only, without claiming authenticated administration or a production-ready public deployment. Group definitions and assignments SHALL be editor-controlled; no AI call or automated grouping SHALL occur during curation.

#### Scenario: Follow the development workflow
- **WHEN** the owner follows the documented local workflow
- **THEN** they can curate a group through the loopback-bound service without an AI provider, ingestion worker, or admin frontend
