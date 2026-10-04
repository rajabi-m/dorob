# Backend architecture and implementation handoff

Updated October 4, 2026. Phase 3 milestone 1 now has an offline implementation: Bun HTTP service and operator CLI in `apps/backend`, separate Bun worker in `apps/worker`, database migrations, saved-export imports and deterministic factual groups. The owner requested separate backend/worker Docker containers, superseding the earlier Next.js-only backend boundary. See [backend operations](backend-operations.md) for actual commands/limits and [validation](validation.md) for measured results. Bounded manual provider ingestion is implemented and tested offline; no new live provider collection, AI or frontend integration is claimed.

Open the [backend flow diagram](backend-flow.html) in a browser for the proposed pipeline, including unmatched-course retrieval, review, assessment, publication, and updates. The HTML contains the Mermaid source for humans and AI to inspect; rendering requires internet access to load pinned Mermaid 11.17.2 from jsDelivr. The flow is a proposal, not an implemented architecture.

## Start here: selected stack

| Area | Selected decision |
| --- | --- |
| Language/runtime | TypeScript and Bun; preserve the existing Bun workspace and lockfile. |
| Visitor-facing backend | Separate Bun HTTP service in `apps/backend`, owner-requested October 4; Next.js remains the frontend. |
| Database | PostgreSQL. |
| Queries/migrations | Drizzle ORM and Drizzle Kit; commit reviewed SQL migrations. |
| Background work | pg-boss with a separate Bun worker process. |
| Operational dashboard | `@pg-boss/dashboard`, local/private, using a compatible pg-boss schema version. |
| Dense retrieval storage | pgvector in PostgreSQL; no separate vector database. |
| Classification/membership | Jev through OpenRouter. |
| Generative LLM access | OpenRouter; exact model IDs remain configurable and unselected. ChatGPT subscription access is outside this implementation. |
| Environment | Local development first. Later deployment to a platform such as Hamravesh is a candidate, not a selected hosting contract. |

Selected choices above are owner decisions. The implementation defaults below make work actionable without claiming that provisional model, ranking, or refresh policies have been approved. Select compatible stable dependency versions at implementation time, verify Bun support, and record versions and checks. Do not silently replace Bun or introduce another service.

## Runtime boundaries and workspace

The Bun HTTP backend serves stored, manually published group facts. Next.js will consume explicit public DTOs in a later integration milestone; it currently still uses saved fixtures. Do not send scraping or model work through a visitor's request.

The worker currently consumes deterministic pg-boss jobs and saves factual snapshots; bounded Maktabkhooneh/Roocket ingestion is implemented; OpenRouter workflows follow later. Backend and worker are separate images and processes with independent lifecycles, capable of running on different cloud hosts sharing PostgreSQL. No process embeds or launches a worker during a visitor request.

Target structure, creating packages only as each milestone needs them:

```text
apps/backend/         Bun HTTP service, operator CLI, backend tests
apps/worker/           Bun job handlers, scheduling, and operator commands
apps/utils/            Existing provider adapters and export utilities
packages/core/        Browser-safe domain DTOs and boundary validation
packages/db/          Server-only Drizzle schema, database access, SQL migrations
packages/backend/     Server-only shared queue, model clients, and domain services
```

Keep `packages/db`, `packages/backend`, and adapter imports out of browser bundles. The existing `apps/utils/scrapers/course.ts` contains Node crypto and server-side helpers: do not re-export that module wholesale from `packages/core`. Reuse its validation/hashing on the server and expose public DTOs through explicit mappings. Read `apps/web/AGENTS.md` and the installed Next.js guides before editing web code.

## Product purpose

Dorob helps people compare similar courses and choose one that fits their learning needs. The initial release focuses on useful comparisons rather than becoming a comprehensive course search engine.

Google and provider catalogs help people discover course pages. Dorob adds value by organizing suitable alternatives and explaining their differences using comparable facts, educational content, prerequisites, price/access terms, and traceable analysis.

The core promise is: **Compare similar courses and choose the one that fits your needs.** Comparison quality takes priority over catalog size. Enrollment, payment, and studying happen on the provider's website.

## User journeys

