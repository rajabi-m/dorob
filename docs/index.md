# Dorob documentation

Phase 1 is accepted and phase 2 is complete for now (October 4, 2026). Phase 3 begins with the independent local API/PostgreSQL bootstrap; product integration remains pending. This hub links every maintained project document; dated history is separate from current status.

## Start here

- [README](../README.md): setup, commands, implemented routes, and workspace layout.
- [Project plan](../Plan.md): phase status, confirmed decisions, roadmap, and follow-ups.
- [Contributor instructions](../AGENTS.md): scope, commit policy, and required validation.
- [Validation and limitations](validation.md): current checks, build blocker, and review coverage.
- [Backend setup](../README.md#backend-development): API, PostgreSQL, local Swagger, configuration, and lifecycle commands.

- [Backend foundation archive](../openspec/changes/archive/2026-10-09-introduce-backend-project/): completed proposal, design, delta specs, and 12 tasks.
- Main backend contracts: [HTTP service](../openspec/specs/backend-service/spec.md) and [database connectivity](../openspec/specs/database-connectivity/spec.md).

## Frontend and design

- [Design system](design-system.md): accepted visual direction, tokens, components, and accessibility behavior.
- [Frontend](frontend.md): merged homepage decisions and Python group prototype, including superseded design history.
- [Provider snapshots](provider-snapshots.md): merged fixture conventions, cover/logo attribution, and collection report.

## Data and future integration

- [Previous backend lessons](../old-backend.md): useful product decisions, reusable evidence/reliability patterns, historical code references and limits for the OpenSpec restart.

- [Utility README](../apps/utils/README.md): adapter/export commands, backend imports, and local dashboard setup.
- [Provider adapters](provider-adapters.md): merged provider selection and all four provider mappings, feedback coverage, and limitations.
- [Course data format](course-data-format.md): implemented version-2 golden contract and provenance rules.
- [Course group assessment](course-group-ai-assessment.md): proposed analyzer inputs/outputs, ranking, badges, and evidence policies.
- [Production scraping proposal](scrape-spec.md): proposed phase 3 refresh, storage, failure recovery, and operational readiness.

## History and development resources

- [Project history](project-history.md): dated milestones, superseded decisions, and original validation results.
- [Frontend design skill](../.agents/skills/frontend-design/SKILL.md): local visual design guidance.
- [RTL design skill](../.agents/skills/rtl-design/SKILL.md): Persian/RTL rules and static audit workflow.

Frontend fixtures and standalone scraper exports have different contracts. Production scraping and AI assessment documents describe future work; their presence does not activate phase 3.
