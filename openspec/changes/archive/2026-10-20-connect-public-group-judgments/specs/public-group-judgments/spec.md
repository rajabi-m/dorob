# Spec Delta

## Purpose

Let visitors discover published, currently judged course groups and compare their complete membership using retained provider facts and independently attributed AI assessments.

## ADDED Requirements

### Requirement: Automatic public judgment selection
Public judged-group reads SHALL require publication, at least two distinct members, a current judgment and presentation-ready current observations for every member under existing public course rules. Selection SHALL use newest receivedAt with ascending judgment ID ties. Eligibility SHALL precede list pagination and totals, without changing existing public group or course APIs.

#### Scenario: Multiple judgments
- **WHEN** an eligible published group has multiple current judgments
- **THEN** the newest current judgment is selected automatically without a separate approval action

#### Scenario: Ineligible group
- **WHEN** a group is a draft, has fewer than two members, lacks a current judgment, or has an unready member
- **THEN** it is absent from judged-group discovery and unpinned detail returns 404 without dropping members or borrowing historical facts

### Requirement: Strict freshness and read-only visibility
Public selection SHALL use the existing inputRevision semantics, including publication status, group definition, member references and current snapshot identities. Reads SHALL NOT write, publish, run inference, scrape or process images. Stored judgments and management freshness SHALL remain unchanged.

#### Scenario: Publish after judging
- **WHEN** a draft is judged and then published
- **THEN** that judgment is stale and the group remains absent until an explicit current judgment exists

#### Scenario: Source or membership changes
- **WHEN** a current snapshot, member reference, group definition or membership changes
- **THEN** an older incompatible judgment cannot be combined with the changed facts and no automatic regeneration occurs

### Requirement: Paginated public judged-group discovery
GET `/api/v1/judged-groups` SHALL accept limit (default 12, maximum 100) and offset (default zero), returning items, total, limit and offset. Groups SHALL sort by slug ascending with ID ties. Each item SHALL include stable group ID/slug/category, judgment hero, actual course count, distinct providers, up to three hosted covers in judge order, and selected judgment ID/time.

#### Scenario: Cards beyond the first page
- **WHEN** more eligible groups exist than the requested limit
- **THEN** bounded pages expose all groups with accurate totals and deterministic ordering for unchanged data

#### Scenario: Provider and cover derivation
- **WHEN** a group contains several courses from one provider and courses from another
- **THEN** providers are deduplicated, course count includes every member, and covers derive from actual members rather than fixture assets

### Requirement: Consistent paginated judgment details
GET `/api/v1/judged-groups/:slug` SHALL return group identity/category, selected judgment ID/time, hero and paginated assessed courses (default 20, maximum 100). Courses SHALL retain exact judgment order and each carry matching current provider facts. Later pages SHALL accept judgmentId to pin selection; an invalidated or superseded pin SHALL return 409 instead of mixing results.

#### Scenario: Expensive course leads
- **WHEN** the judge places an expensive course first
- **THEN** the API and page retain it first without price-based reordering or tag penalties

#### Scenario: Selection changes during traversal
- **WHEN** a visitor requests another page pinned to a judgment that is no longer selected or eligible
- **THEN** the response is 409 and the interface offers restarting from the current first page without appending mismatched courses

### Requirement: Separate provider facts and generated assessments
Public assessed courses SHALL expose current observation identity/time, title, provider, hosted image, source URL, available instructors, level, content duration, accountable price/offers and rating with its original scale/count. Generated tags and bullets SHALL remain separate. Unknown facts SHALL stay explicit. Public payloads SHALL omit judge evidence, manifests, system/submission IDs, raw feedback and storage diagnostics.

#### Scenario: Missing or subscription facts
- **WHEN** a member lacks a rating or has unknown or subscription pricing
- **THEN** no rating is invented, unknown never becomes free, and subscription periods and available offer terms remain distinguishable