| Entry point | Journey | Backend implication |
| --- | --- | --- |
| Google | A person searches for a Python course, lands directly on a Dorob comparison group, compares alternatives, and visits a provider. | Stable public group URLs and content that the frontend can render for indexing. Group content must make sense without first visiting the homepage. |
| Category browsing | A person opens Dorob, browses a category such as management, chooses a group, and selects a course. | Categories organize published comparison groups. |
| Internal search | A person searches within Dorob for a subject and opens a relevant comparison group. | Initial search discovers groups; a general standalone course-search experience is outside the initial scope. |

Titles such as “best Python course” must be supported by explicit comparison criteria and qualifications. There need not be one universal winner: different courses can suit different learners and outcomes.

## Topics, levels, and comparison groups

A category is a broad browsing destination, such as management or programming. A topic identifies the subject being learned, such as Python or n8n. A comparison group brings together courses that offer meaningful alternatives for a learning need.

- Topic is required for published course membership. Level is optional.
- Use topic plus level to refine groups when the distinction is useful and supported by evidence, such as beginner Python.
- Do not force level-based groups onto topics such as n8n when available evidence does not justify them.
- Unknown level does not mean beginner or suitable for every level. An explicit multi-level course is different from a course whose level is unknown.
- Preserve the provider's stated level separately from any normalized classification or AI-estimated level. Label inference clearly.
- Sharing a topic is necessary but not sufficient for comparability. Prerequisites, intended outcomes, scope, and access conditions can make two same-topic courses unsuitable alternatives.

Exact taxonomy and membership rules remain product policies to resolve. The implementation default is a membership relation that permits multiple groups without automatically accepting any assignment. Public routes and the relationship between broad topic destinations and narrower group pages also remain open; existing frontend routes are prototypes, not a final backend contract.

## Publication and launch scope

Publish comparison groups with at least two meaningfully comparable courses. A collected course without suitable peers can remain in the internal dataset until a useful group can be formed; collecting a course does not automatically publish it.

Individual course details support the comparison journey. We are not committing to public standalone listings for unmatched courses or a complete provider catalog.

At least two candidates allow factual comparison, but do not automatically justify a rank or winner. Insufficient evidence should lead to qualified, unranked presentation rather than invented judgments. The initial policy for a published group that loses comparable members is described under workflow reliability below.

Initial scope includes category browsing, group discovery/search, comparison pages, supporting course details, and outbound provider links. Accounts, favorites, alerts, user reviews, personalized learning agents, enrollment, payments, and course hosting are deferred.

## Backend responsibilities

The backend should support these capabilities; the eventual architecture will decide which services and components implement them.

1. **Collect and retain evidence.** Reuse the existing provider adapters where suitable. Preserve stable course identifiers, source URLs, observations, extraction coverage, and exact input revisions needed to explain comparisons.
2. **Normalize course facts.** Keep original provider evidence alongside normalized values. Distinguish free, paid, subscription, and unknown offers; never interpret missing data as zero, empty, or poor quality.
3. **Manage classification and publication.** Maintain categories, topics, optional levels, group definitions, candidate membership, and publication decisions. Support review and correction of uncertain assignments.
4. **Assess and compare.** Use available syllabi and metadata to explain fit, coverage, practice, access, and supported tradeoffs. Keep provider facts, AI-derived output, and editorial decisions separate.
5. **Serve the frontend.** Supply published group discovery, category browsing, group comparisons, and supporting course facts. Agree precise endpoints, filtering, sorting, and pagination when defining contracts.
6. **Refresh and recover.** Track freshness and failures, avoid duplicate ingestion, and refresh affected comparisons when evidence, membership, or policies change. Collection and AI work should run outside visitor requests.

Facts should remain usable when AI assessment fails. Missing information, partial extraction, stale observations, and unsupported comparisons must remain visible rather than being silently replaced with guesses.

## AI roles and selected decision model

**Jev is selected for course classification and existing-group membership decisions.** The owner has tested Jev with Persian content and reports good results. This resolves the earlier concern about its suitability for Persian as a starting choice; the test dataset, metrics, and production thresholds have not yet been documented. GPT-6 Luna is no longer the proposed default for these two roles.

