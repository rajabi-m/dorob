# catalog-embedding-worker Specification

## Purpose

Run explicitly selected local embedding jobs from a terminal through backend APIs while preserving versioned evidence, compatible vectors and recoverable progress.

## Requirements

### Requirement: Finite CLI execution through backend APIs
The worker SHALL call backend HTTP APIs for catalog inputs, embeddings, operations and results without direct SQL/database credentials. Explicit commands SHALL execute generation, matching, discovery or combined matching/discovery, show terminal progress and exit. No idle daemon or automatic trigger SHALL start work.

#### Scenario: Run a selected job
- **WHEN** the owner invokes matching or discovery
- **THEN** the CLI registers the operation, shows its ID/stage/counts and outcome, and exits without waiting for unrelated jobs

#### Scenario: Ordinary catalog activity
- **WHEN** ingestion, editing, page reads or service startup occurs
- **THEN** no embedding job or inference starts

#### Scenario: Backend is unavailable
- **WHEN** a CLI operation cannot reach the backend
- **THEN** it reports a bounded failure without directly reading or writing PostgreSQL

### Requirement: Independent generation and explicit scope
Generation-only SHALL generate/reuse embeddings without matching, discovery or suggestions. Applicable commands SHALL support whole-catalog default scope and optional course/group selection, preserve exclusions and reject oversized scopes before inference.

#### Scenario: Generate group embeddings only
- **WHEN** the owner selects groups with generation-only
- **THEN** only their eligible definitions are embedded and no candidates or suggestions are produced

#### Scenario: Select a subset
- **WHEN** a matching command selects course and group IDs
- **THEN** only that bounded course/group scope is evaluated, with exclusions recorded

### Requirement: Durable requests and fenced ownership
The backend SHALL retain request identities, attempt history, stage/count progress and outcomes, allowing only one active embedding execution. Conflicting replay or ownership SHALL return 409. Mutations SHALL require active fenced ownership; lost ownership SHALL stop further commits.

#### Scenario: Lost HTTP response
- **WHEN** an identical start or vector/result batch is retried
- **THEN** the original outcome is returned without duplicate operations or revisions

#### Scenario: Competing clients
- **WHEN** two CLIs attempt execution concurrently
- **THEN** at most one owns execution and the other receives a conflict

#### Scenario: Lease expires
- **WHEN** the worker or backend crashes during a job
- **THEN** the expired attempt is interrupted, committed evidence survives and inference waits for explicit retry

### Requirement: Explicit recovery cancellation and progress
Status/cancel/retry commands SHALL read persisted progress and control attempts. Retry/resume SHALL retain finalized frozen inputs; refresh SHALL capture new inputs. Cancellation SHALL abort inference and stop bounded work, disclosing committed deliveries. No interrupted attempt SHALL silently resume.

#### Scenario: Retry versus refresh
- **WHEN** the owner retries a failed operation and separately requests a fresh run
- **THEN** retry preserves its manifest and refresh creates a new manifest

#### Scenario: Cancel an active job
- **WHEN** Ctrl-C or another CLI requests cancellation
- **THEN** the client aborts work, requests cancellation, reports its confirmed or unavailable state and preserves accepted vectors/deliveries

#### Scenario: Delivery-only retry
- **WHEN** computation completed before delivery failed
- **THEN** explicit retry sends remaining results without regenerating or recomputing

### Requirement: Frozen educational inputs
The backend SHALL freeze course snapshot references, group definitions, educational input identities, scope and exclusions before inference. Group inputs SHALL use their own definitions rather than assigned courses. Missing/sparse data SHALL be recorded; the protected test group SHALL be excluded.

#### Scenario: Catalog changes mid-run
- **WHEN** ingestion replaces source facts during generation
- **THEN** the run retains frozen references and discloses changed educational currentness

#### Scenario: Commercial change
- **WHEN** only price, image, instructor, collection time or membership changes
- **THEN** educational identity and compatible embedding reuse remain unchanged

