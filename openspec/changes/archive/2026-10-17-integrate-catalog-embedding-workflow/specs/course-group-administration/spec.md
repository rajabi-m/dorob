# Spec Delta

## ADDED Requirements

### Requirement: Existing inbox compatibility for CLI worker results
Worker submissions SHALL be reviewable through the existing frontend suggestion inbox without new frontend pages, components, handlers or response requirements. Existing approve/reject/reopen and member provenance SHALL remain usable. Documentation SHALL disclose existing reported-confidence wording and direct clients to backend exact-score evidence.

#### Scenario: Review matching or discovery submission
- **WHEN** the unchanged group inbox loads worker suggestions
- **THEN** its existing percentage contract validates and ordinary review remains available

#### Scenario: Inspect richer evidence
- **WHEN** the owner needs raw vectors/model/run/score meaning
- **THEN** documented backend APIs expose evidence without requiring new frontend functionality
