# Dorob documentation

Phase 1 is accepted and phase 2 is complete for now (October 4, 2026). Phase 3 architecture is ready for local implementation; backend code/integration remain pending. This hub links every maintained project document; dated history is separate from current status.

## Start here

- [README](../README.md): setup, commands, implemented routes, and workspace layout.
- [Project plan](../Plan.md): phase status, confirmed decisions, roadmap, and follow-ups.
- [Contributor instructions](../AGENTS.md): scope, commit policy, and required validation.
- [Validation and limitations](validation.md): current checks, build blocker, and review coverage.

## Frontend and design

- [Design system](design-system.md): accepted visual direction, tokens, components, and accessibility behavior.
- [Frontend](frontend.md): merged homepage decisions and Python group prototype, including superseded design history.
- [Provider snapshots](provider-snapshots.md): merged fixture conventions, cover/logo attribution, and collection report.

## Data and future integration

- [Backend implementation handoff](backend.md): selected stack, comparison-first scope, persistence/workflow contracts, local milestones, and acceptance checks.
- [Backend flow diagram](backend-flow.html): browser-rendered Mermaid proposal with zoom controls and embedded source; requires internet access.
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
