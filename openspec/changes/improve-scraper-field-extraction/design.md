# Design

## Context

See `proposal.md` for motivation and the capability delta for acceptance behavior. The four collectors already emit validated v3 sections with field evidence, warnings and coverage. Maktabkhooneh also exports v2 through the same source parser. The worker persists immutable payloads and checks extractor versions; this change must fit that system.

The October 20 read-only audit inspected all 1,495 current observations, collected October 11–12: 1,000 Maktabkhooneh, 300 TopLearn, 91 Sabzlearn and 104 Roocket. Representative live page parsing confirmed that TopLearn n8n contains an explicit outcome but leaves its structured field null; Canvas is explicitly free and archived; Sabzlearn Python exposes a raw score of 5 without an established scale/count; TopLearn Digikala Java publishes six lessons but no recognized `Ep_*` entries. TopLearn's disclosed comments response remained unavailable/unrecognized. These are evidence baselines, not promises of current catalog completeness.

Roocket's unconditional inactive-course branch drops all offers before considering explicit free evidence. Both Roocket and Maktabkhooneh currently retain zero-average/zero-vote rating objects. TopLearn's educational label reader follows siblings inside the immediate parent, so a label wrapped in its own paragraph can miss the following content. Existing provider audits and fixtures under `docs/provider-audits/` and `apps/utils/` supply the other starting cases.

## Goals / Non-Goals

**Goals:** Small provider-specific parsing corrections with existing validation; precise source boundaries; meaningful negative-case regressions; a fixed-or-source-blocked outcome for each investigated gap.

**Non-Goals:** A universal HTML parser, new crawler architecture, data-model extensions, new raw-data consumers, CLI/worker changes, scheduling or operational catalog refresh. No new date representation, speculative calendar conversion, raised collection defaults, new Maktabkhooneh pagination settings or public UI changes. Existing unrelated course-group work is outside the edit scope.

## Decisions

### 1. Keep existing contracts as hard boundaries

Edit provider modules in `apps/utils/scrapers/`, local private extraction helpers only where necessary, utility tests/fixtures and developer docs. Leave `packages/core`, API validators/projections, worker/checkpoint/CLI code, database, frontend, package manifests and lockfile untouched. Existing function signatures and default request/feedback limits remain stable. Add evidence only through existing `fieldSources`, `warnings`, raw and namespaced provider-data containers; no new mandatory keys or dependency on new extra keys. Do not add public helper exports or new output/report formats.

Alternative: a shared contract or extraction-framework redesign would widen the review and migration burden without solving the confirmed markup defects.

### 2. Repair educational traversal per provider

Start with TopLearn's n8n case: normalize label text for matching while preserving retained Persian prose; traverse the label's enclosing block and subsequent content up to the next applicable section boundary. Support nested emphasis, line breaks and labeled lists where observed, including inline value text. Avoid collecting a sibling section's prerequisites as outcomes. Reuse existing HTML/Nuxt/RSC readers instead of a new dependency.

Apply the same evidence rule to Sabzlearn full-content/FAQ text, Roocket body headings and Maktabkhooneh descriptions/features: fill only existing fields from explicit course-specific statements. Read existing structured source fields first; add conservative markup fallbacks without overriding stronger facts with generic prose. Do not extract language from site language, technology versions from titles, or contractual support from unrelated advertisements. Preserve full descriptions even when no distinct educational field is established.

Alternative: inferring claims from arbitrary prose would improve apparent completeness while reducing factual reliability.

### 3. Separate explicit free designation from archived state

For Roocket, retain the existing free pricing entry when `is_free=true` and `type=free`, no positive amount contradicts the designation, and the source is archived rather than coming soon. Retain archived/unavailable provider state unchanged. Make the existing offer label/access prose state the archive limitation only from evidenced source text; do not claim enrollment, playable media or lifetime access. Archived paid entries continue to have no enabled purchase offer. Keep contradictory-price failure behavior, paid currency proof and unknown-zero handling.

This is a deliberate correction to the broad inactive branch, not a general rule that disabled purchases are available. Existing capability safeguards concern unsupported zero and disabled paid offers; explicit free classification plus unavailable state uses the already-separate pricing/provider-state sections. The public projection currently hides provider state: document that limitation without changing UI or API, and do not promise an archived badge.