| Pipeline step | Model or method | Decision status |
| --- | --- | --- |
| Scraping, normalization, deduplication, and change detection | Existing adapters and deterministic code | Reuse current groundwork; production operations remain to be specified. |
| Category/topic classification and optional level classification | Jev Choice over defined options, including no-fit/unknown outcomes | Jev selected; taxonomy and question contracts remain open. |
| Existing-group membership | Jev through OpenRouter, using focused Noul checks for topic fit, compatible prerequisites, intended outcomes, and level where applicable; combine decisions in code | Jev selected; criteria, thresholds, and uncertain-case routing remain open. |
| Dense retrieval | `text-embedding-3-large` | Proposed candidate, not selected. |
| Sparse retrieval | PostgreSQL lexical search for the first milestone | Implementation default: normalized tokens using the `simple` text-search configuration, with explicit Persian/Latin aliases. BM25 remains a possible later upgrade; PostgreSQL full-text ranking must not be described as BM25. |
| Validation of retrieved unmatched courses | Focused Jev comparability checks | Proposed extension of the decision role, to evaluate before adoption. |
| New-group definition and comparison criteria | Generative model, with human approval of new groups initially | GPT-6.1 Sol is a proposed candidate; final model and review policy remain open. |
| Course evidence assessment, comparison analysis, and Persian explanations | Generative model | GPT-6.1 Sol is a proposed candidate; final selection requires evaluation. |
| Claim review | Separate generative review plus deterministic evidence/schema checks | Proposed; model review does not independently prove a claim. |
| Price calculations, ranking/badge rules, publication gates, and page rendering | Deterministic code under agreed policies | Model decisions and analysis are inputs; application code controls publication. |

Jev selects or evaluates supplied options; it does not author new group definitions, comparison prose, or page layouts. For membership, ask distinct questions rather than hiding all eligibility rules inside one broad judgment. Retrieval finds candidates; Jev checks their fit against the group's definition. A no-fit decision must be distinct from insufficient evidence or uncertainty, so uncertain courses are not automatically treated as proof that a new group is needed.

Preserve unknown level and explicitly multi-level coverage as separate outcomes. Store Jev outputs as derived classification/membership records, with the course input revision, group definition revision, model version, question/criteria version, and applicable decision policy. Keep them separate from provider facts and from generative assessments.

Before production, document the owner's Persian examples and extend them into a reviewed evaluation set covering overlapping topics, unknown levels, incomplete syllabi, and misleading titles. Set automatic acceptance, rejection, and review thresholds from observed results. Jev confidence summarizes its returned distribution; it is not a guarantee of correctness. Pin the evaluated model version and recheck thresholds when changing it. No live Jev integration is introduced by this documentation update.

