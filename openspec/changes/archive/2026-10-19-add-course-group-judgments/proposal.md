# Proposal

## Why

Dorob's selected course-group page has a fixed presentation, but no backend contract lets a future judge read a complete group's retained evidence and submit the text, tags and ordering that fill it. Establish that contract before implementing the judge or connecting judgments to public pages.

## What Changes

- Add local management endpoints to discover groups, read revision-consistent group/course evidence, and submit/read immutable judgments.
- Include retained course comments and reviews, with their original item classification and collection coverage, in paginated judge evidence reads. Never silently drop comments or claim complete feedback when collection was partial.
- Standardize a versioned judgment body containing hero text and an ordered array of course IDs with four permitted tags and Persian strengths/weaknesses. Exclude group IDs/slugs from generated content, provider facts, layout instructions, scores, positions and ranking reasons.
- Make the AI responsible for ordering under «اولویت با دوره‌هایی است که ارزش یادگیری بیشتر و قیمت کمتری دارند». Price is considered alongside learning value; expensive, high-value courses may lead and carry the expensive badge.
- Bind submissions to exact group/member/source revisions; reject stale or incomplete judgments and provide safe idempotent retries and retained readback.
- Preserve category ownership, provider facts, editorial memberships and publication. Return backend metadata separately from generated content.
- Document these contracts in Swagger and browser-safe shared types/validators. Persist judgments with an additive migration.
- Do not implement AI execution, prompts/provider SDKs, scheduling, numerical ranking formulas, frontend rendering, public judgment endpoints, or judgment approval/publication workflows.

## Capabilities

### New Capabilities

- `course-group-judgments`: Revision-consistent judge inputs and durable, validated group judgments whose AI-owned text, tags and ordering can support future frontend pages.

### Modified Capabilities

None. Existing category, public catalog, group curation, suggestion and embedding APIs retain their behavior. The historical draft `docs/course-group-ai-assessment.md` contains an unaccepted deterministic-scoring proposal; this change instead follows the owner's explicit AI-ordering decision and four-tag vocabulary. Its evidence/privacy guidance remains useful, but conflicting output, badge and ranking proposals are not adopted.

## Impact

Implementation will affect `packages/core` contracts/exports, new API judgment source/repository/routes modules, `apps/api/src/app.ts`, the next available additive SQL migration, API/core tests and backend documentation. It reuses current groups, memberships, canonical course IDs, v3 observations and Bun/PostgreSQL/Elysia patterns. No frontend changes or new external dependencies are required. Local management remains trusted and loopback-only; caller attribution does not establish verified AI identity or quality.