### 4. Normalize unrated aggregates without inventing metadata

In each provider's rating extraction, a known zero rating-vote count suppresses the normalized aggregate. Preserve relevant existing source evidence and a concise explanation; a missing count is not equivalent to zero. Keep individual ratings and comments independent.

For Sabzlearn, check matching Course JSON-LD and directly disclosed public rating presentation/module semantics for an explicit scale. A raw score of 5 or five decorative icons alone is insufficient. If a scale is verified, populate the existing rating object with nullable count; otherwise leave null and document the checked sources. Do not use `comments_count`, pagination totals or sample length as votes. No new origin or speculative endpoint is added.

Alternative: assuming a five-point scale or displaying zero votes as a zero-quality score would manufacture meaning.

### 5. Recover only demonstrated curriculum and feedback variations

Review the 12 positive-count TopLearn syllabus gaps using retained selections and representative course pages. Distinguish missing source entries from alternative markup; implement a fallback only where lesson identity/order/content are verifiable. The other 17 zero-count pages are negative cases, not missing lessons to invent.

For Maktabkhooneh's 287 count warnings, inspect representative chapter/unit structures and the meanings of the published count. For Roocket's one mismatch, inspect sections/episodes and published-state metadata. Recover real omitted structures where established; preserve distinct published/extracted counts, effort-versus-content duration and honest coverage otherwise. Matching counts alone do not prove exhaustion.

Recheck TopLearn's linked course script and exact disclosed public comments response with bounded reads. Only support a changed public route/format when directly disclosed and verifiable within existing configured origins. Keep unknown feedback if the route still fails. Sabzlearn/Roocket already support configured deeper collection; test and document their existing options rather than changing defaults or journal settings. Maktabkhooneh stays page-sample-only in this change; adding traversal is deferred because it would expand collection/recovery scope.

### 6. Make diagnostics reflect the selected extraction path

Generate Sabzlearn paid-currency warnings only for paid normalization that actually needs verification, not successful explicit-free extraction. Set TopLearn educational coverage to partial when retained facts exist, using the existing reason field. Do not replace unknown feedback with an empty list or mark a course complete merely because its core validates.

### 7. Verify without updating the catalog

Reduced attributed fixtures must exclude personal identities, tokens and media URLs. Label synthetic edge cases. Regressions exercise meaningful boundaries: nested labels, unrelated content, contradictory free flags, inactive paid/coming-soon, zero versus unknown votes, unavailable versus empty comments, ordering/count mismatch, limits and later-page failures. Validate observations with unchanged validators and preserve legacy export shape/identity; no new integration harness or schema snapshots are needed.

Bounded live verification invokes read-only collector/page paths without ingestion, persistence, thumbnail processing or journal resume. Revisit the previously failed Roocket CSS Grid/Flexbox pages and TopLearn failed course URL as read-only diagnostics; persistent provider errors are documented, not bypassed. Thumbnail recovery is operational work and excluded. Record actual before/after field differences and remaining gaps per provider in existing documentation. Use documented utility tests, workspace lint/types, API build and frontend production build; record environment blockers without broadening scope.

## Risks / Trade-offs

- Broader label matching can absorb unrelated content → Course-scoped boundaries, source-text preservation and adjacent-section negative tests.
- An archived free entry can be mistaken for current enrollment availability → Retain unavailable state and evidence-based archive wording; document that the public UI does not expose all state.
- Missing provider evidence can prevent a desired fix → Accept explicit source-blocked outcomes; do not require every nullable field to become populated.
- New parser output does not enrich existing catalog records → No data writes here; a later explicitly requested refresh uses fresh checkpoints and observations.
- Extractor versions can invalidate old run configurations → Preserve version checks and exact saved-payload behavior; document fresh-run guidance instead of editing journals.
- Source requests can fail or deny access → Existing polite bounds, robots and denial stops remain; fixture checks do not count as live success.

## Migration Plan

No data or schema migration. Update only changed extractor version constants according to the existing version mechanism after behavior is verified. Old source snapshots remain unchanged; operators must use fresh checkpoints for a later authorized recollection. Roll back parser changes if needed without rewriting accepted observations, journals, images or unrelated work. No commit, deployment or catalog refresh is part of this change.
