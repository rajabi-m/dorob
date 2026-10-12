# Design

## Context

See `proposal.md` for motivation and the two delta specs for behavior. Phase 3 already has v3 ingestion/history, a generic worker and thumbnail processing. `BaseScraper` supplies controlled transport and discovery but its extraction hook is synchronous. TopLearn sometimes fetches another canonical page for identity; Roocket fetches comments through `https://api.roocket.ir`; Sabzlearn reads embedded course/comments data. All three currently construct `ProviderCourse` v2 records with duplicated discovery/stream logic.

Maktabkhooneh's v3 parser still calls `assembleCourseV3` in the conversion module. Shared contracts/public types still reference `SourceFactsV2`. Those dependencies cannot be removed in this change because the owner explicitly excludes touching Maktabkhooneh. Additive v3 helpers/types let the three migrated providers become native v3 without destabilizing that remaining legacy boundary.

The homepage already consumes current ready snapshots. The backend knows all three Persian provider names. The real-course card currently maps TopLearn's logo but lacks Sabzlearn/Roocket assets/mappings. Public detail exposes description, syllabus and offers, while feedback is retained in management observations and is not a current website field.

## Goals / Non-Goals

**Goals:** Establish a stable shared foundation before concurrent provider work; preserve rich extraction with explicit evidence/limits; prove actual ingestion-to-homepage behavior; isolate writes so four agents can share the workspace safely.

**Non-Goals:** Change Maktabkhooneh files, commands or behavior; remove its shared legacy dependencies; migrate old local exports; redesign the website or expose new feedback UI; introduce automatic crawling, AI or editorial categories. No future broad-cleanup spec or task is included.

## Decisions

### 1. Agent #1 owns the foundation and explicitly summons three provider agents

The agent applying this change is **agent #1**, coordinator and shared-foundation owner. It MUST finish tasks 1.1-1.6, run the foundation checks and communicate a frozen interface before summoning **agent #2 (TopLearn)**, **agent #3 (Sabzlearn)** and **agent #4 (Roocket)** concurrently. Use the coding environment's agent-spawning/delegation tools with those labels. Do not merely print three assignments and stop. This authorization applies to implementation after an explicit apply request, not to planning this proposal.

The four available concurrency slots fit this structure. Agents #2-#4 must not spawn additional agents, change shared files, run commits, create branches or independently broaden scope. If spawning is unavailable, report that constraint rather than claiming parallel execution. Any alternative execution arrangement requires the owner's direction.

```text
Agent #1: foundation + verified interface gate
                    |
           +--------+--------+
           |        |        |
           v        v        v
        Agent #2 Agent #3 Agent #4
        TopLearn Sabzlearn Roocket
           |        |        |
           +--------+--------+
                    |
                    v
Agent #1: integration + final acceptance
```

Ownership is exclusive, including test files and docs:

| Owner | Allowed implementation areas |
| --- | --- |
| Agent #1 | Shared `base.ts`, `public-provider.ts`, new v3 helpers, shared worker/CLI/reporter/journal/tests, additive browser-safe aliases if necessary, root/utility package registration, shared docs and `tasks.md` status; dashboard/aggregation retirement; optional logo assets and the existing card mapping |
| Agent #2 | `scrapers/toplearn.ts`, new `ingest-toplearn.ts`, removal of `scrape-toplearn.ts`, TopLearn tests and provider-prefixed fixtures, `docs/provider-audits/toplearn.md` |
| Agent #3 | Equivalent Sabzlearn files/tests/fixtures and `docs/provider-audits/sabzlearn.md` |
| Agent #4 | Equivalent Roocket files/tests/fixtures and `docs/provider-audits/roocket.md` |

Provider agents send interface requests to agent #1. Agent #1 makes shared changes and announces any interface revision to all affected agents. Only agent #1 edits the central task checklist and shared documentation. No agent changes Maktabkhooneh scraper/entry points/fixtures/tests, `convert-course-v3.ts`, or removes the legacy `course.ts`/export helpers it needs. Run existing tests unchanged as regressions. Shared changes must be additive and behavior-compatible for existing callers.

