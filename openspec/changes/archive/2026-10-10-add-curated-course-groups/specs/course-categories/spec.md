# Spec Delta

## Purpose

Provide a small, stable Persian category vocabulary shared by course-group APIs and frontend presentation without requiring category administration.

## ADDED Requirements

### Requirement: Fixed category vocabulary
The system SHALL expose the fixed category IDs and Persian labels: `code` / «برنامه‌نویسی», `design` / «طراحی», `data` / «داده و هوش مصنوعی», `business` / «کسب‌وکار», `language` / «زبان‌های خارجی», and `tools` / «ابزار و بهره‌وری». Category changes SHALL require a code change rather than category management operations.

#### Scenario: Read available categories
- **WHEN** a client requests `GET /api/v1/categories`
- **THEN** it receives HTTP 200 with an `items` array containing those six ID/label pairs in that order, independently of database availability

### Requirement: Valid category references
The system SHALL require every course group to reference exactly one supported category ID. Both API writes and direct database writes SHALL reject unsupported category values without changing the stored group.

#### Scenario: Reject unsupported category through the API
- **WHEN** an editor creates or updates a group with category ID `unknown-category`
- **THEN** the API returns a validation error and preserves existing data

#### Scenario: Reject unsupported category through SQL
- **WHEN** a database write attempts to store a group with an unsupported category ID
- **THEN** the database rejects that write

### Requirement: Category presentation uses stable identity
Frontend category artwork SHALL be selected by category ID rather than Persian label. Artwork SHALL remain frontend-owned, and shared category contracts SHALL be browser-safe without importing server code or frontend rendering dependencies.

#### Scenario: Change a display label
- **WHEN** a category's Persian label changes in code while its ID remains unchanged
- **THEN** its existing artwork selection and group references remain valid

#### Scenario: Preserve existing category presentation
- **WHEN** the frontend adopts the shared category vocabulary
- **THEN** the six existing category cards retain their artwork, descriptions, icons, and category-filter behavior
