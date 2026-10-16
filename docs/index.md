# Dorob documentation

Phase 1 is accepted and phase 2 is complete for now (October 4, 2026). Phase 3 includes the independent local API/PostgreSQL foundation and manual curated catalog APIs; frontend integration remains pending. This hub links every maintained project document; dated history is separate from current status.

## Start here

- [README](../README.md): setup, commands, implemented routes, and workspace layout.
- [Project plan](../Plan.md): phase status, confirmed decisions, roadmap, and follow-ups.
- [Contributor instructions](../AGENTS.md): scope, commit policy, and required validation.
- [Validation and limitations](validation.md): current checks, build blocker, and review coverage.
- [Curated catalog](catalog.md): migrations, canonical identity, manual groups, public eligibility, and local management.
- [Initial course-group curation](curation/initial-course-groups.md): verified backup, complete existing-course inventory, evidence-based draft definitions, category coverage and persistence ledger.
- [Empty course-group drafts](curation/empty-course-group-drafts.md): 12 unpublished editorial scopes, persisted IDs, preservation checks and backup recovery instructions.
- [Backend setup](../README.md#backend-development): API, PostgreSQL, local Swagger, configuration, and lifecycle commands.

- [Backend foundation archive](../openspec/changes/archive/2026-10-09-introduce-backend-project/): completed proposal, design, delta specs, and 12 tasks.
- [Curated catalog archive](../openspec/changes/archive/2026-10-10-add-curated-course-groups/): completed proposal, design, delta specs, and 18 tasks; category and curation contracts are synced to main specs.
- Main backend contracts: [HTTP service](../openspec/specs/backend-service/spec.md) and [database connectivity](../openspec/specs/database-connectivity/spec.md).

## Frontend and design

- [Design system](design-system.md): accepted visual direction, tokens, components, and accessibility behavior.
- [Frontend](frontend.md): merged homepage decisions and Python group prototype, including superseded design history.
- [Provider snapshots](provider-snapshots.md): merged fixture conventions, cover/logo attribution, and collection report.

## Data and future integration

- [Previous backend lessons](../old-backend.md): useful product decisions, reusable evidence/reliability patterns, historical code references and limits for the OpenSpec restart.

- [Utility README](../apps/utils/README.md): collector/export commands, backend imports and explicit ingestion.
- [Provider field audits](provider-audits/): current native v3 evidence and source/live limitations for TopLearn, Sabzlearn and Roocket.
- [Provider adapters](provider-adapters.md): merged provider selection and all four provider mappings, feedback coverage, and limitations.
- [Course data format](course-data-format.md): implemented version-2 golden contract and provenance rules.
- [Course group assessment](course-group-ai-assessment.md): proposed analyzer inputs/outputs, ranking, badges, and evidence policies.
- [Production scraping proposal](scrape-spec.md): proposed phase 3 refresh, storage, failure recovery, and operational readiness.

## History and development resources

- [Project history](project-history.md): dated milestones, superseded decisions, and original validation results.
- [Frontend design skill](../.agents/skills/frontend-design/SKILL.md): local visual design guidance.
- [RTL design skill](../.agents/skills/rtl-design/SKILL.md): Persian/RTL rules and static audit workflow.

Frontend fixtures and standalone scraper exports have different contracts. Production scraping and AI assessment documents describe future work; their presence does not activate phase 3.
