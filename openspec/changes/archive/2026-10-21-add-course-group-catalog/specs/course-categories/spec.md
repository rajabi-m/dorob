# Spec Delta

## MODIFIED Requirements

### Requirement: Category presentation uses stable identity
Frontend category artwork SHALL be selected by category ID rather than Persian label. Artwork SHALL remain frontend-owned, and shared category contracts SHALL be browser-safe without importing server code or frontend rendering dependencies. Homepage category cards SHALL link to `/groups?category=<id>` using fixed registry IDs; category presentation and independent design-system selection examples SHALL remain intact.

#### Scenario: Change a display label
- **WHEN** a category's Persian label changes in code while its ID remains unchanged
- **THEN** its existing artwork selection and group references remain valid

#### Scenario: Preserve existing category presentation
- **WHEN** the frontend displays the shared category vocabulary
- **THEN** the six existing category cards retain their artwork, descriptions and icons, with homepage cards navigating to their filtered group catalogue and design-system cards retaining isolated selection behavior

#### Scenario: Follow a category link
- **WHEN** a visitor follows or opens a homepage category card in a new tab
- **THEN** its link resolves directly to the shared catalogue with the matching registry category selected