### 2. Native v3 construction with controlled asynchronous enrichment

Create server-only v3 construction/evidence helpers and named aliases from the existing `CourseIngestion` section types. The new providers must not import/use v2 construction/finalization or the saved-v2 conversion path. Pure decoding, duration and anonymization utilities may be shared without creating v2 records. Do not remove `SourceFactsV2` or rewrite the existing ingestion/public wire contract as part of this change.

Extend the base extraction hook to accept a synchronous or promised v3 observation and await it before final validation. Existing synchronous subclasses continue to work. Provider-specific asynchronous hooks use protected controlled clients, not unrestricted fetch. TopLearn can gather verified alias evidence; Roocket can gather course-specific API feedback. The shared lifecycle owns one fresh observation ID and successful observation time and validates identity/extractor consistency after required source collection. Optional failures must not erase independent facts.

Keep pure source parsing functions separately testable with sanitized fixtures. Providers implement canonical identity, relevant sitemap selection and source extraction; shared code owns bounded discovery, transport, validation and generic streaming. Prefer this over duplicating the worker or calling existing v2 parsers and converting their output.

### 3. Rich extraction is audited field by field

Each provider agent supplies a field matrix in its audit doc: field/section, public source/locator, extracted representation, coverage and specific reason if absent. Audit course HTML, embedded data, course-scoped JSON-LD, documented/disclosed public supplementary endpoints and evidenced pagination. Follow access policy; no private/authenticated endpoints or guessed metadata.

Mandatory matrix groups: identity/provenance; pricing/terms/certificate/access; thumbnail; description; outcomes/prerequisites/audience/technologies; practice/assessment/support; content/effort/completion durations; classification; all published instructors; ordered chapters/lessons/descriptions/types/durations/counts; availability/status/update dates; enrollment; comments/reviews and individual ratings; aggregate rating/scale/vote count; feedback published/collected counts; features and sanitized provider extras.

TopLearn must preserve canonical-page identity verification and currency conflict handling. Sabzlearn must specifically investigate missing rating scale/vote evidence, retain honest unknowns if inaccessible/unpublished, and preserve Jalali text. Roocket must preserve structured course identity, public API access controls and course-specific rial/toman proof. Test multi-instructor evidence where present; do not assume every source exposes just one teacher.

### 4. Feedback follows public pagination within reproducible bounds

The planning default is ten feedback pages and 500 retained anonymous items per course, configurable through `--feedback-pages` and `--feedback-items` for the new commands. These bounds implement the request for maximum supported information without an unbounded crawl; they are proposed defaults, not a previously confirmed preference. Limits must respect the API's existing 2,000-item list limits and 4,000 field-source entries, including other facts. Never truncate silently or raise backend limits merely to fit source output.

Count distinct pages consistently, including embedded initial pages. Deduplicate using stable source IDs or anonymous content IDs, retain original ordering/locators, and record omissions, further pages and stopping reason. Complete requires evidenced exhaustion without omitted relevant content; limit/failure/filtering means partial or unknown. Rating votes are not comment totals. Keep aggregate rating/count even if item pagination fails. Keep confirmed ratings unknown when scale is unverified; sanitized raw score evidence can use namespaced `providerData`.

Add optional persisted collection configuration for the three new providers and validate it before any resume I/O with the provider/backend. Omitted flags restore saved settings; conflicting flags fail. The journal remains backward-compatible with existing Maktabkhooneh configuration and checkpoints. Persisted observation retry never re-extracts or rewrites its submission ID. Failed/partial optional extraction inside an accepted observation requires a fresh collection for enrichment; image-only resume cannot repair source facts.

### 5. New provider CLI uses shared behavior without rewriting Maktabkhooneh's entry point

Create a shared ingestion CLI module and three thin provider entry points, using existing parser/reporter/backend/worker behavior as the reference. Do not edit `ingest-maktabkhooneh.ts` to extract that implementation. Add provider command identity as an optional reporter input with existing defaults preserved for Maktabkhooneh. New commands pass their actual identity so recovery commands use the right provider. Agent #1 owns package script/export registration and shared tests; provider agents own their thin files.

