# course-group-catalog Specification

## Purpose

Provide one public catalogue where visitors discover course groups through searchable, category-filtered pages and share or revisit their browsing state.

## Requirements

### Requirement: Shared group catalogue destination
`/groups` SHALL server-render eligible judged-group results using the existing cycling cards and comparison destinations. `/groups?category=<id>` SHALL use the same catalogue with that category selected, its Persian heading and an option to return to all categories. Discovery controls SHALL consist of search and category only.

#### Scenario: Enter from a category
- **WHEN** a visitor follows the programming category link
- **THEN** `/groups?category=code` shows programming groups with the category selected and a category-specific heading

#### Scenario: Broaden discovery
- **WHEN** a visitor selects all categories
- **THEN** the catalogue removes category restriction while retaining the submitted search

#### Scenario: Open a comparison
- **WHEN** a visitor activates a group card
- **THEN** the existing `/groups/<stored-slug>` comparison opens

### Requirement: Shareable discovery state
The catalogue SHALL store submitted search as `q`, the selected category as `category`, and a one-based page as `page` in the URL. Refresh and browser Back/Forward SHALL restore committed controls and results. Search submission or category changes SHALL reset to page one while preserving the other condition. Empty search, all categories and page one SHALL omit their parameters.

#### Scenario: Share and restore
- **WHEN** a visitor opens or reloads `/groups?q=Python&category=code&page=2`
- **THEN** the search, category and second matching page are restored

#### Scenario: Change search on a later page
- **WHEN** a visitor submits a new search on page two of a selected category
- **THEN** the URL and results switch to page one with the selected category retained

#### Scenario: Navigate through history
- **WHEN** a visitor uses Back or Forward after changing committed discovery conditions
- **THEN** controls, heading and results reflect the restored URL without a superseded response replacing them

### Requirement: Filter-aware catalogue pagination
The catalogue SHALL show twelve groups per page, except a shorter final page, and the full matching total. Previous/next controls SHALL preserve submitted search and category and be unavailable at boundaries. Positive pages beyond the matching last page SHALL resolve to that last page, or page one when there are no matches.

#### Scenario: Match outside the first unfiltered page
- **WHEN** a search matches a group beyond the original first page
- **THEN** that group appears in the filtered results and totals count every matching eligible group

#### Scenario: Catalogue shrinks
- **WHEN** an open page exceeds the current last matching page
- **THEN** results and URL resolve to the last matching page without showing a misleading empty catalogue

### Requirement: Explicit active conditions and recovery
The catalogue SHALL display removable submitted-search/category chips and clear-all when conditions are active. Removing a chip SHALL preserve the other condition and reset paging. Clear-all SHALL navigate to `/groups`. Loading, zero matches, no eligible groups and safe retryable failure SHALL be distinct Persian states without fixture fallback; retry SHALL preserve committed conditions.

#### Scenario: Remove just one condition
- **WHEN** a visitor removes the category chip with a search active
- **THEN** matching groups across all categories appear on page one with the search retained

#### Scenario: Empty search result
- **WHEN** valid conditions match no eligible groups
- **THEN** the page shows zero results with controls to revise or clear conditions

#### Scenario: Retry an outage
- **WHEN** loading the filtered catalogue fails and the visitor retries
- **THEN** the same search, category and page are requested without exposing internal diagnostics

### Requirement: Safe catalogue URL handling
Unsupported category IDs, repeated recognized parameters, searches over 200 characters, and invalid or unrepresentable page values SHALL show a safe Persian invalid-selection state with a link to `/groups`. Unrelated URL parameters SHALL NOT influence catalogue queries. Invalid selections SHALL NOT silently become unfiltered results or upstream failures.

#### Scenario: Malformed selection
- **WHEN** a visitor opens `/groups?category=unknown`, `/groups?page=0`, or duplicate `q` values
- **THEN** the page explains the invalid selection and offers the unfiltered catalogue

### Requirement: Accessible Persian catalogue controls
The catalogue SHALL use Persian RTL, localized numerals, logical layout and isolated mixed-direction text. Desktop category controls SHALL appear on the right; mobile SHALL offer a labelled filter panel with focus containment, Escape dismissal and focus return. Search, chips, paging and retry SHALL have visible keyboard focus and accessible request/result status. Long text SHALL not cause horizontal overflow.

#### Scenario: Mobile filter interaction
- **WHEN** a keyboard user opens and closes mobile filters
- **THEN** focus enters the panel, remains inside while open and returns to its trigger on dismissal

#### Scenario: Long mixed-direction results
- **WHEN** long Persian/Latin group titles appear at 320px or 390px widths
- **THEN** text remains readable, cards remain operable and the page has no unintended horizontal scrolling
