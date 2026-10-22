# Spec Delta

## ADDED Requirements

### Requirement: Readable comparison evidence
Public comparison rows SHALL render assessment bullets at no less than 13 CSS pixels and instructor and metadata text at no less than 12 CSS pixels at default zoom on mobile and desktop. Persian prose SHALL retain line-height of at least 1.8. Increased text size SHALL preserve the distinction between retained provider facts and generated assessments without clipping or unintended horizontal page overflow.

#### Scenario: Read a narrow comparison
- **WHEN** a visitor opens a comparison at 320px, 390px or 430px with long Persian and mixed-direction instructor names, titles or assessment bullets
- **THEN** the text meets its minimum sizes, wraps legibly, preserves direction isolation and keeps provider actions and purchase information usable

#### Scenario: Sparse assessments and retained facts
- **WHEN** a course has empty assessment lists, unknown facts or multiple purchase offers
- **THEN** existing omission and missing-fact rules remain intact, offers retain their meaning, and the typography change neither adds assessment filler nor changes retained ordering, facts or dates

### Requirement: Consistent comparison header catalog destination
The public comparison header's «مجموعه دوره‌ها» link SHALL navigate to `/groups`. The homepage hero's section action SHALL continue to target homepage `#groups`; comparison breadcrumbs SHALL retain their existing catalog and category destinations.

#### Scenario: Return to the group catalog
- **WHEN** a visitor activates «مجموعه دوره‌ها» in a comparison header by pointer or keyboard
- **THEN** the group catalog opens rather than the homepage group section

#### Scenario: Intentional section and category navigation
- **WHEN** a visitor activates the homepage hero action or a comparison category breadcrumb
- **THEN** the hero scrolls to homepage `#groups` and the breadcrumb opens its category-filtered group catalog as before

### Requirement: Compact comparison purchase action
Public comparison rows SHALL omit purchase-option disclosures for every course, regardless of offer count. Each row SHALL retain its existing price summary and provider source link without altering the underlying offer data.

#### Scenario: Any number of retained offers
- **WHEN** a comparison course has zero, one or multiple retained purchase offers
- **THEN** no «گزینه‌های خرید» disclosure appears and its price summary and provider action remain available
