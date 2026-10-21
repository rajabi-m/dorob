# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog-wide course interactions
Existing homepage search and free controls SHALL drive backend course queries without changing their layout or styling. Homepage category cards SHALL instead navigate to `/groups?category=<id>`. Individual-course pagination SHALL remain confined to the course section. A course filter change SHALL reset paging. Responses from superseded requests SHALL NOT overwrite newer results. Counts and empty states SHALL represent the entire matching eligible course catalog.

#### Scenario: Query and paging
- **WHEN** a visitor searches or changes a course filter and moves to another page
- **THEN** results use the selected conditions, show the matching total, and navigate bounded pages rather than filtering only loaded cards

#### Scenario: Rapid query changes
- **WHEN** an older request completes after a newer selection
- **THEN** the course section retains the newer selection's results

#### Scenario: Category navigation
- **WHEN** a visitor activates a homepage category card
- **THEN** the corresponding filtered group catalogue opens rather than changing the homepage course results

### Requirement: Preserve surrounding sample frontend
The hero and its course shelf/provider strip, topic/category appearance, header/navigation/footer and design-system previews SHALL retain their existing appearance, data and behavior, except removal of design-process labels, homepage category links to the shared group catalogue, and the compact group showcase. Homepage group cards and group routes SHALL use the public-group-judgments contract. Hero sample-card details SHALL retain their sample facts and provenance independently of real-course details.

#### Scenario: Sample hero details
- **WHEN** a visitor opens a hero sample card after viewing a database course
- **THEN** the sample dialog still shows that fixture's own data and sample provenance without triggering a public course-detail lookup

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** group cards and destinations use real judged groups and documented legacy redirects, while design-system fixture content, links, presentation and interactions remain unchanged

#### Scenario: Scoped homepage discovery update
- **WHEN** the homepage is displayed
- **THEN** category cards retain their presentation as catalogue links and the group section shows up to three cards and the all-groups action without group pagination
