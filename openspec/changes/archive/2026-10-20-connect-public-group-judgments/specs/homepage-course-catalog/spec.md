# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve surrounding sample frontend
The hero and its course shelf/provider strip, topic/category appearance, header/navigation/footer and design-system previews SHALL retain their existing appearance, data and behavior, except removal of design-process labels from product screens. Homepage group cards and group routes SHALL use the public-group-judgments contract. Hero sample-card details SHALL retain their sample facts and provenance independently of real-course details.

#### Scenario: Sample hero details
- **WHEN** a visitor opens a hero sample card after viewing a database course
- **THEN** the sample dialog still shows that fixture's own data and sample provenance without triggering a public course-detail lookup

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** group cards and destinations use real judged groups and documented legacy redirects, while design-system fixture content, links, presentation and interactions remain unchanged
