# public-group-judgments Specification

## Purpose

Let visitors discover published, currently judged course groups and compare their complete membership using retained provider facts and independently attributed AI assessments.

## Requirements

### Requirement: Automatic public judgment selection
Public judged-group reads SHALL select the newest complete presentation-ready retained edition created for a published group, ordered by receivedAt descending and judgment ID ascending. Editions require at least two assessed members with exact retained snapshots. Current publication and assessed-member withdrawal gates SHALL apply. Eligibility SHALL precede totals and pagination; public individual-course APIs SHALL remain unchanged.

#### Scenario: Multiple judgments
- **WHEN** an eligible published group has multiple complete presentation-ready judgments created while published
- **THEN** the newest edition is selected automatically without a separate approval action, even when its input revision is no longer current

#### Scenario: Ineligible group
- **WHEN** a group is a draft, lacks a complete ready edition, or fails the assessed-member withdrawal gate
- **THEN** it is absent from judged-group discovery and unpinned detail returns 404 without dropping assessed members or substituting different source facts

#### Scenario: Newly approved course waits
- **WHEN** a fourth course is approved for a group with a public three-course edition
- **THEN** the three-course edition remains selected unchanged and the fourth course is absent from its rows, count, providers and covers until included in a complete replacement

#### Scenario: Replacement is not ready
- **WHEN** a newer judgment has an absent source snapshot or a thumbnail not yet ready while the preceding edition remains complete and ready
- **THEN** the preceding edition remains selected without combining either edition's members or facts

#### Scenario: Complete replacement becomes available
- **WHEN** a newer complete judgment covering the working membership and its exact retained snapshots is presentation-ready
- **THEN** subsequent reads select its hero, courses, facts and summaries together with its new judgment identity

### Requirement: Strict freshness and read-only visibility
Public visibility SHALL be independent of working inputRevision equality. Public reads SHALL use only the selected judgment's retained group context, assessed membership and exact source snapshots, with current slug, publication and withdrawal gates. Reads SHALL NOT write, publish, infer, scrape or process images. Judgment submission revision checks, immutable history and management isCurrent SHALL remain unchanged.

#### Scenario: Publish after judging
- **WHEN** a draft is judged and then published
- **THEN** the draft-context judgment does not become a public edition and no comparison appears until a complete ready judgment created while published exists

#### Scenario: Source or membership changes
- **WHEN** a source snapshot, member reference, group definition or added membership changes after an edition is available
- **THEN** the edition remains visible with its original assessed members and facts, while management reports the retained judgment's actual freshness and no regeneration occurs

#### Scenario: Working revision validation is preserved
- **WHEN** a caller submits a new judgment using a revision invalidated by an approved addition or source refresh
- **THEN** the submission returns 409 while the retained public edition remains available

### Requirement: Paginated public judged-group discovery
GET `/api/v1/judged-groups` SHALL preserve limit (default 12, maximum 100), offset (default zero), optional q and category, returning items, total, limit and offset. Edition eligibility and filters SHALL precede totals/pagination. Groups SHALL sort by current slug and ID. Items SHALL contain stable ID/current slug, retained category/hero, assessed course count, distinct assessed providers, up to three covers in judge order, and selected judgment ID/time.

#### Scenario: Cards beyond the first page
- **WHEN** more eligible groups exist than the requested limit
- **THEN** bounded pages expose all groups with accurate totals and deterministic ordering for unchanged data

#### Scenario: Provider and cover derivation
- **WHEN** an edition contains several courses from one provider and courses from another
- **THEN** providers are deduplicated, course count includes every assessed member, and covers derive from the edition's exact source snapshots

#### Scenario: Combined conditions before paging
- **WHEN** a query and category are provided with an offset
- **THEN** only eligible editions matching both conditions are counted and paginated in the existing stable order

#### Scenario: Existing clients
- **WHEN** a client omits search and category
- **THEN** existing list defaults, response shape and ordering remain compatible

