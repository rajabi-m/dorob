# course-group-administration Specification

## Purpose

Provide a local Persian administration interface for managing course groups and reviewing system-suggested memberships against retained course information.

## Requirements

### Requirement: Reuse and showcase the shared design system
Admin pages SHALL reuse Dorob's existing design-system components, tokens, typography, and interaction patterns. Any new reusable component or variant SHALL be shared with the `/design-system` showcase using the same implementation. Showcase examples SHALL use labelled sample data and SHALL NOT mutate catalog records or invoke AI.

#### Scenario: Extend a reusable component
- **WHEN** the admin workflow needs a new reusable component or variant
- **THEN** it is implemented within the shared design system and showcased at `/design-system` with representative relevant states

#### Scenario: Existing component fits
- **WHEN** a design-system component already supports the admin interaction
- **THEN** the admin page reuses it instead of introducing a duplicate component or separate visual language

### Requirement: Browse and manage all groups
The admin interface SHALL list drafts and published groups with title, category, member count, publication flag, and public eligibility. It SHALL support server-backed search, category/publication filters, pagination, and opening group details.

#### Scenario: Find a draft beyond the first page
- **WHEN** an admin searches or filters for a stored draft outside the initial page
- **THEN** the matching result and filtered total include it and its details can be opened

### Requirement: Manual group creation and editing
Admins SHALL create drafts and edit title, unique slug, scope description, fixed category, and nullable target level. Validation errors SHALL preserve entered values. Successful edits SHALL preserve identity and existing memberships.

#### Scenario: Create an empty draft
- **WHEN** an admin submits valid group fields
- **THEN** a persisted draft is opened with zero members and an option to select existing courses

#### Scenario: Slug conflict
- **WHEN** a submitted slug belongs to another group
- **THEN** the interface shows a Persian conflict message, retains the entered fields, and does not overwrite either group

### Requirement: Explicit publication controls
Admins SHALL publish and unpublish groups with persisted success/error feedback. The UI SHALL distinguish the publication flag from public eligibility under the existing two-member rule, and SHALL NOT imply that public fixture group pages have been integrated.

#### Scenario: Publish with insufficient members
- **WHEN** an admin publishes a one-member group
- **THEN** the saved flag is shown as published alongside an explanation that fewer than two members prevents public eligibility

#### Scenario: Unpublish an eligible group
- **WHEN** an admin unpublishes a group with at least two members
- **THEN** the UI reflects the stored flag and subsequent public reads exclude it

### Requirement: Review candidates by confidence
Group details SHALL expose a pending suggestion inbox ordered by confidence descending, with paginated results. Each item SHALL show course identity/title, provider, submitting system name, submitted confidence percentage, and approve/reject actions. Approved and rejected decisions SHALL remain inspectable; rejected pairs SHALL support explicit reopening.

#### Scenario: Inspect candidate provenance
- **WHEN** systems submit suggestions with confidence 72 and 94 for a group
- **THEN** 94 appears before 72 and each item shows its own system name and system-reported confidence

#### Scenario: Review a candidate
- **WHEN** an admin approves or rejects an actionable candidate
- **THEN** pending controls are disabled during the request and successful readback updates the inbox, reviewed state, and approved members as appropriate

### Requirement: Inspect and manually curate members
Group details SHALL list approved members and allow searching existing catalog courses for manual addition or removal. Course inspection SHALL show available retained facts and source links, including management-only courses, with explicit missing-data states. Approval provenance SHALL remain inspectable; assignments without suggestion provenance SHALL display as manual without fabricated confidence.

#### Scenario: Existing membership has no AI result
- **WHEN** an admin opens one of the previously curated groups
- **THEN** its members appear as manual/editorial assignments without invented system confidence

#### Scenario: Inspect a course unavailable publicly
- **WHEN** a member has a minimal reference or an unready current observation
- **THEN** the admin can inspect available retained data and its limitations without the course disappearing or receiving invented facts

### Requirement: Unavailable judge action
Group details SHALL include a disabled judge-AI button and a visible Persian explanation that judging is not implemented. The control SHALL NOT send a request, create a job, or report a simulated result.

#### Scenario: Judge integration is deferred
- **WHEN** an admin opens any group
- **THEN** the judge action is visibly unavailable and no AI result or execution is implied

### Requirement: Accessible Persian interaction states
Admin pages SHALL use Persian RTL presentation, shared design tokens, logical layout properties, isolated mixed-direction text, Persian display numerals, and Jalali display dates. They SHALL support keyboard focus, labelled controls, narrow screens, and distinct loading, empty, error, and retry states without losing unsaved form input.

#### Scenario: Mobile keyboard review
- **WHEN** an admin navigates a group on a narrow screen using a keyboard with long Persian titles and Latin system names
- **THEN** controls remain reachable with visible focus and readable text without page-level horizontal overflow

#### Scenario: Backend failure
- **WHEN** a read or write fails
- **THEN** the UI shows a bounded Persian error and a safe recovery action without claiming the mutation succeeded or blindly repeating an uncertain create

### Requirement: Local management transport
The panel SHALL remain local-only without admin accounts. Its web management handlers SHALL expose only the required operations, use server-only API configuration, disable caching of management responses, and reject cross-origin mutation requests. Setup instructions SHALL require loopback access and state that authentication remains deferred.

#### Scenario: Browser management request
- **WHEN** the local panel performs a group mutation
- **THEN** it uses a scoped same-origin handler without exposing backend configuration or forwarding arbitrary paths

#### Scenario: Foreign origin attempts a mutation
- **WHEN** an unrelated origin sends a mutation to a web management handler
- **THEN** the handler rejects it without modifying catalog data
