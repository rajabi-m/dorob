# Proposal

## Why

Dorob needs evidence that local embeddings produce useful course/group suggestions and discover useful new groups before integrating them into the catalog. An independent interactive experiment lets the owner inspect real results, compare settings and record feedback without changing application data.

## What Changes

- Replace this change's unimplemented production-integration plan with a standalone local embedding laboratory. Keep the existing change ID for continuity; it now describes an evaluation product, not catalog suggestion submission.
- Import a dated, frozen dataset of real course observations and editorial groups through existing read-only management APIs or a validated local export. Record provenance, exclusions and incomplete reads; subsequent experiments work offline from the saved dataset.
- Generate actual local Ollama embeddings, initially using BGE-M3, and cache them in versioned local files. Reuse unchanged educational inputs and preserve configurations side by side.
- Offer two independent experiments: direct course-to-existing-group matching, allowing several groups per course; and discovery of coherent, overlapping course neighborhoods, followed by matching to existing groups.
- Provide a Persian RTL interface for inspecting source facts and inputs, adjusting parameters, examining discovered sets and overlaps, comparing saved runs and recording suitable/unsuitable/uncertain feedback.
- Retain immutable run outputs and exportable dataset/model/input/algorithm provenance, candidate identities and feedback. Scores are experimental similarity, not calibrated confidence or verified suitability.
- Remove the earlier planned pgvector migration, production embedding APIs, suggestion score-schema changes and main admin integration from this change. Existing main behavior contracts remain unchanged.
- Defer schedules, automatic catalog writes, main-app integration, generative naming/judging, remote inference and mandatory 2D/3D visualization. A separate change will implement product integration after owner review of measured results.

## Capabilities

### New Capabilities

- `local-embedding-experiments`: Frozen catalog datasets, real cached local embeddings, independent matching and overlapping discovery experiments, and reproducible file-based results.
- `embedding-experiment-workbench`: A standalone Persian interface to run and inspect experiments, compare outcomes, retain evaluation feedback and export evidence.

### Modified Capabilities

None. Existing catalog, ingestion, editorial memberships, suggestions and admin contracts are not modified.

## Impact

Implementation is proposed under a new `apps/embedding-lab` workspace with Bun/TypeScript orchestration, a local React interface, a loopback server and ignored file-based datasets/caches/runs. Root scripts and documentation will add explicit laboratory commands; browser-safe existing core contracts and visual foundations can be reused without importing production server code. No changes to Compose, PostgreSQL schema, main management routes, public pages or the production suggestion inbox are required. No inference, export or application implementation runs during this planning update.