### Requirement: Consistent paginated judgment details
GET `/api/v1/judged-groups/:slug` SHALL return current group identity/slug, retained category, selected judgment ID/time, hero and paginated assessed courses (default 20, maximum 100). Courses SHALL retain exact judgment order and matching retained source facts. Later pages SHALL accept judgmentId to pin selection; withdrawn, unavailable or superseded pins SHALL return 409 instead of mixing editions.

#### Scenario: Expensive course leads
- **WHEN** the judge places an expensive course first
- **THEN** the API and page retain it first without price-based reordering or tag penalties

#### Scenario: Selection changes during traversal
- **WHEN** a visitor requests another page pinned to an edition that is no longer selected or eligible
- **THEN** the response is 409 and the interface offers restarting from the selected first page without appending mismatched courses

#### Scenario: Working data changes during traversal
- **WHEN** memberships are added or sources refreshed between pages without replacing or withdrawing the selected edition
- **THEN** its pinned next page succeeds with the same totals, ordering and retained snapshots

### Requirement: Separate provider facts and generated assessments
Public assessed courses SHALL expose the edition's exact observation identity/time, title, provider, hosted image, source URL, instructors, level, duration, price/offers and rating with original scale/count. Generated tags/bullets SHALL remain separate. Unknown facts SHALL stay explicit. Payloads SHALL omit judge evidence, manifests, system/submission IDs, raw feedback and storage diagnostics. Latest-course APIs SHALL remain independent.

#### Scenario: Missing or subscription facts
- **WHEN** an assessed snapshot lacks a rating or has unknown or subscription pricing
- **THEN** no rating is invented, unknown never becomes free, and subscription periods and available offer terms remain distinguishable

#### Scenario: Snapshot consistency
- **WHEN** working data changes while a detail request is assembled
- **THEN** the response uses one consistent edition/source view or safely fails rather than joining current management facts to retained assessment text

#### Scenario: Price and reference refresh
- **WHEN** an assessed course receives a new title, source URL, price, rating or thumbnail in the working catalogue
- **THEN** the comparison retains all corresponding evaluated values and snapshot identities while the individual-course catalogue can expose newer facts

#### Scenario: Same course appears in different editions
- **WHEN** two groups assess the same course using different snapshots
- **THEN** each group displays its own edition's snapshot without cross-group source substitution

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
Every eligible slug SHALL use the selected Python layout with retained hero, category, assessed counts, gallery, ordered rows, supported tags and AI attribution. Empty assessment lists SHALL be omitted without filler. Metadata SHALL derive from the selected edition. Source and judgment dates SHALL remain accurate; public UI SHALL omit working-update notices and claims that retained prices are current quotations.

#### Scenario: Empty weakness list
- **WHEN** a course has strengths but no weakness bullets
- **THEN** its strengths render and no invented weakness, technical limitation or assertion of perfection fills the empty side

#### Scenario: Unknown or unavailable destination
- **WHEN** an unknown or ineligible slug is visited
- **THEN** the page returns 404; an upstream failure instead shows a safe retryable error without pretending the group does not exist

#### Scenario: Course source action
- **WHEN** a visitor follows a provider action
- **THEN** it uses that assessed snapshot's retained source URL with safe new-window behavior, while compact metadata shows content duration without lesson counts or study-effort estimates

#### Scenario: Working changes remain internal
- **WHEN** an addition or source refresh makes the selected edition noncurrent in management
- **THEN** visitors continue seeing the same comparison and original dates without a pending-course section or an updating warning

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
List q SHALL accept at most 200 characters and category SHALL accept exactly one fixed-registry ID. Repeated or unknown parameters, invalid categories and oversized queries SHALL return safe 422 responses. Category matching SHALL use the selected edition's retained assigned category. List-only filters SHALL be rejected by detail; existing paging and judgment pinning SHALL remain intact.

#### Scenario: Unsupported filter
- **WHEN** a caller supplies an invalid category, duplicate q, or provider filter to the judged-group API
- **THEN** the API returns 422 without silently ignoring the invalid filter

#### Scenario: Category boundary
- **WHEN** the selected edition belongs to code and a request selects design
- **THEN** that group is excluded regardless of its working category or member-course facts

#### Scenario: Detail compatibility
- **WHEN** callers use existing detail paging and judgment pinning without list filters
- **THEN** the existing detail contract and conflict behavior are preserved under retained edition selection