#### Scenario: Snapshot consistency
- **WHEN** data changes while a detail request is assembled
- **THEN** the response uses one consistent group/judgment/source view or safely fails, rather than joining independently fetched management and course payloads

### Requirement: Real homepage group navigation
The homepage group section SHALL server-render the first judged-group page and provide keyboard-usable pagination. Cards SHALL use generated title/subtitle/level text and actual counts/providers/covers, link to `/groups/<stored-slug>`, and retain the selected cycling presentation. Heading copy SHALL describe course groups without unsupported popularity or fixture claims.

#### Scenario: Open a homepage group
- **WHEN** a visitor activates a real group card
- **THEN** its stored-slug destination loads that group's retained judgment and members

#### Scenario: No eligible groups or failed fetch
- **WHEN** the group list is empty or fails
- **THEN** that section shows a distinct Persian empty or retryable error state without fixture fallback or blocking independent homepage course results

### Requirement: Reusable judgment group page
Every eligible slug SHALL use the selected Python layout with generated hero fields, registry-owned category presentation, actual counts, gallery, ordered course rows, supported tag styles and AI assessment attribution. Empty assessment lists SHALL be omitted without filler or claims of no flaws. Metadata SHALL derive from eligible retained content. Product screens SHALL omit design-process labels.

#### Scenario: Empty weakness list
- **WHEN** a course has strengths but no weakness bullets
- **THEN** its strengths render and no invented weakness, technical limitation or assertion of perfection fills the empty side

#### Scenario: Unknown or unavailable destination
- **WHEN** an unknown or ineligible slug is visited
- **THEN** the page returns 404; an upstream failure instead shows a safe retryable error without pretending the group does not exist

#### Scenario: Course source action
- **WHEN** a visitor follows a provider action
- **THEN** it uses that course's retained source URL with safe new-window behavior, while compact metadata shows content duration without lesson counts or study-effort estimates

### Requirement: Accessible Persian interaction and resilient gallery
Integrated views SHALL use Persian RTL, logical layout properties, isolated mixed-direction content, Persian numerals, Jalali dates and visible keyboard focus. Galleries SHALL preserve controls, honor reduced motion and pause on focus/hover or hidden tabs. Narrow layouts and long text SHALL avoid unintended horizontal overflow. Image failures SHALL use honest visual fallbacks.

#### Scenario: Keyboard and mobile comparison
- **WHEN** a visitor navigates cards, gallery, paging and retry at narrow widths or by keyboard
- **THEN** controls remain operable and labelled, directional icons match RTL, Latin names remain legible and request states are announced

### Requirement: Safe bounded public access
Public routes SHALL document schemas/examples and return 422 for invalid inputs, 404 for missing/ineligible detail, 409 for invalidated pins and 503 for unavailable dependencies. Web data and images SHALL use the web origin with a server-only configurable API origin, bounded validated responses, finite deadlines and no-store reads. Browser inputs SHALL NOT choose upstream hosts or arbitrary paths.

#### Scenario: Malformed response or storage failure
- **WHEN** an upstream response is invalid, oversized, times out or required storage is unavailable
- **THEN** the interface shows a safe retryable failure without internal diagnostics, management data or sample replacements

### Requirement: Legacy group destination handling
Legacy `/groups/python-beginner` and `/groups/n8n` SHALL redirect to `/groups/python-starting-programming` and `/groups/n8n-workflow-automation` respectively. Other fixture-only slugs SHALL resolve only if an eligible real group uses the same slug; otherwise they SHALL return 404. Design-system fixtures SHALL remain available independently.

#### Scenario: Old Python bookmark
- **WHEN** a visitor opens the old Python route
- **THEN** navigation reaches the canonical real group route, whose current eligibility determines the result

#### Scenario: Old HTML and CSS fixture
- **WHEN** `/groups/html-css` has no corresponding eligible real group
- **THEN** it returns 404 without inventing a semantic mapping or displaying the old fixture
