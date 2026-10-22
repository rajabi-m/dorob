# Spec Delta

## Purpose

Provide a stable local backend interface for future judges to read retained group/course evidence and submit attributable, revision-bound judgments containing page text, course tags and AI-selected recommendation order.

## ADDED Requirements

### Requirement: Group discovery reuses editorial catalog
The judge workflow SHALL discover groups through the existing paginated management group list, including drafts and existing filters. New judge input reads SHALL work independently of public publication eligibility and SHALL NOT modify groups or memberships.

#### Scenario: Read an unpublished group
- **WHEN** a caller selects a draft from `GET /api/v1/manage/groups`
- **THEN** its judge context is readable without publishing it or changing its members

#### Scenario: Small group
- **WHEN** a group has fewer than two members
- **THEN** context and evidence remain readable but context reports `canSubmit: false`, and a new judgment submission returns 409

### Requirement: Versioned judge context
GET `/api/v1/manage/groups/:id/judge-input` SHALL return schema version 1, group definition, authoritative category, member count, `canSubmit`, an opaque `inputRevision`, the ordering rule and tag vocabulary. Generated hero content SHALL NOT alter group category or editorial definition.

#### Scenario: Obtain context
- **WHEN** a caller reads an existing group
- **THEN** it receives the stored title, description, category ID, target level and publication state, plus the revision for the complete member/source set

#### Scenario: Category artwork remains external
- **WHEN** the context category is `code`
- **THEN** it retains that registry ID without an AI-selected icon, CSS class or category replacement

### Requirement: Complete revision-bound member traversal
GET `/api/v1/manage/groups/:id/judge-input/courses` SHALL require `inputRevision` and return every member through stable canonical-ID pagination, default 20 and maximum 100. Items SHALL identify current snapshot or explicit absence. A changed revision SHALL return 409 rather than mix evidence from different group states.

#### Scenario: Traverse multiple pages
- **WHEN** a group has more members than one page
- **THEN** page totals and canonical-ID order account for each member exactly once under the same revision, including members without observations

#### Scenario: Definition or membership changes between pages
- **WHEN** a caller requests another page using the prior revision after a group definition, membership or source dependency changes
- **THEN** HTTP 409 instructs the caller to refresh context without returning a mixed-revision page

### Requirement: Retained educational and commercial evidence
GET `/api/v1/manage/groups/:id/judge-input/courses/:courseId` SHALL require the revision and return the member's reference, snapshot identity/time and whitelisted v3 sections with coverage. Evidence SHALL include description, education, classification, curriculum, instructors, pricing, provider state, features and feedback summary, preserving nulls and offer units/terms.

#### Scenario: Rich evidence
- **WHEN** an observed member is inspected
- **THEN** the result includes retained outcomes, prerequisites, syllabus/coverage, learning support, durations, available ratings and all retained purchase options, without inventing missing facts

#### Scenario: Unobserved member
- **WHEN** a member has no accepted observation
- **THEN** reference identity remains available and snapshot/evidence are explicitly null rather than borrowed from another course

#### Scenario: Failed or partial section
- **WHEN** the accepted observation has a failed pricing section or partial syllabus
- **THEN** those states remain distinguishable from complete data, and unknown pricing never becomes zero

### Requirement: Course comments and reviews reach the judge
GET `/api/v1/manage/groups/:id/judge-input/courses/:courseId/feedback` SHALL require the revision and paginate all retained feedback items, default 20 and maximum 100, in retained order. It SHALL preserve item ID, text, `sourceType`, rating, date and enrollment-verification state, plus collection coverage. Comments SHALL NOT be excluded merely because they are not reviews.

#### Scenario: Comments without reviews
- **WHEN** a course contains retained `sourceType: comment` items and no review items
- **THEN** the judge can read every retained comment and its text across pages with the original comment classification

#### Scenario: Mixed feedback
- **WHEN** retained feedback contains comments and reviews
- **THEN** both are returned, without classifying questions, comments or unknown enrollment as verified student reviews

#### Scenario: Partial upstream collection
- **WHEN** 35 retained items are available from a partially collected provider discussion
- **THEN** all 35 are pageable, API total means retained items, and upstream selection, published/collected counts, omissions, has-more and stop reason remain explicit

#### Scenario: Unknown or empty feedback
- **WHEN** no feedback section exists, or a successful collection explicitly contains zero items
- **THEN** both reads return zero items but distinguish missing/unknown collection from confirmed-empty feedback

### Requirement: Read-only and bounded evidence access
Judge input reads SHALL use existing observations only, have no persistence or inference side effects, and omit raw HTML, providerData, credentials, storage diagnostics and unrelated identities. Text SHALL be treated as untrusted evidence. Responses SHALL NOT silently truncate retained syllabus or feedback; paging SHALL bound feedback traversal.

#### Scenario: Hostile provider text
- **WHEN** a description or comment contains instructions addressed to an agent
- **THEN** it remains untrusted course evidence and cannot change the output contract, group membership or backend behavior

#### Scenario: No collection on read
- **WHEN** a judge reads context or feedback
- **THEN** no scraper, external request, model call, thumbnail processing or database write is initiated

### Requirement: Generated judgment content contract
Judgment `content` SHALL contain only `schemaVersion: 1`, `hero` and `courses`. Hero SHALL contain title, subtitle, description, topicLabel and levelSummary. Each ordered course entry SHALL contain only courseId, tags, strengths and weaknesses. Unknown properties, invalid types and unsupported versions SHALL return 422.

#### Scenario: Reject source-fact replacement
- **WHEN** content includes price, rating, title overrides per course, images, source URLs, category, HTML, groupId, slug, position, score or rankingReason fields
- **THEN** submission returns 422 without storing a judgment