### Requirement: Explicit comparison visibility overrides
Current unpublishing SHALL hide all editions immediately. Removing a course assessed by the selected edition SHALL hide that edition as a whole, without partially rendering it or searching older editions to bypass withdrawal. Removing a waiting unassessed member SHALL leave the selected edition visible. A replacement that excludes a removed course SHALL be eligible under normal selection rules.

#### Scenario: Unpublish retained comparison
- **WHEN** an admin unpublishes a group with a retained edition
- **THEN** it disappears from group discovery and detail regardless of retained judgment history

#### Scenario: Remove assessed course
- **WHEN** an admin removes one of the courses assessed in the selected edition
- **THEN** the edition is hidden, unpinned detail returns 404, and pinned detail returns 409 without exposing an older edition instead

#### Scenario: Remove waiting addition
- **WHEN** an admin removes a newly approved course that is absent from the selected edition
- **THEN** the selected edition and its assessed count remain unchanged

### Requirement: Exact retained asset availability
A public edition SHALL use only its assessed snapshots' hosted assets. Newer snapshot or image failures SHALL NOT invalidate an older ready edition. Missing/corrupt assets of the selected edition SHALL make it unavailable without borrowing another snapshot or selecting older history to mask the failure. Storage service outages SHALL retain safe 503 behavior.

#### Scenario: New snapshot image fails
- **WHEN** a working refresh has a failed thumbnail while the selected edition's retained thumbnail remains available
- **THEN** the retained comparison stays visible with its original thumbnail

#### Scenario: Evaluated image disappears
- **WHEN** a selected edition's exact hosted asset is missing or corrupt
- **THEN** the edition is unavailable under existing 404 or pinned 409 semantics, with no substitute image snapshot or older-edition fallback

#### Scenario: Storage outage
- **WHEN** required asset storage cannot be inspected
- **THEN** the read returns safe 503 rather than silently selecting another edition or borrowing facts

### Requirement: Readable comparison evidence
Public comparison rows SHALL render assessment bullets at no less than 13 CSS pixels and instructor and metadata text at no less than 12 CSS pixels at default zoom on mobile and desktop. Persian prose SHALL retain line-height of at least 1.8. Increased text size SHALL preserve the distinction between retained provider facts and generated assessments without clipping or unintended horizontal page overflow.

#### Scenario: Read a narrow comparison
- **WHEN** a visitor opens a comparison at 320px, 390px or 430px with long Persian and mixed-direction instructor names, titles or assessment bullets
- **THEN** the text meets its minimum sizes, wraps legibly, preserves direction isolation and keeps provider actions and purchase information usable

#### Scenario: Sparse assessments and retained facts
- **WHEN** a course has empty assessment lists, unknown facts or multiple purchase offers
- **THEN** existing omission and missing-fact rules remain intact, offers retain their meaning, and the typography change neither adds assessment filler nor changes retained ordering, facts or dates

### Requirement: Consistent comparison header catalog destination
The public comparison header's «مجموعه دوره‌ها» link SHALL navigate to `/groups`. The homepage hero's section action SHALL continue to target homepage `#groups`; comparison breadcrumbs SHALL retain their existing catalog and category destinations.

#### Scenario: Return to the group catalog
- **WHEN** a visitor activates «مجموعه دوره‌ها» in a comparison header by pointer or keyboard
- **THEN** the group catalog opens rather than the homepage group section

#### Scenario: Intentional section and category navigation
- **WHEN** a visitor activates the homepage hero action or a comparison category breadcrumb
- **THEN** the hero scrolls to homepage `#groups` and the breadcrumb opens its category-filtered group catalog as before

### Requirement: Compact comparison purchase action
Public comparison rows SHALL omit purchase-option disclosures for every course, regardless of offer count. Each row SHALL retain its existing price summary and provider source link without altering the underlying offer data.

#### Scenario: Any number of retained offers
- **WHEN** a comparison course has zero, one or multiple retained purchase offers
- **THEN** no «گزینه‌های خرید» disclosure appears and its price summary and provider action remain available
