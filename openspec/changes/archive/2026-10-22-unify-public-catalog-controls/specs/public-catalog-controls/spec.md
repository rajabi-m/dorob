# Spec Delta

## Purpose

Provide consistent browsing controls across the public groups and courses catalogues while preserving each destination's distinct results and filtering semantics.

## ADDED Requirements

### Requirement: Consistent results toolbar
Both public catalogues SHALL place the localized matching count on the right and the mobile filter trigger on the left within one results toolbar. Typography, alignment and spacing SHALL follow the same rules, including spacing to active chips and results. Accessible results headings SHALL remain available without adding a visible duplicate heading.

#### Scenario: Compare mobile catalogues
- **WHEN** a visitor opens `/groups` and `/courses` at the same mobile viewport with successful results and no active conditions
- **THEN** each count and trigger occupies the same relative position in a single row, with equivalent toolbar spacing despite differing labels and counts

#### Scenario: Active conditions
- **WHEN** either catalogue has active search or filters, including long mixed Persian/Latin text
- **THEN** chips appear beneath the toolbar, wrap without horizontal page overflow and use the same spacing rules

### Requirement: Consistent responsive filter access
Both catalogues SHALL show their domain filters in a right-hand sidebar above 760 CSS pixels and through a labelled modal at widths up to and including 760 CSS pixels. Their filter triggers, modal framing, keyboard containment, Escape and backdrop dismissal, and focus return SHALL behave consistently. Selecting a filter SHALL close the modal and commit the selection immediately.

#### Scenario: Shared responsive boundary
- **WHEN** either catalogue crosses between 760px and 761px viewport widths
- **THEN** filter access switches at the same boundary between the mobile trigger and desktop sidebar without duplicate visible controls

#### Scenario: Select or dismiss mobile filters
- **WHEN** a keyboard user opens either filter modal and selects a condition or dismisses it
- **THEN** focus stays contained while open and returns to its trigger after closing; a selection updates that catalogue's URL and resets paging while preserving its other conditions

### Requirement: Consistent request feedback
Both catalogues SHALL announce pending requests in the toolbar status position and mark the results region busy. Previously committed results SHALL remain visible during the transition. A failed response SHALL show a retry state without a numeric matching count; a successful empty response SHALL show a zero count and its appropriate empty state.

#### Scenario: Pending and failed navigation
- **WHEN** a visitor changes conditions on either catalogue and the resulting request is pending and then fails
- **THEN** the toolbar announces loading while prior results remain visible, followed by a retryable error without presenting the failure as zero results

### Requirement: Consistent pagination focus
After a committed page-number change in either direction, both catalogues SHALL focus their accessible results heading and scroll to the start of the results region. Initial rendering SHALL NOT move focus or force scrolling. Filter changes on page one SHALL NOT trigger pagination scrolling.

#### Scenario: Navigate forward and back
- **WHEN** a visitor changes from page one to page two and then returns to page one in either catalogue
- **THEN** each committed page change focuses the results heading and scrolls to the results start

#### Scenario: Open or filter page one
- **WHEN** either catalogue first renders, including a direct link to a later page, or a filter changes while remaining on page one
- **THEN** pagination behavior does not take focus or force scrolling

### Requirement: Preserve domain browsing contracts
Shared control behavior SHALL preserve each catalogue's existing query parameters, filter options, URL restoration, result eligibility, cards, destinations and page sizes. Search and filter changes SHALL retain the other committed conditions and reset paging as defined by the respective catalogue contracts.

#### Scenario: Distinct catalogue contents
- **WHEN** a visitor filters groups or individual courses through the shared presentation
- **THEN** groups retain category-only filtering and twelve results per page, while courses retain provider, pricing-status and content-duration filters and eighteen results per page, without transferring conditions between destinations
