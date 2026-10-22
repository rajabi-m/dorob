# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
