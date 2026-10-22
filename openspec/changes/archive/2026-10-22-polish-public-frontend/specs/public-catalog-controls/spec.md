# Spec Delta

## ADDED Requirements

### Requirement: Readable public header navigation
Existing public header navigation links on the homepage, catalogs and comparison pages SHALL use at least 13 CSS pixel labels and at least 44 CSS pixel-high interactive areas at default zoom. They SHALL retain visible keyboard focus and remain usable beside the brand at narrow widths without overlap or unintended page overflow.

#### Scenario: Mobile and desktop header links
- **WHEN** a visitor opens `/`, `/groups`, `/courses` or an eligible comparison page at 320px, 390px, 430px or desktop width
- **THEN** existing header links meet the text and hit-area minimums, remain fully readable and can be reached and activated by keyboard

### Requirement: Visible current catalog navigation
On `/groups` and `/courses`, exactly the corresponding primary navigation link SHALL identify the current page accessibly and with a visible underline. The indication SHALL persist while searching, filtering and paging, without relying on color alone or shifting the header layout.

#### Scenario: Current destination survives catalog state
- **WHEN** a visitor opens either catalog directly or changes its query, filters or page
- **THEN** the corresponding catalog link remains underlined and carries the current-page indication while the other catalog link remains unselected and available
