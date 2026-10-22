# Spec Delta

## ADDED Requirements

### Requirement: Compact phone hero copy
At viewport widths up to and including 520 CSS pixels, the homepage hero SHALL place its provider wheel beside the heading while its description and primary action span the full available hero content width. The approved copy, desktop hero, provider identities, animation behavior and reduced-motion presentation SHALL be retained.

#### Scenario: Intermediate phone width
- **WHEN** the homepage is viewed at 430px or 520px width
- **THEN** the description and action use both hero columns, the provider wheel remains beside the heading, and text and controls remain readable without clipping or unintended page overflow

#### Scenario: Responsive boundaries and motion
- **WHEN** the homepage is viewed at 320px, 390px, 521px, 700px, 701px or desktop width, including reduced motion
- **THEN** heading, provider identities and action remain usable, the existing desktop/mobile visibility rules remain intact, and the hero action still navigates to homepage `#groups`

### Requirement: Readable real course card supporting facts
Real course cards on the homepage shelf and `/courses` SHALL render provider names, content duration, original-price amounts and currency units at no less than 12 CSS pixels at default zoom on mobile and desktop. Titles and current prices SHALL remain visually prominent. Two-line title truncation, instructor placement, aligned provider/footer rows, price provenance and source actions SHALL remain intact.

#### Scenario: Shared card readability
- **WHEN** the homepage shelf and `/courses` display paid, discounted, free, subscription or unknown-price cards
- **THEN** each displayed supporting fact uses the minimum text size without changing price meaning or introducing clipped content or unintended page overflow

#### Scenario: Long content and provenance
- **WHEN** cards contain long Persian or mixed Latin titles, instructors and prices at narrow widths
- **THEN** text retains direction isolation, card alignment and source links, and price provenance remains operable with pointer, keyboard and touch without being clipped