Retire `scrape:toplearn`, `scrape:sabzlearn`, `scrape:roocket` and their entry-point code instead of silently turning an export command into a backend write. Retire `dashboard:data`, `dashboard:aggregate`, `data-dashboard.ts`, the executable portion of `aggregate-courses.ts` and `dashboard/` assets after checking references; remove only now-unused dashboard-specific consumers/tests. Preserve old ignored output files and Maktabkhooneh commands/converter/helpers. Owner clarification on October 12, 2026 permits retaining `aggregateCourses` in `aggregate-courses.ts` because the unchanged protected Maktabkhooneh test imports it. Keep that pure helper and retire its executable CLI; it performs no work on import. This is the expressly authorized narrow retirement, not a separate broad cleanup workstream.

### 6. Each provider proves homepage rendering; agent #1 serializes shared acceptance resources

Agent #1 supplies one local API/database/web environment (existing migrations and `./run.sh` configuration) and coordinates browser access and live-run slots. Use provider-specific private checkpoints and at most one active worker per provider/backend. Independent offline tests may run concurrently; coordinate shared browser sessions, service lifecycles and broad checks to avoid interference.

Each provider agent must select and inspect a bounded representative sample: at least one paid and one explicitly free course when available, with instructor/curriculum evidence and feedback/rating evidence when published. If the provider has no accessible free course or rating votes, document the verified limitation; do not invent data or silently substitute fixtures.

Collect through the real new CLI, verify retained sections and snapshot IDs through management reads, verify ready hosted WebP, verify `/api/v1/courses` and detail, then open `/` in a real browser. Clear category/free filters, use title/provider search or pagination, confirm the course in `#courses`, open details and check available instructors, content, offers, source link and hosted image. Check mobile/desktop RTL and keyboard details/focus using existing UI. Capture observation IDs, source URLs/dates, tested browser steps and outcomes in the provider audit. A fresh second observation has a new ID; same-checkpoint resume adds no duplicate history and does not recollect completed selections.

Agent #1 owns authentic missing logo assets/mappings and the owner-requested rounding of displayed course durations to the nearest whole minute in existing cards/details (October 12). The shared Persian duration formatter preserves unknown/zero values and stored numeric precision. Other frontend edits remain outside scope. Missing logos do not block data visibility. No new ratings/comments display, filters, routes, fixtures, layout or data-fetching changes. If a real frontend defect requires broader edits, report it and keep acceptance incomplete rather than bypassing the boundary. API-only and fixture checks cannot substitute for a browser pass.

## Risks / Trade-offs

- Provider drift or denied supplementary access -> sanitize representative fixtures, preserve partial/unknown evidence and report blocked live checks precisely.
- Four agents modifying a shared workspace -> frozen interface gate, exclusive ownership, centralized registration/docs/task updates and serialized browser/service operations.
- Shared helper/journal changes affect Maktabkhooneh -> additive defaults, unchanged caller files and existing regression tests, including checkpoint replay; retain all dependencies it still uses.
- Some course thumbnails cannot become ready -> diagnose image separately; select a representative accessible course for positive frontend acceptance and document the failing case without suppressing it.
- Rich data can exceed validation limits -> apply explicit source/item/evidence bounds before submission with recorded omissions and partial coverage; preserve valid independent sections.
- Existing public contract omits feedback -> verify retained feedback through management observations while keeping frontend acceptance within its current features.
- Production web build has a documented Bun page-data limitation -> run the required build, distinguish the existing limitation from regressions and do not claim an unrun browser check passed.

## Migration Plan

Agent #1 completes the shared gate; agents #2-#4 migrate independently; agent #1 registers their delivered entry points, performs narrowly scoped retirement and integrates acceptance evidence. Start services/collection only by explicit invocation. No database schema change or historical-data migration is required. On failed acceptance, preserve journals and existing observations and report unfinished tasks. Do not restore v2 adapters, delete local data, revert another agent's work, commit or create branches without owner authorization.
