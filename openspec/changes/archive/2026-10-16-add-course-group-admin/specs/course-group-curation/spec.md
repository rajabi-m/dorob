# Spec Delta

## MODIFIED Requirements

### Requirement: Local editorial workflow
The management workflow SHALL remain local development only, without claiming authenticated administration or production readiness. Group definitions and assignments SHALL remain editor-controlled through the local admin frontend and management API. Explicit agent research and external system suggestions SHALL support editorial review; the backend SHALL NOT invoke AI or create memberships from suggestions without admin approval.

#### Scenario: Follow the development workflow
- **WHEN** the owner follows the documented local workflow
- **THEN** they can curate a group through the loopback-bound admin frontend or management API without an AI provider or ingestion worker

#### Scenario: Agent assists explicit editorial work
- **WHEN** the owner requests a development agent to research existing courses and manually populate groups
- **THEN** the agent records its editorial reasoning and submits explicit group definitions and course assignments, without introducing runtime AI calls, automatic placement, or claims of quality ranking

#### Scenario: System suggests an assignment
- **WHEN** an external system submits a course-to-group suggestion
- **THEN** the local workflow retains the suggestion for human review without treating it as an approved membership

## ADDED Requirements

### Requirement: Searchable management catalog
Management group lists SHALL support normalized text search, category and publication filters; course-reference lists SHALL support normalized text search. Filtering SHALL precede pagination and totals. Search SHALL normalize equivalent Persian/Arabic letters and spacing without rewriting stored text. Existing unfiltered response shapes, pagination limits, and ordering SHALL remain compatible.

#### Scenario: Search all pages
- **WHEN** a matching course or group lies beyond the first unfiltered page
- **THEN** a filtered request includes it and reports the full matching total

#### Scenario: Combine group filters
- **WHEN** an admin selects category, publication status, and search text together
- **THEN** only groups satisfying every supplied filter are returned, including drafts when selected

#### Scenario: Existing client omits new filters
- **WHEN** an existing management client requests lists without filters
- **THEN** it receives the established paginated shape and deterministic ordering
