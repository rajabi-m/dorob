# embedding-experiment-workbench Specification

## Purpose

Let Dorob's owner inspect real local embedding experiments, compare grouping behavior and retain review evidence in a Persian interface before deciding on application integration.

## Requirements

### Requirement: Standalone Persian experiment interface
The workbench SHALL be separate from public pages and the main admin panel, identify itself as experimental, and use Persian language, RTL layout, accessible controls and responsive content. Latin model identifiers and hashes SHALL be isolated and display numbers and dates SHALL follow Persian conventions.

#### Scenario: Narrow screen and keyboard use
- **WHEN** a keyboard user inspects long Persian course titles and Latin model identifiers at a narrow viewport
- **THEN** content remains readable, controls have visible focus and the page has no unintended horizontal overflow

### Requirement: Explicit execution and saved-result browsing
Users SHALL explicitly select a dataset, configuration, operation and parameters before starting generation or experiments. The UI SHALL show progress, cancellation, missing prerequisites and actionable failures. Saved results SHALL remain readable after restart without a backend or inference service.

#### Scenario: Inference unavailable
- **WHEN** Ollama is unavailable but a completed run exists
- **THEN** the user can inspect that run and cached-vector experiments remain available while new generation shows an actionable error

#### Scenario: Open dataset with missing vectors
- **WHEN** a user selects matching without all required vectors
- **THEN** the UI shows coverage and requires generation or explicit partial execution rather than silently generating vectors

### Requirement: Inspect existing-group candidates
The UI SHALL offer group selection, experimental minimum/limit controls and ranked course candidates showing provider identity, raw similarity, retained educational facts, source references and embedding coverage. It SHALL distinguish imported memberships and local review labels from new suggestions without writing to the production inbox.

#### Scenario: Inspect a borderline course
- **WHEN** the user opens a candidate near the selected minimum
- **THEN** the UI exposes its source facts and exact embedding input alongside the group's scope without inventing a suitability explanation

### Requirement: Inspect discovered groups and overlaps
Users SHALL inspect discovered sets, representative courses, member lists, shared members, coherence measures and candidate existing-group matches. Results SHALL distinguish potentially covered, partially covered, ambiguous and novel sets. Titles SHALL be optional and unnamed sets SHALL have understandable local labels.

#### Scenario: Shared member
- **WHEN** a course appears in two discovered sets
- **THEN** the user can inspect both memberships and the sets' distinct members without an exclusive placement rule

#### Scenario: No proposed title
- **WHEN** a coherent set has no title
- **THEN** its member count, representatives and inspection controls remain available without invoking a naming model

### Requirement: Compare reproducible runs
The UI SHALL compare two saved runs with visible dataset/model/input/algorithm identities, parameters, coverage and completion states. Same-dataset comparisons SHALL expose candidate additions/removals and discovered-set member overlap, splits and merges. Different datasets or configurations SHALL have explicit comparability warnings without presenting raw scores as a universal scale.

#### Scenario: Threshold changes
- **WHEN** two runs differ in their discovery or matching thresholds
- **THEN** the user can see changed candidates and set memberships, not only aggregate counts

#### Scenario: Dataset changes
- **WHEN** the selected runs use different datasets
- **THEN** the UI identifies added/missing source entities and does not attribute every result change to the algorithm

### Requirement: Persistent local review feedback
Users SHALL label a course/group candidate or discovered set as suitable, unsuitable or uncertain, with an optional note. Feedback SHALL retain target/run identity and revision history across restarts. Feedback SHALL NOT approve catalog membership, rewrite source data or silently become training data or labels for changed candidates.

#### Scenario: Revise feedback
- **WHEN** the user changes a label from uncertain to suitable
- **THEN** the lab preserves both review events and shows the latest effective label for that exact target

#### Scenario: Candidate changes
- **WHEN** a later run changes a discovered set's membership
- **THEN** earlier feedback remains attached to its original target and is available as prior context rather than a new approval

### Requirement: Honest review summaries
Review summaries SHALL distinguish positive, negative, uncertain and unreviewed results, expose denominators and identify selection bias. They SHALL NOT report recall without a defined labelled reference set or treat unreviewed courses as negatives. Software completion SHALL NOT imply the model has met a production quality target.

#### Scenario: Only top results reviewed
- **WHEN** the user has labelled only a displayed subset of candidates
- **THEN** any acceptance rate is labelled as applying to that reviewed subset with its counts, without claiming catalog-wide precision or recall

### Requirement: Portable evidence export
Users SHALL export a versioned local evidence bundle containing dataset provenance, selected educational inputs, configuration identity, run settings/results and feedback. Export SHALL preserve identifiers and missing-data metadata, exclude credentials and support validated reimport without catalog writes. Large vector arrays SHALL be an explicit optional addition.

#### Scenario: Reopen exported results
- **WHEN** a valid evidence bundle is imported into a fresh lab workspace
- **THEN** results and review provenance remain inspectable without regenerating embeddings or connecting to the application

#### Scenario: Invalid bundle
- **WHEN** an import has invalid references, incompatible versions or a checksum mismatch
- **THEN** the lab rejects it clearly without replacing existing datasets or feedback

### Requirement: Local-only control boundaries
The server SHALL bind to loopback and restrict local writes to validated same-origin operations within its configured artifact directory. The browser SHALL NOT receive application credentials or choose arbitrary filesystem paths. Dataset source text SHALL render as text rather than executable markup.

#### Scenario: Unexpected write origin
- **WHEN** another origin attempts to start inference or change feedback
- **THEN** the request is rejected and no work or artifact mutation occurs