#### Scenario: Bounded text output
- **WHEN** content is validated
- **THEN** hero strings are nonblank within documented limits, course lists and bullet text obey documented bounds, and tags/bullets are arrays rather than null

### Requirement: AI owns recommendation ordering
The AI-supplied `courses` array SHALL define the exact order. The rule SHALL be «اولویت با دوره‌هایی است که ارزش یادگیری بیشتر و قیمت کمتری دارند». The backend SHALL NOT apply a scoring formula, price sort or expensive-tag penalty. Every current member SHALL occur exactly once, even if its assessment arrays are empty.

#### Scenario: Expensive high-value course leads
- **WHEN** a valid judgment puts a high-value course tagged `expensive` first
- **THEN** acceptance and readback preserve its first position without demotion

#### Scenario: Missing or duplicate course
- **WHEN** content omits a member, repeats one or includes a nonmember
- **THEN** HTTP 422 rejects the entire submission without partial persistence

### Requirement: Fixed assessment tag vocabulary
Tags SHALL be unique values from `project_based`, `practice_based`, `popular` and `expensive`, mapped respectively to «پروژه‌محور», «تمرین‌محور», «محبوب کاربران» and «پر هزینه». Empty tags SHALL be valid. Badge appearance remains frontend-owned; this backend SHALL NOT accept caller-defined labels or styling.

#### Scenario: Supported combined tags
- **WHEN** a course has `project_based`, `popular` and `expensive`
- **THEN** all three are accepted without changing course order

#### Scenario: Unsupported or repeated tag
- **WHEN** a tag is unknown or repeated within a course
- **THEN** HTTP 422 rejects the submission

### Requirement: Course-focused assessment meaning
Strengths and weaknesses SHALL be concise Persian course-focused bullet text. The judge standard SHALL forbid invented reviews, unsupported missing-topic claims and dataset/implementation complaints as weaknesses. `popular` SHALL indicate supported learner approval; `expensive` SHALL compare prices within the group, not merely mean paid. Empty arrays SHALL permit abstention.

#### Scenario: Insufficient educational evidence
- **WHEN** retained evidence does not support a meaningful weakness or tag
- **THEN** the standard permits an empty array instead of requiring invented criticism or a missing-data complaint

#### Scenario: Review-based criticism
- **WHEN** a judge bases a weakness on comments or reviews
- **THEN** the standard requires the text to reflect that evidence and its classification without claiming universal student opinion

#### Scenario: Semantic validation boundary
- **WHEN** structurally valid text is accepted
- **THEN** acceptance records a caller-supplied judgment and does not certify factual accuracy or run a second model to verify prose

### Requirement: Atomic revision-bound submission
POST `/api/v1/manage/groups/:id/judgments` SHALL accept systemId, submissionId, inputRevision and content. A new submission SHALL validate and persist atomically against one consistent current group/member/source state. Stale revisions SHALL return 409. Generated content SHALL remain separate from immutable source records.

#### Scenario: Price or comment evidence changes
- **WHEN** a new accepted member snapshot changes prices or comments before the submission's consistency point
- **THEN** the old inputRevision is rejected with 409 and no judgment is written

#### Scenario: Valid submission
- **WHEN** revision and content are valid for a group with at least two members
- **THEN** HTTP 201 returns an immutable judgment with server ID/time, group context, attribution and exact ordered content

### Requirement: Safe idempotent judgment retries
The pair `(systemId, submissionId)` SHALL identify a submission globally. Exact retries for the same group/revision/content SHALL return 200 and the original record, even after inputs change. Reusing the pair for different input, content or group SHALL return 409. Concurrent identical submissions SHALL create one record.

#### Scenario: Lost response then stale inputs
- **WHEN** acceptance succeeds, its response is lost, and an exact retry arrives after a source refresh
- **THEN** the original judgment is returned with HTTP 200 and current freshness metadata instead of creating a second result or rejecting the replay as stale

#### Scenario: Competing identical requests
- **WHEN** identical submissions arrive concurrently
- **THEN** one immutable record exists and every successful response identifies that record

### Requirement: Durable history and freshness readback
GET `/api/v1/manage/groups/:id/judgments` SHALL paginate newest-first history with stable ID ties. GET `/api/v1/manage/groups/:id/judgments/:judgmentId` SHALL return exact stored content and input manifest. Reads SHALL report `isCurrent` by comparing retained inputRevision with current dependencies, without rewriting judgments or selecting one for public display.

#### Scenario: Preserve order after restart
- **WHEN** services restart normally and a judgment is read
- **THEN** IDs, attribution, hero, tags, bullets and AI course order are unchanged

#### Scenario: History becomes stale
- **WHEN** group context, members or a member's current observation changes after acceptance
- **THEN** retained content remains readable with `isCurrent: false`; a newer judgment does not delete older records

### Requirement: Safe documented local API and compatibility
All judge endpoints SHALL have Swagger request/response schemas and examples. Invalid input SHALL return 422, missing resources 404, revision/idempotency conflicts 409, oversized bodies 413 and unavailable storage 503 with safe errors. Local trust boundaries and existing catalog, membership, ingestion, suggestion and public behavior SHALL remain unchanged.

#### Scenario: Inspect and submit through Swagger
- **WHEN** a developer follows the judge API examples
- **THEN** they can obtain context, traverse evidence including comments, submit content, replay it and read history without an installed judge

#### Scenario: Submit does not publish
- **WHEN** a judgment is stored for a draft or published group
- **THEN** source facts, group definition, membership, publication state, embedding suggestions and existing public responses remain unchanged

#### Scenario: Storage unavailable
- **WHEN** a judge operation cannot reach required storage
- **THEN** HTTP 503 excludes credentials, SQL and filesystem paths
