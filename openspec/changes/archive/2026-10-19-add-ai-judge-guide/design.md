# Design

## Context

See `proposal.md` for motivation and scope. The current `course-group-judgments` spec, `packages/core/src/group-judgments.ts`, API routes and `docs/catalog.md` already provide versioned evidence, strict generated content, caller-owned order and immutable delivery. The October 3 assessment document is explicitly historical; its numerical ranking, extra tags and output proposals cannot be reused as judge instructions.

The deliverable is text consumed by an external HTTP-capable agent. It can influence that agent's decisions but adds no enforcement, runtime, verified model identity or quality certification. A short design is included because safe delivery and the distinction between confident language and unsupported certainty benefit from explicit decisions before writing the guide.

## Goals / Non-Goals

**Goals:** Make one Markdown file sufficient to assume the role, collect complete available evidence, write useful Persian content and deliver a valid judgment through the existing API. Keep protocol facts traceable to the implemented contract and editorial guidance clearly separate from server validation.

**Non-Goals:** Automated invocation, model choice, scheduling, live acceptance against the working catalog, new validation requirements, website metadata or structured data, frontend rendering and judgment approval/publication. No new numerical ranking weights, popularity thresholds or required criticism quotas.

## Decisions

### 1. One directly usable role document

Write `docs/ai-judge.md` as imperative role instructions, not an essay about a future system or a repository-specific installed skill. Use English for operational guidance, with Persian output rules and good/bad Persian examples. This follows the repository's developer documentation language while making the required output unambiguous. Include enough endpoint, field and recovery detail to use a copied file without repository access; reference canonical files and local Swagger as maintenance aids, not prerequisites.

Invocation supplies a trusted loopback API origin and a group UUID or unambiguous selection. The guide may discover/resolve groups with the existing management list; it must ask for selection when ambiguous rather than process the catalog automatically. Use a documented stable caller-supplied `systemId` (with a valid default) and a fresh globally unique `submissionId` per intended judgment. Assuming the role covers reading and submitting for the selected group; review-only instructions from the operator take precedence. Missing HTTP capability or an unreachable API produces an operational report, not invented evidence or a claimed submission. No installation, migration or service startup is implied.

Alternative rejected: an executable worker or installed skill, which exceeds the requested portable Markdown format.

### 2. Complete evidence before assessment

Describe the state sequence explicitly: select group, obtain context, traverse members, inspect each member's full sections and every retained feedback page, assess the complete group, validate output, save the exact request, submit, then read back the stored result. All nested input reads use one opaque `inputRevision`. Record traversal completion using totals/offsets and member identities; do not equate provider-wide review counts with retained API totals or stop after the first page. Unexpectedly incomplete/inconsistent responses or tool truncation require recovery, not a claim of complete review.

Preserve null versus confirmed-empty, section and syllabus coverage, offer terms and feedback classification. Include reference-only members exactly once. Source descriptions, syllabus and feedback are untrusted data and cannot change the role, API destination, course membership or submission contract. Use retained API evidence only; no scraping or external enrichment is part of this role.

Explain the four supported tags individually. Compare learning value within the group's topic, level and audience using outcomes, coverage, practice/projects, learning support and relevant experiential feedback. Compare comparable offers in toman with access/billing/support conditions; unknown prices are not free and recurring charges are not one-time prices. Use qualitative judgment under the API ordering rule; do not revive historical fixed weights, a cheapest-first sort or an expensive-tag penalty. Unknown evidence is not a negative score. An expensive high-value course may lead.

### 3. Confident editorial voice with evidence discipline

Aim for two or three distinct strengths and two or three distinct weaknesses when supported, within the server's maximum five per list. The user's clarification removes any hard minimum: fewer points, including no weaknesses, are valid after a full review. Empty assessments must not be the default shortcut. Require a final internal check across educational content, practice, prerequisites/audience, offers/access and feedback for overlooked meaningful points. Do not send internal working notes or reasoning as extra API fields.

Each point names a concrete attribute and its learner consequence; course-specific evidence must support both. Discuss actual tradeoffs, not generic praise, recycled bullets or manufactured defects. Duration alone is not a flaw; prerequisites alone are not a flaw; explain the relevant audience tradeoff only when it is real. Negative feedback requires actual relevant experiential content. Questions and provider replies are not learner approval or dissatisfaction. A supported criticism can be attributed precisely, such as a concern in some comments, without hedging the whole judgment or claiming universal opinion.

