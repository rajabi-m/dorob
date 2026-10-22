# Spec Delta

## Purpose

Provide reproducible local experiments on real course embeddings to evaluate existing-group matching and new-group discovery before changing Dorob's catalog behavior.

## ADDED Requirements

### Requirement: Isolated experimental operation
The laboratory SHALL run only on explicit invocation and persist its artifacts outside production storage. It SHALL NOT mutate catalog records, submit production suggestions, create groups, approve memberships or publish. Opening saved results SHALL NOT start inference, import or discovery.

#### Scenario: Inspect an experimental suggestion
- **WHEN** a user opens or labels a candidate
- **THEN** only local experimental artifacts can change and the production catalog remains unchanged

#### Scenario: Open the laboratory
- **WHEN** a user starts its interface with saved results
- **THEN** results load without invoking Ollama or the catalog API

### Requirement: Frozen real catalog datasets
Import SHALL accept existing read-only management API responses or a validated local export and persist a dated dataset with stable course/group IDs, exact observation references, educational facts, group definitions, memberships and explicit exclusions. It SHALL report failed reads and missing data; incomplete captures SHALL NOT be presented as a complete catalog.

#### Scenario: Capture several pages
- **WHEN** the catalog exceeds one page
- **THEN** import accounts for all selected pages, checks ID uniqueness and records requested scope, counts and capture interval

#### Scenario: Interrupted or changing capture
- **WHEN** a required read fails or enumeration detects changed identities or totals
- **THEN** the capture is marked incomplete or inconsistent and requires explicit partial-dataset selection before experiments

#### Scenario: Work offline
- **WHEN** a saved valid dataset is selected while the application backend is unavailable
- **THEN** experiments use that frozen dataset without fetching current catalog data

### Requirement: Deterministic educational inputs
The lab SHALL construct versioned course and group embedding inputs from educational fields, retaining source references and missing or omitted coverage. Commercial fields, ratings, provider branding and raw payloads SHALL NOT determine inputs. Source records SHALL remain unchanged and title-only courses SHALL be marked sparse and excluded from candidate generation.

#### Scenario: Price changes
- **WHEN** only a course price or collection time changes across imports
- **THEN** its educational input hash remains identical and its compatible cached vector can be reused

#### Scenario: Sparse reference
- **WHEN** a course has only its title without substantive educational evidence
- **THEN** the lab shows missing coverage and excludes it from matching and discovery candidates

### Requirement: Actual local versioned embeddings
Generation SHALL use local inference and retain exact model artifact, dimensions, input hash, input-format, pooling and normalization identities. It SHALL cache valid vectors, retain configurations side by side and reject silent truncation, zero or non-finite vectors, mismatched dimensions and model changes during generation.

#### Scenario: Resume generation
- **WHEN** generation restarts after interruption
- **THEN** valid cached entries are reused and failed or missing entries remain eligible without fabricated results

#### Scenario: Model changes
- **WHEN** the runtime artifact digest differs from the selected configuration
- **THEN** incompatible generation stops with a clear error and prior vectors remain intact

### Requirement: Independent existing-group matching
Matching SHALL compare each selected group definition with eligible current course vectors under one configuration, applying an explicit experimental cosine minimum before a result limit. It SHALL allow a course to match multiple groups, use stable tie-breaking and work without discovery results or existing group members.

#### Scenario: Overlapping group scope
- **WHEN** a course qualifies independently for two selected groups
- **THEN** both course/group candidates are retained rather than choosing one exclusive group

#### Scenario: Empty group or no match
- **WHEN** a selected group has no members or no courses above the minimum
- **THEN** matching still executes and returns the actual eligible results, including zero without filler

### Requirement: Overlapping course discovery
Discovery SHALL operate on eligible course vectors independently of group vectors and preserve meaningful overlap between candidate sets. It SHALL record the neighborhood and coherence criteria, algorithm version and parameters, permit ungrouped courses and reject similarity chains that fail the configured coherence criteria.

#### Scenario: Shared course across topics
- **WHEN** two coherent candidate sets share a course but differ substantially in their remaining members
- **THEN** the output preserves both sets and identifies their shared course

#### Scenario: Bridge course
- **WHEN** one broad course connects otherwise dissimilar neighborhoods
- **THEN** reachability alone does not merge those neighborhoods into a single proposed group

#### Scenario: Already assigned course
- **WHEN** a course already belongs to a source group
- **THEN** that membership alone does not exclude it from discovery of another useful group

### Requirement: Discovery reconciliation with existing groups
Discovery results SHALL include candidate existing-group matches, member-level supporting scores and coverage under explicit experimental criteria. A nearby group SHALL NOT cause blanket assignment. Results SHALL distinguish potentially covered sets, partial coverage, ambiguous group matches and sets without qualifying existing groups; unreviewed coverage SHALL remain provisional.

#### Scenario: Partial existing coverage
- **WHEN** an existing group matches only part of a discovered set
- **THEN** the lab exposes the matching and unmatched members and does not label the whole set covered

#### Scenario: No existing group
- **WHEN** a coherent set has no qualifying existing group
- **THEN** it appears as an experimental new-group candidate with an optional title, without creating a catalog group

### Requirement: Reproducible bounded run artifacts
Each run SHALL retain dataset identity, selected entities and exclusions, exact vector/input references, algorithm and scoring parameters, completion state, omissions, timings and results. Identical computation identities SHALL reuse completed results; partial failures SHALL remain explicit. Processing SHALL have bounded memory, output and cancellation behavior for a 10,000-course evaluation target.

#### Scenario: Repeat settings
- **WHEN** the same computation is requested with identical inputs, vectors, scope and settings
- **THEN** the completed artifact is reused without duplicate discovery candidates or inference

#### Scenario: Missing vectors or cancellation
- **WHEN** a run encounters missing vectors or is cancelled
- **THEN** it reports incomplete work and exclusions, retains valid completed artifacts and never labels partial results as complete

### Requirement: Stable experimental identity and score meaning
Candidate identities SHALL derive from run identity and canonical entity IDs. Cross-run overlap SHALL be inspectable without treating cluster labels as stable catalog identities. Similarity SHALL be displayed as a raw score, not calibrated confidence or proof of suitability. Imported memberships SHALL NOT serve as complete ground truth.

#### Scenario: Set changes between runs
- **WHEN** a parameter change splits a set or changes its members
- **THEN** both runs remain inspectable with member differences and earlier labels are not silently copied to the new set

#### Scenario: High cosine
- **WHEN** a candidate has high cosine similarity
- **THEN** it remains an experimental candidate requiring review rather than an approved course/group relationship
