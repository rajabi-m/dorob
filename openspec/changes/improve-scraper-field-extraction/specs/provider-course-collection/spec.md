# Provider Course Collection Delta

## ADDED Requirements

### Requirement: Extraction correction compatibility
Collector corrections SHALL preserve existing v3 and legacy v2 data-model contracts, stable course identities, CLI options/defaults and journal formats. Corrected facts SHALL use existing fields and evidence containers and validate through unchanged validators. Collection SHALL NOT rewrite retained observations or deliver data as part of read-only verification.

#### Scenario: Corrected observation under existing validation
- **WHEN** a collector extracts a previously missed source fact
- **THEN** the observation uses the existing field shape and enum values, has source evidence, and passes unchanged validation without changes to shared contracts, API, database or frontend

#### Scenario: Existing checkpoint after an extractor correction
- **WHEN** an operator supplies a journal from an earlier extractor version
- **THEN** existing compatibility checks and exact saved-payload replay behavior remain unchanged; an incompatible run requires a fresh checkpoint without overwriting the old journal

### Requirement: Course-scoped educational label traversal
All four collectors SHALL retain explicit educational statements from supported course-specific headings, inline labels and labeled lists in existing educational fields. Label matching SHALL tolerate observed Persian spacing and nested markup without inventing claims, importing related-course content or absorbing unrelated sections.

#### Scenario: Nested TopLearn outcome label
- **WHEN** a course description contains a labeled learning outcome whose paragraph is outside the label's immediate parent
- **THEN** the outcome is retained with evidence and stops at the next peer section boundary

#### Scenario: Educational statement and unrelated marketing
- **WHEN** supported labeled audience, prerequisite, practice or support text appears beside navigation or generic promotional prose
- **THEN** only the supported course-specific statement populates its matching field; unestablished language, technology versions and assessment remain unknown

### Requirement: Archived Roocket free designation
Roocket collection SHALL preserve an explicit, noncontradictory free course designation in existing pricing fields independently of archived provider state. Archived status SHALL remain unavailable with its original label. Numeric zero alone SHALL NOT establish free access, and disabled paid offers SHALL NOT become active purchase offers.

#### Scenario: Explicitly free archived course
- **WHEN** the public course identifies itself as free, both explicit free indicators agree, prices do not contradict free status and the course is archived rather than coming soon
- **THEN** pricing retains a zero free entry with source evidence while provider state remains archived and unavailable; collection makes no enrollment or access guarantee

#### Scenario: Archived paid or conflicting course
- **WHEN** an archived course is paid, has ambiguous zero prices or has contradictory free indicators
- **THEN** it is not emitted as free, and existing safeguards against disabled purchases and conflicting required pricing remain in force

### Requirement: Evidenced aggregate rating normalization
All collectors SHALL emit no normalized aggregate rating when the published rating-vote count is explicitly zero. A nonzero or unknown vote count SHALL NOT establish the rating scale. Sabzlearn SHALL normalize a score only with independently evidenced scale, retaining a missing vote count as null and never replacing it with comment totals.

#### Scenario: Published zero-vote average
- **WHEN** the provider publishes an average of zero with zero rating votes
- **THEN** normalized rating is null and source evidence explains the absence of votes without converting the value into a negative course assessment

#### Scenario: Sabzlearn scale established independently
- **WHEN** course-scoped or directly disclosed public rating evidence establishes a valid score and its scale but no rating-vote count
- **THEN** the existing aggregate field contains the score and scale with count null and precise evidence

#### Scenario: Sabzlearn scale remains unverified
- **WHEN** only a raw score and mixed comment totals can be established
- **THEN** normalized rating remains null, the raw score remains in existing provider evidence, and the inspection outcome identifies the unresolved scale

### Requirement: Evidence-bounded curriculum recovery
Collectors SHALL recover omitted curriculum entries only from verified course-specific public markup or embedded structures within existing request and payload limits. They SHALL preserve source ordering and count distinctions. An unresolved mismatch, missing list or unverified exhaustion SHALL remain explicit using existing coverage and warnings.

#### Scenario: Alternate TopLearn lesson markup
- **WHEN** a course with a positive lesson count exposes a verified alternate public lesson structure
- **THEN** its identifiable lessons are retained with source locators without changing the existing curriculum model

#### Scenario: No recoverable source list
- **WHEN** a positive published count has no verified recoverable entries, or a Maktabkhooneh or Roocket count mismatch cannot be explained
- **THEN** extraction preserves available facts and reports unknown or partial coverage rather than inventing lessons or claiming completeness

### Requirement: Existing feedback collection boundaries
Feedback fixes SHALL use only disclosed course-specific public responses and existing configured limits, origins and privacy rules. TopLearn SHALL retain unknown feedback when its disclosed response is unavailable or unrecognized. Sabzlearn and Roocket SHALL preserve explicit page-limit coverage. This correction SHALL NOT add Maktabkhooneh review traversal or new collection settings.

#### Scenario: Verified TopLearn response variation
- **WHEN** the disclosed comments request returns verifiable course-specific feedback in a supported public response variation
- **THEN** collection retains anonymous source-classified items, pagination evidence and existing bounds without guessing a replacement endpoint

#### Scenario: Feedback still blocked or bounded
- **WHEN** a feedback response is unavailable, unrecognized or further pages exceed configured bounds
- **THEN** independent course facts survive with the appropriate unknown or partial feedback state and stop reason; missing feedback is not recorded as zero reviews

### Requirement: Accurate extraction diagnostics
Collector warnings and section coverage SHALL describe the actual extraction outcome using existing fields. Explicitly free pricing SHALL NOT be diagnosed as a failed paid-currency normalization. Populated educational sections SHALL report partial rather than wholly unknown coverage when supported fields are retained and other fields remain unresolved.

#### Scenario: Free Sabzlearn pricing
- **WHEN** explicit free evidence establishes a zero price without a paid amount requiring currency conversion
- **THEN** no paid-currency verification warning is emitted and free provenance remains intact

#### Scenario: Partial educational evidence
- **WHEN** a collector retains supported educational facts but cannot establish the rest of that section
- **THEN** existing coverage records partial collection with a specific reason without asserting that all nullable fields are published