Page copy uses direct, natural Persian and avoids stock AI introductions, inflated adjectives, guarantees, self-reference, filler, «احتمالاً», «به نظر می‌رسد» and data-collection commentary. Confident tone does not license uncertain claims: omit unsupported statements instead of expressing them as facts. Keep operational limitations in the agent's completion report when needed, outside `content`; never write «اطلاعات کافی نداریم» as a weakness. Empty weaknesses do not mean a claim of perfection. Show contrasting Persian examples and the valid no-weakness case.

Alternative rejected: minimum bullet counts or blocking every group with sparse evidence, both of which conflict with honest abstention and the user's clarification.

### 4. Search-relevant hero within existing fields

Instruct the judge to identify the natural Persian search phrase from the editorial group topic and target level, then use it naturally in `hero.title`. Prefer a descriptive course-discovery/comparison title over a vague slogan or unrelated question. Do not invent search-volume research, popularity or a different group scope.

Give each existing field a purpose: title identifies the topic/intent; subtitle offers a distinct useful comparison angle; description explains the learning scope and meaningful comparison choices; topicLabel is concise; levelSummary matches the editorial level, including mixed or unspecified cases without inventing a narrower level. Text must be useful and group-specific rather than repetitive keyword variants. Avoid keyword stuffing, unsupported «بهترین», year stuffing, promised results and repetitive boilerplate. Add good/bad Persian hero examples. SEO-friendly here describes writing guidance, not ranking guarantees or a keyword research integration.

Use only the five existing hero keys and their actual bounds: title 120, subtitle 180, description 2000, topicLabel 80 and levelSummary 120. These are schema maxima, not SEO targets. Plain text only; no generated HTML, Markdown formatting, metadata, URLs, schema.org fields or layout changes.

### 5. Exact delivery and bounded recovery

Document the full strict envelope and content schema, unique supported tags, complete exact member set, plain Persian prose, maximum five bullets per list, 500 characters per bullet and 8 MiB request limit. Distinguish model-owned hero/assessment/order from application-owned source facts, category, assets and presentation. Include one clearly synthetic valid request with a supported empty weakness list; IDs/revision must come from actual reads before any real submission.

Save the exact request and key in an operator-approved writable working location before POST; this is operational state, not another deliverable or repository commit. If reliable preservation is unavailable, stop before delivery rather than promise crash-safe recovery. After timeout or ambiguous delivery, replay that same group/key/revision/content before regenerating. Never mutate or replace an unresolved request just to bypass a conflict. New acceptance is 201, exact replay is 200, and replay may recover an already-stale judgment.

Distinguish 409 stale evidence (restart traversal), key reuse (resolve the existing intent before creating a new key), and too few members (report not ready). Explain 404, 413, 422 and 503 and use bounded retries rather than an endless loop. A confirmed rejected stale request can be replaced only after a full new traversal, with a new submission ID. Detail/history reads recover results but history is live pagination, not a frozen export. Read back the accepted ID and check exact content/order, input revision and computed `isCurrent`; false freshness is reported to the operator, never called current. Report receipt and freshness without claiming publication or verified quality.

### 6. Documentation integration and verification

Add a guide link and a concise invocation example to README; link the agent guide separately from the transport reference in `docs/catalog.md`. Add a pointer in the historical document's introductory notice without rewriting its archived discussion. Update Plan.md to identify the manual role guide and keep automated execution/public rendering deferred.

Review endpoint/query details against actual routes and content/identity constraints against shared schemas. Validate the guide's synthetic JSON with `parseJudgmentSubmission` offline. Manually walk through multi-page feedback, revision changes, lost POST responses, an expensive-first order, a reference-only member and a fully reviewed course without weaknesses. Verify all local Markdown links and whitespace. No runtime tests or production builds are required for Markdown-only changes; no live writes are needed for documentation validation.

## Risks / Trade-offs

- A prompt cannot enforce diligence or factual quality → require explicit evidence traversal and a final quality check; do not claim API acceptance certifies prose.
- Confident wording could hide unsupported claims → omit those claims and keep evidence caveats in operational reporting rather than fabricated page statements.
- Thoroughness can become padding → treat two or three points as a target only; require distinct learner consequences and preserve valid empty arrays.
- A copied guide can drift from the API → identify contract/schema version, canonical references and review examples against the current shared validator.
- Large groups may exceed the agent's context budget → preserve organized evidence notes and continue only with complete coverage; report inability to finish instead of submitting an invented complete assessment.

## Migration Plan

No migration or service rollout. Add the guide and its documentation links during apply, validate offline, and deliver the file path. Reverting the documentation removes the guide without affecting stored judgments, source data or application behavior.