#### Scenario: Sparse or protected entity
- **WHEN** a title-only course or the protected group is requested
- **THEN** it is excluded with an inspectable reason and receives no fabricated embedding/result

### Requirement: Versioned pgvector embedding storage
The backend SHALL store immutable pgvector embedding revisions linked to entity, source/input hash, processing version, model name, exact digest, dimensions and generation time. Existing catalog facts and memberships SHALL remain unchanged. Newer revisions SHALL NOT overwrite historical vectors or run references.

#### Scenario: Educational content changes
- **WHEN** a subsequent explicit run sees substantive course or group input changes
- **THEN** a new embedding revision is generated while the old one and its evidence remain inspectable

#### Scenario: No destructive setup
- **WHEN** pgvector is enabled over an existing catalog
- **THEN** catalog/review data survives a tested same-major PostgreSQL setup and additive migrations

### Requirement: Compatible reuse and forced regeneration
Normal generation SHALL reuse an accepted compatible revision. Explicit force regeneration SHALL create a new immutable revision even for unchanged content/model; replay SHALL return that same revision. Successful acceptance SHALL select a preferred revision without changing revisions frozen into prior runs.

#### Scenario: Force twice versus replay
- **WHEN** a forced generation is replayed and later a distinct forced operation is requested
- **THEN** replay returns its existing revision and the distinct operation creates another revision

#### Scenario: Generation fails
- **WHEN** a forced attempt returns invalid vectors
- **THEN** the earlier valid preferred revision remains usable

### Requirement: Exact model and representation compatibility
Comparison SHALL require matching model digest, dimensions and compatible input/chunk/pooling versions, not merely equal model names. Generation SHALL verify installed local model identity and reject changed digest, wrong count/dimension, non-finite/zero vectors or silent truncation, without remote fallback/downloads.

#### Scenario: Same alias different model
- **WHEN** two vectors have the same model name but different digests
- **THEN** they are not compared or pooled together

#### Scenario: Model changes mid-batch
- **WHEN** the installed digest changes during inference
- **THEN** the batch is rejected without altering previously accepted revisions

#### Scenario: Policy changes only
- **WHEN** threshold or neighborhood settings change
- **THEN** compatible vectors remain reusable while computation identity changes

### Requirement: Provisional independent matching
Initial exact matching SHALL retain raw course-to-group cosine >=0.60 before a default per-group limit of 20, with canonical-ID ties. Several groups can qualify; empty drafts use their own definitions. Discovery and existing memberships SHALL NOT boost scores.

#### Scenario: Boundary rounding
- **WHEN** raw scores are .59999 and .60
- **THEN** only .60 qualifies regardless of percentage display rounding

#### Scenario: Independent groups
- **WHEN** a course qualifies for two selected groups
- **THEN** both candidates remain available without exclusive placement

### Requirement: Bounded immutable evidence and partial coverage
Runs SHALL retain exact vector revisions, input/configuration/settings, coverage, timings and immutable results. Processing SHALL bound scope, resident storage, batches and computation time. Incomplete output SHALL NOT claim complete coverage; partial delivery SHALL require explicit selection.

#### Scenario: Candidate/time cap
- **WHEN** a computation reaches its disclosed cap
- **THEN** coverage/exclusions and incomplete state remain visible; no unrequested partial delivery occurs

#### Scenario: Reuse completed computation
- **WHEN** all frozen vector revisions and computation inputs match a completed run
- **THEN** its immutable results are reused without duplicate candidates

#### Scenario: Regenerated vector selected
- **WHEN** a fresh operation selects a new forced embedding revision
- **THEN** it does not silently reuse results computed from the old revision

### Requirement: Laboratory separation
Application runtime SHALL use application-owned APIs, persistence and algorithms without importing the lab workspace or automatically consuming its files. Lab commands, evidence and feedback SHALL remain independent.

#### Scenario: Install application integration
- **WHEN** application migrations and worker commands are introduced
- **THEN** the lab still runs independently and its feedback does not become catalog approval
