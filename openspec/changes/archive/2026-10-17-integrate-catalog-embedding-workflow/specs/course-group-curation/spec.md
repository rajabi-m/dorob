# Spec Delta

## MODIFIED Requirements

### Requirement: Local editorial workflow
The management workflow SHALL remain local development only, without claiming authenticated administration or production readiness. Group definitions and assignments SHALL remain editor-controlled through the existing frontend and management API. Explicit CLI local embedding operations and external suggestions SHALL support review. Draft creation from discovery SHALL require explicit editorial action; memberships and publication SHALL remain separate decisions.

#### Scenario: Follow the development workflow
- **WHEN** the owner follows the documented local workflow
- **THEN** they can curate a group through the loopback-bound admin frontend or management API without an AI provider or ingestion worker

#### Scenario: Agent assists explicit editorial work
- **WHEN** the owner requests a development agent to research existing courses and manually populate groups
- **THEN** the agent records its editorial reasoning and submits explicit group definitions and course assignments, without introducing runtime AI calls, automatic placement, or claims of quality ranking

#### Scenario: System suggests an assignment
- **WHEN** an external system submits a course-to-group suggestion
- **THEN** the local workflow retains the suggestion for human review without treating it as an approved membership
#### Scenario: Explicit CLI embedding work
- **WHEN** the owner explicitly runs generation, matching or discovery from CLI
- **THEN** the worker uses backend HTTP APIs and local inference without automatically assigning or publishing courses/groups

#### Scenario: Discovery promotion with suggestions
- **WHEN** the owner explicitly promotes an approved discovered set with valid group fields
- **THEN** an empty unpublished draft is created and every discovered member is submitted as a discovery-scored suggestion, leaving assignment/publication to separate actions