Official references: [TypeSafe introduction](https://docs.typesafe.ai/introduction), [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [confidence](https://docs.typesafe.ai/confidence), and [model specifications](https://docs.typesafe.ai/models). These describe model capabilities; the role assignments above are Dorob's decisions and proposals.

## Persistence and contracts

Use relational identities, constraints, memberships, and lifecycle fields, with JSONB for retained version-2 facts and validated structured model outputs. Keep the first schema focused; do not flatten every optional scraper field into its own table.

| Record | Required responsibility |
| --- | --- |
| Providers and source courses | Provider registry, stable provider/course identity, canonical URL, current successful revision, availability and last observation. Enforce unique source identity. |
| Course revisions and observations | Immutable validated facts, content hash, selected normalization evidence, and source locators. Record successful checks even when the fact hash is unchanged; failed checks never replace valid facts. Retain evidence referenced by published analysis. |
| Categories, topics, groups | Stable IDs/slugs, Persian names, aliases, optional target level, learner/outcome criteria, versioned definition, and publication state. |
| Membership decisions | Course/group revisions, proposed/accepted/rejected/needs-review outcome, Jev answers, policy/model versions, and review overrides. Use a membership relation so one course can support multiple groups; eligibility still applies to each group independently. |
| Embeddings | Entity/revision, model ID, dimensions, text-bundle version/hash, and vector. Never compare vectors from different models or dimensions. |
| Assessments and comparisons | Exact course input revisions, group/rubric revisions, offer selection, structured claims/evidence, model/prompt/schema versions, validation state and generated time. |
| Workflow runs and steps | Run ID, trigger, entity/input revision, step status, attempts, timestamps, error summary, pg-boss job IDs, and resumable progress. Keep retained application history separate from queue retention. |
| Model calls and review tasks | Request identity, role/model/provider, input digest, usage/cost when reported, failure state, and pending review reason. No credentials or personal review identities. |

Application workflow states: `queued`, `running`, `waiting-review`, `succeeded`, `failed`, and `superseded`. These are Dorob states, not a replacement for pg-boss's native job states. Groups start as `draft`, move through `ready-for-review`, and become `published` only after publication checks; support `withdrawn` without deleting their history.

Public DTOs include source links, last successful check, available offers, unknown fields, coverage warnings, and explicitly labeled derived analysis. Raw normalization evidence and model request payloads stay server-side. Scrapers continue emitting `derived: null`; analysis is stored separately.

## Workflow execution

Implement workflows as small durable jobs with explicit inputs and persisted outputs, not one giant task or an autonomous agent choosing arbitrary actions. Queue payloads carry IDs/revisions and a versioned job envelope; workers load retained inputs from PostgreSQL rather than copying entire syllabi into queue messages.

| Workflow | Trigger and steps | Completion |
| --- | --- | --- |
| Provider ingestion | Manual command initially; later opt-in schedule. Discover allowed URLs → bounded course jobs → adapter validation → save observation/revision → enqueue relevant downstream work. | Every selected URL has a success/failure outcome; partial success is explicit. |
| Course placement | New course or classification-relevant evidence change. Jev classification → retrieve plausible existing groups → Jev membership checks → accepted membership, review task, or unmatched status. | No-fit and uncertainty are separate outcomes. |
| Group discovery | Unmatched-pool change or manual batch. Dense + sparse retrieval → validate candidates → generate draft definition/criteria → operator review. | Draft has at least two suitable distinct offerings; approval creates memberships and triggers assessment. |
| Group comparison | Accepted membership, relevant course evidence, or policy change. Assess candidates → compare under the group rubric → validate → operator publication action initially. | Publish an immutable comparison revision only when its inputs still match current accepted revisions. |

Use job dependencies for known assessment fan-out/fan-in, or persisted orchestration for dynamic candidate sets. Account for every candidate and unblock/reconcile runs when a parent fails; do not silently publish only successful assessments. `waiting-review` is a saved application state: complete the current job and enqueue continuation when reviewed, rather than leaving a worker active indefinitely. Start with operator CLI commands for review/approval; a bespoke admin UI is deferred.

Reliability requirements:

- Commit domain results and follow-up job insertion in the same PostgreSQL transaction, using pg-boss's transaction integration with Drizzle. If the selected driver/version cannot do this, use a transactional outbox and document that choice; never rely on an unprotected save-then-enqueue pair.
- Enforce application result uniqueness by entity/input revision and operation/policy version. Queue deduplication alone is insufficient. Assume handlers can run again after a crash and make writes idempotent.
- Retries can repeat a chargeable model call if the response was lost. Save completed responses for reuse, distinguish unknown call outcomes, cap retries, and never promise exactly-once billing.
- Coordinate course/group updates with database locks or conditional revision checks. Coalesce comparison requests for a group and reject superseded results at publication time. Two parallel discovery jobs must not create duplicate groups for the same candidate set.
- Start conservatively: one ingestion request per provider across all jobs/hosts and one generative call at a time, with configurable Jev concurrency. Preserve adapter delays/access-denial behavior across jobs; creating a new scraper per concurrent job must not bypass provider-wide limits.
- Retry temporary network/429/5xx failures with bounded backoff and `Retry-After`. Do not layer unrestricted queue retries on top of adapter retries. Invalid schemas, missing credentials, access denial, and budget pauses need explicit operator action or deferred handling, not endless retries.
- Keep the last valid facts and published comparison when a job fails. Mark affected analysis stale on relevant changes. If fewer than two eligible alternatives remain, withdraw comparative recommendations and show an honest unavailable/update state at the stable URL.
- Keep prices current from source records independently of retained educational analysis. Track separate evidence hashes where useful: the existing source hash also includes offers/reviews and is not by itself an educational-only digest. Reassess membership for relevant content changes; recalculate price-based output for offer changes.

## Retrieval and model integration

Normalize search copies of Persian characters/digits/spacing while preserving original source text and ZWNJ in retained facts. Maintain explicit aliases such as «پایتون» and `Python`. Category is a browsing classification, not a hard retrieval boundary. Search existing group definitions for placement and unmatched courses for new-group discovery; exclude the current course and collapse duplicate source identities.

Dense retrieval uses pgvector with a configurable embedding model. `text-embedding-3-large` remains a candidate, not a required dependency or selected OpenRouter model ID. Verify the model's availability through OpenRouter before enabling it. Choose dimensions explicitly and ensure storage/index support; do not blindly combine a 3072-dimensional embedding with a standard `vector` ANN index. Exact vector search is adequate for the small local dataset initially. Merge lexical and dense candidate ranks using a documented deterministic method such as reciprocal rank fusion, then run comparability checks. Retrieval scores alone never establish membership.

Provide separate typed client methods for decision calls, text/structured generation, and embeddings behind the OpenRouter integration. Jev is not a chat-completions model: the current [OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev) documents the Decisions API at `POST /api/alpha/decisions` with `state` and typed `questions`, and model `typesafe/jev-1.13`. Confirm the endpoint/model contract against current docs at implementation time; pin supported versions and record the served model ID. Do not substitute `typesafe/jev-router`, which selects models rather than performing our classification contract.

Generative outputs must pass a runtime schema before storage/publication. Claims reference a curated evidence index bound to immutable revisions; structural validation alone does not prove factual support. Treat provider text as untrusted input, with controlled instructions and no arbitrary tool execution. Preserve sample/partial feedback coverage; an unknown field is not a course weakness. Do not infer teaching quality from titles, ratings, or a syllabus alone.

When credentials or model IDs are absent, database imports, queue tests, and deterministic operations must still work. Use clearly identified offline test doubles for model-dependent tests; do not fabricate successful live decisions or publish synthetic model output as real analysis. Keep live generation explicitly enabled, with configured per-call output bounds, concurrency, and a required run budget. Report actual cost only when supplied/verified; otherwise mark it unknown. No unlimited defaults or silent model fallback.

## Local setup and monitoring deliverables

Add an ignored local environment file and a committed `.env.example` containing placeholders. Server-only configuration must cover `DATABASE_URL`, `OPENROUTER_API_KEY`, Jev model ID, generative/embedding model IDs and dimensions, live-call enablement, budgets, provider/job concurrency, and schedule enablement. Use no `NEXT_PUBLIC_` secrets. Keep dashboard connection/auth configuration separate as needed.

Provide a pinned local PostgreSQL/pgvector setup with persistent storage, using Docker Compose when Docker is available; document an existing PostgreSQL alternative. Do not install/start a system service without applicable authorization. Migrations initialize pgvector and application tables; pg-boss owns its own schema/migrations. Match the dashboard release to that schema. Its documented runtime currently requires Node.js 22.12+; use a separate local container/runtime if needed while keeping the application/worker on Bun. Verify compatibility before selecting exact versions; do not assume dashboard Bun support from pg-boss's Bun support.

Root Bun commands for database startup/migrations, worker startup, offline import/manual groups, inspection/publication, dashboard, and tests now exist; see [operations](backend-operations.md) and README. Bounded collection/resume commands are implemented; model review commands follow later. Web and worker startup must not perform destructive resets or automatically migrate schema. Begin with schedules disabled; refresh frequencies from [scrape-spec.md](scrape-spec.md) remain proposals.

Use the pg-boss dashboard to inspect queues, payloads, failures, and schedules. Include `workflowRunId`, `courseId`, and `groupId` where applicable for filtering. Persist model usage/cost and complete run/attempt history in application records, since queue views are not a full domain audit trail. Protect operator actions; no unauthenticated public review/publication endpoint. The existing read-only data dashboard is a separate utility and remains usable.

Hamravesh deployment is future work. Keep processes configurable and portable, but do not provision infrastructure, add platform-specific services, or claim pgvector availability there without verification. Deployment readiness includes backups/restore, protected operator access, runtime compatibility, and resolution of the existing web build blocker.

## Implementation order and acceptance

Milestone 1 is implemented and validated locally with offline tests, real PostgreSQL tests, and separate API/worker/dashboard containers. Milestone 2 is complete and locally validated. This handoff defines the architecture; implementation agents should make routine schema/file choices within it and keep documentation current. Do not commit, create branches, or deploy without the owner's authorization.

1. **Local foundation and vertical slice.** Add server-only packages, PostgreSQL/pgvector setup, Drizzle migrations, Bun worker/pg-boss integration, compatible dashboard, configuration validation, and a version-2 saved-export importer. Import two suitable saved courses into a manually defined draft group, enqueue a deterministic job, persist its result, and read it through the Bun backend query service/HTTP boundary. The owner requested a separate backend after the original handoff; frontend fixtures remain available and the frontend data-mode switch belongs to its integration milestone. Demonstrate retry/restart safety and an atomic result-to-next-job handoff without external requests.
2. **Bounded ingestion and revision handling.** Wrap the existing Maktabkhooneh adapter in resumable manual jobs; add a second existing provider for cross-provider validation. Preserve access rules, unknowns, and original currency evidence. Add change detection and downstream invalidation; do not run full-catalog collection by default.
3. **Jev placement and hybrid retrieval.** Seed a small reviewed taxonomy, implement OpenRouter decision/embedding clients and candidate retrieval, persist decisions with evidence coverage, and provide operator review commands. Test no-fit separately from uncertain and missing evidence.
4. **Group discovery, assessment, and publication.** Generate draft groups and structured evidence-backed comparisons, account for every candidate, enforce publication gates, and support manual correction/reprocessing. Keep ranking/badge policies disabled until reviewed; factual comparisons and qualified fit explanations can work without an overall winner.
5. **Frontend integration and opt-in refresh.** Connect group/category discovery and group details to published records; reconcile existing Python prototype membership against the agreed criteria. Retain attribution, Persian/RTL display, unknowns, and stale states. Enable schedules only after bounded runs and quality review; dedicated course routes and a broad frontend redesign are not prerequisites.

Current milestone status:

| Milestone | Status | Next deliverable |
| --- | --- | --- |
| 1. Foundation and offline workflow | Implemented and locally validated | Saved version-2 imports, immutable evidence, manual groups/publication, factual HTTP reads, separate Docker services and retry/rollback checks are available. |
| 2. Bounded ingestion and revision handling | Complete and locally validated | Durable bounded Maktabkhooneh/Roocket collection ledger, shared PostgreSQL request leases, validated revision persistence, transactional invalidation outbox and operator reapproval. |
| 3. Jev placement and hybrid retrieval | Pending | Reviewed taxonomy, OpenRouter decision/embedding clients, candidate retrieval, evidence-bound decisions and operator review. |
| 4. Group discovery, assessment and publication | Pending | Reviewed new groups, structured evidence-backed comparisons, claim validation, correction/reprocessing and publication gates. The current factual publication CLI is groundwork for this richer workflow. |
| 5. Frontend integration and opt-in refresh | Pending | Database-backed category/search/group journeys, attribution/freshness/unavailable states and quality-reviewed refresh schedules. |

Cloud release preparation remains separate from local milestone acceptance: configure shared PostgreSQL connectivity/TLS, backups and restore, least-privilege roles, private operator access, centralized logs and worker monitoring; resolve the frontend build blocker. Backend and workers remain independent containers on the selected cloud hosts. No cloud release is claimed.

Required acceptance checks, scaled to each milestone:

- Re-importing unchanged records creates no duplicate courses/revisions; successful unchanged observations update freshness, and failed collection preserves the last valid revision.
- Worker restart/retry and transaction rollback do not lose downstream work or duplicate accepted domain results. Waiting reviews consume no active job; approvals resume the intended revision.
- Stale jobs cannot overwrite newer facts, membership, or publication. Duplicate discovery proposals are controlled; groups below the publication minimum are handled explicitly.
- Evidence references resolve to retained inputs, all candidates have an outcome, and missing/partial data cannot produce fabricated facts or unsupported winners.
- API credentials/server packages are absent from browser responses/bundles. Visitors read stored content without model calls.
- Run `bun run lint`, `bun run typecheck`, existing utility tests, meaningful new backend/database integration tests, and `bun run build` sequentially where required. Add meaningful retry, rollback, revision, and publication tests rather than tests that simply mirror functions.
- The current production build limitation is documented in [validation](validation.md). Attempt the check and report/reproduce blockers; do not claim a complete build until it passes. UI integration also requires Persian, keyboard-focus, mixed-direction, and mobile checks under the applicable skills.

Keep README, Plan, validation, and this handoff aligned with deliverables. The offline PostgreSQL and separate-container ingestion workflow are tested; no new live provider collection or live model success is claimed. See [operations](backend-operations.md#bounded-manual-ingestion) for the implemented bounds, coordination and conservative revision policy.

## Existing groundwork and constraints

- The repository uses a Bun workspace with a Next.js/TypeScript frontend. Bun is now selected for backend application/worker execution in the same workspace; the offline foundation packages and services are now implemented.
- Four standalone adapters exist for Maktabkhooneh, TopLearn, Sabzlearn, and Roocket. They export the implemented [version-2 course format](course-data-format.md). Their existence does not select all four as launch providers or establish production readiness.
- The local data dashboard reads saved exports. No production API, database, scheduled refresh, or live AI is connected to the frontend.
- Frontend snapshots and current scraper exports have different contracts. Integration requires an explicit mapping and shared browser-safe contracts; scraper code, raw evidence, and secrets must stay server-side.
- The product is Persian-only. Backend content and search normalization must preserve Persian text and handle mixed Persian/Latin topic names without losing source evidence.

## Remaining decisions and safe starting defaults

| Area | Questions to resolve |
| --- | --- |
| Launch coverage | Which initial groups and providers offer enough comparable courses and evidence? Maktabkhooneh remains the planned first provider; cross-provider validation is required before calling the core experience complete. |
| Domain model | Finalize fields and constraints within the persistence model above; do not reopen the selected database or lifecycle defaults. |
| Group eligibility | Define group-specific comparability criteria and name the operator who reviews uncertain membership; the initial below-minimum publication policy is specified above. |
| Server contracts | The initial Bun HTTP group-read DTO is implemented; category/search and frontend integration contracts follow. |
| Storage and discovery | PostgreSQL, Drizzle, and pgvector are selected. Finalize schema details, evidence retention, embedding model/dimensions, and retrieval evaluation. |
| Ingestion operations | Which access methods, refresh intervals, rate limits, retries, and failure recovery rules? |
| AI and evaluation | Jev is selected for classification and existing-group membership. Which version, question contracts, decision thresholds, and review routing? Which embedding and generative models, cost limits, and evaluation process for the remaining roles? |
| Ranking and badges | Are rankings needed at launch? Which group-specific rubrics, weights, thresholds, and abstention rules are justified? |
| Publication and freshness | What evidence is required to publish, how is stale content presented, and when is a comparison withdrawn or regenerated? |
| Deployment and budget | Local first; Hamravesh is a later candidate. Finalize live-run budgets and later hosting/backups/recovery. |

These questions do not block the local foundation milestone. Keep model IDs/configuration explicit, automated schedules off, and uncertain model decisions/publication under operator review until the relevant policies are ready. Do not claim the initial offline milestone satisfies phase 3's full live-data completion criteria.

## Relationship to other documents

This direction narrows the earlier broad discovery/search roadmap in [Plan.md](../Plan.md): initial discovery leads to comparison groups. It does not replace the implemented [course data contract](course-data-format.md).

The [course group assessment specification](course-group-ai-assessment.md) and [production scraping proposal](scrape-spec.md) provide groundwork for later architecture. Their proposed ranking formulas, thresholds, operational choices, and optional fields remain proposals. Resolve them against this scope before implementation.

Implementation references: [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started-postgresql), [pg-boss jobs and transaction integration](https://pgboss.io/api/jobs), [pg-boss dashboard requirements](https://pgboss.io/dashboard), and [pgvector storage/index documentation](https://github.com/pgvector/pgvector). Recheck current versions and contracts before installing dependencies.
