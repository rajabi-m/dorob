# public-group-judgments Specification

## Purpose

Let visitors discover published, currently judged course groups and compare their complete membership using retained provider facts and independently attributed AI assessments.

## Requirements

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
GET `/api/v1/judged-groups` SHALL accept limit (default 12, maximum 100), offset (default zero), optional `q` and optional fixed-registry `category`, returning items, total, limit and offset. Eligibility and both filters SHALL precede totals and pagination. Groups SHALL sort by slug ascending with ID ties. Each item SHALL include stable group ID/slug/category, judgment hero, actual course count, distinct providers, up to three hosted covers in judge order, and selected judgment ID/time.

#### Scenario: Cards beyond the first page
- **WHEN** more eligible groups exist than the requested limit
- **THEN** bounded pages expose all groups with accurate totals and deterministic ordering for unchanged data

#### Scenario: Provider and cover derivation
- **WHEN** a group contains several courses from one provider and courses from another
- **THEN** providers are deduplicated, course count includes every member, and covers derive from actual members rather than fixture assets

#### Scenario: Combined conditions before paging
- **WHEN** a query and category are provided with an offset
- **THEN** only eligible groups matching both conditions are counted and paginated in the existing stable order

#### Scenario: Existing clients
- **WHEN** a client omits search and category
- **THEN** existing list defaults, response shape and ordering remain compatible

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
The homepage group section SHALL server-render up to three eligible judged groups in the existing stable list order, omit group pagination, and expose «مشاهده همه مجموعه‌ها» linking to `/groups`. Cards SHALL use generated title/subtitle/level text and actual counts/providers/covers, link to `/groups/<stored-slug>`, and retain the selected cycling presentation. Heading copy SHALL describe course groups without unsupported popularity or fixture claims.

#### Scenario: Open a homepage group
- **WHEN** a visitor activates a real group card
- **THEN** its stored-slug destination loads that group's retained judgment and members

#### Scenario: No eligible groups or failed fetch
- **WHEN** the group list is empty or fails
- **THEN** that section shows a distinct Persian empty or retryable error state without fixture fallback or blocking independent homepage course results

#### Scenario: Browse beyond the homepage
- **WHEN** more than three eligible groups exist
- **THEN** the homepage shows only the first three without paging controls and the all-groups link opens `/groups`

#### Scenario: Fewer than three groups
- **WHEN** only one or two eligible groups exist
- **THEN** only those groups render without fabricated cards and the catalogue link remains available

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

### Requirement: Normalized public group search
Group list search SHALL match a literal substring in the group's selected hero title, subtitle or description using Unicode NFKC, Arabic ي/ك to Persian ی/ک, ZWNJ to space, collapsed whitespace, trimming and case normalization. Empty normalized search SHALL impose no restriction. Search SHALL NOT inspect member-course titles or providers or invoke inference.

#### Scenario: Equivalent Persian input
- **WHEN** a query uses equivalent Arabic letters, different letter case, or spaces in place of ZWNJ in displayed group text
- **THEN** equivalent normalized text matches without changing stored text

#### Scenario: Literal punctuation
- **WHEN** the submitted query contains percent or underscore characters
- **THEN** those characters are treated literally rather than as search wildcards

### Requirement: Validated group list filters
List `q` SHALL accept at most 200 characters and `category` SHALL accept exactly one fixed-registry ID. Repeated or unknown API parameters, invalid categories and oversized queries SHALL return safe 422 responses. Category matching SHALL use the group's assigned category. List-only filters SHALL be rejected by the detail endpoint; existing detail paging and judgment pinning SHALL remain intact.

#### Scenario: Unsupported filter
- **WHEN** a caller supplies an invalid category, duplicate `q`, or provider filter to the judged-group API
- **THEN** the API returns 422 without silently ignoring the invalid filter

#### Scenario: Category boundary
- **WHEN** a group belongs to `code` and a request selects `design`
- **THEN** that group is excluded regardless of its member-course facts

#### Scenario: Detail compatibility
- **WHEN** callers use existing detail paging and judgment pinning without list filters
- **THEN** the current detail contract and conflict behavior are preserved
