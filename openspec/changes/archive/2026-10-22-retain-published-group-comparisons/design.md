# Design

## Context

See `proposal.md` for the motivating Python membership approval. The existing public repository recomputes the working input revision and selects only matching judgments, then loads only `courses.current_snapshot_id`. Its integration test explicitly expects edits, removals and refreshes to hide comparisons. The current public spec requires that behavior; this change deliberately replaces it rather than treating it as an accidental regression.

`course_group_judgments` already stores immutable content, group context and an input manifest containing every course reference and exact snapshot ID. `course_snapshots` and historical hosted assets are retained independently of the current pointer. `presentCourse` projects an arbitrary supplied snapshot; it does not require the latest one. Therefore a logical edition can reuse existing retained records without copying provider data or adding a table.

## Goals / Non-Goals

**Goals:** Separate working freshness from public visibility; preserve a coherent evaluated set across ordinary catalogue changes; automatically use a complete replacement; keep all public surfaces and pagination aligned.

**Non-Goals:** New approval/publish workflow for judgments, public version browsing, automatic judging, retention expiry, latest-price overlays, pending-course sections, admin judgment UI, changes to individual-course catalogue freshness or modifications to stored source/judgment history.

## Decisions

### 1. An edition is the judgment plus its retained dependencies

Use judgment ID as edition identity. Validate exact one-to-one agreement between ordered content entries and stored manifest course IDs, at least two unique courses, non-null snapshots, and same-course ownership of each snapshot. Read immutable payloads by manifest snapshot ID, not by current course pointer. Project all course facts and the corresponding thumbnail association from that exact snapshot.

Reuse immutable references instead of embedding another data copy: both approaches preserve evaluated values, but references avoid duplicate evidence and backfill. Missing manifest snapshots make a candidate incomplete; malformed or mismatched retained relationships are integrity failures (safe 503), never permission to substitute current records. Read-only asset inspection keeps its no-write contract and verifies the exact stored content hash as well as metadata, so same-size file corruption is unavailable. Each read is bounded by the existing 512 KiB asset cap and four concurrent checks. Public payload whitelisting remains unchanged.

The existing projection accepts category IDs; pass the selected edition's retained group category rather than categories derived from today's unrelated group memberships. Key loaded/projected source data by `(courseId, snapshotId)` or snapshot ID, never course ID alone: two groups can legitimately assess different snapshots of the same course.

### 2. Retain automatic selection without a persisted publication pointer

Keep the existing automatic-publication model and endpoint shapes. For each currently published group, traverse retained judgments created with `groupContext.isPublished=true` in receivedAt descending/ID ascending order. Select the first structurally complete candidate whose exact snapshots have ready hosted thumbnail associations. Use bounded database batches/joins across full history, not a fixed first-page cutoff or an unbounded per-course query loop.

A newer judgment with null source input or pending/failed image processing does not replace an existing ready edition. When its exact dependencies become ready, it can replace the edition on a later read, without a read initiating image work. A complete candidate may be stale against the working revision: this is intentional and necessary to survive further additions/refreshes before image work finishes. Its original membership was complete at judgment acceptance, which remains strictly revision-checked.

After candidate selection, enforce current withdrawal gates and inspect the chosen assets. If an assessed member was removed, or a selected hosted file is missing/corrupt, hide the edition rather than trying older candidates. Storage inspection failure remains 503. Readiness fallback is for a newer candidate that cannot yet form a complete edition, not a way around withdrawal or loss of selected files.

A pointer plus explicit promotion would provide more lifecycle control, but needs a migration, transactional promotion and recovery semantics. That is unnecessary for this bounded change; it can be introduced later if editors need to choose among ready judgments. No read or service startup writes selection state.

### 3. Freeze comparison content; retain minimal live controls

Freeze group hero and category from retained judgment/context. Freeze all displayed course data, source links, source dates, offers, rating, covers and ordering from the exact sources. Derive course count and distinct provider list solely from assessed entries. Changes to working title/description/level/category or newly added members cannot alter the edition. Current stable group ID and current slug control routing; slug changes retain the existing no-redirect-history limitation.

Current `isPublished` remains a hard gate. Every assessed course must still be an approved current member; removing an assessed member hides the whole comparison until a suitable replacement is available. Removing a waiting member has no public effect. Current reapproval can restore the membership gate; a permanent judgment revocation system is outside scope. Draft-context judgments never become eligible merely because a group is later published. Existing publication toggling does not erase history.

These defaults preserve explicit editorial control while accepting routine working changes. Partially filtering out removed courses would invalidate the original ordering and group-relative assessments, so it is rejected.

### 4. Keep strict authoring semantics and truthful private freshness

Leave judge-input traversal, submission revision rejection, all-current-member coverage, idempotent replay and management `isCurrent` untouched. The working group includes Jadi immediately after approval; its preceding edition remains publicly three courses. A new judge receives the four-member working set and submits a complete replacement against that revision. Existing management history provides the reassessment signal (`isCurrent=false`); a new admin badge/status endpoint is not required here.

Update `docs/ai-judge.md`, catalogue/frontend documentation and README/Plan status during implementation to explain that a noncurrent judgment can still be the public edition. Installing this change never runs the guide, generates a judgment or changes memberships.

### 5. Preserve cross-surface consistency and pagination contracts

Use the same selected edition for `/api/v1/judged-groups` and detail, so group catalogue cards, homepage groups and the featured shelf inherit frozen counts, covers and course links. Keep response schemas and bounds compatible; category search uses the edition category, text search its retained hero. Metadata and breadcrumbs must not fetch live editorial category/title to override edition values.

A pinned next page succeeds across working-only changes, because judgment ID does not change. It returns 409 after automatic replacement, withdrawal or unavailability, retaining the existing restart UI. Repeatable-read database assembly plus read-only file verification preserves one coherent view; concurrent filesystem loss still uses existing unavailable behavior.

No public updating/stale warning is added. Preserve source `checkedAt` and judgment `receivedAt` as historical dates, never the current request time. Inspect Persian date/price labels and change any claim of current provider prices to wording appropriate for retained observations. Individual-course results can show newer facts; that is intentional and documented.

## Risks / Trade-offs

- [Retained prices and source URLs age] -> Preserve visible source/judgment dates and existing provider-visit action; do not describe old prices as live quotations. No TTL is introduced because time-based hiding would recreate the availability problem.
- [Existing hidden historical comparisons can reappear] -> Reuse only complete published-context judgments with exact sources and current member/publication gates; verify this compatibility change in an isolated acceptance case before optional working-catalog inspection.
- [Shared courses can show different values in different groups] -> Key projections by snapshot identity and document that comparisons retain their evaluation basis; never merge them through a course-ID cache.
- [Long histories increase selection cost] -> Use the existing group/time/ID history index, set-based dependency loads and bounded traversal that can reach candidates beyond the first history page.
- [Stored assets are operational dependencies] -> Retain referenced snapshots and permanent thumbnail assets; backup both database and files. Missing selected files cannot be silently replaced.
- [Parallel frontend work] -> Re-read the active frontend refactor before apply; adapt focused consumers/tests without reverting another change's components or documentation.

## Migration Plan

1. Implement and verify the revised public repository against isolated databases; no migration, source import, ledger rewrite or destructive cleanup is needed.
2. Keep public response shapes stable, update route examples/docs, and verify existing web consumers against retained dates/facts and pin behavior.
3. Exercise the three-course edition, fourth-course approval, refresh, complete replacement, withdrawal and unpublish sequence in isolated acceptance. Any working-catalog readback is read-only; do not manufacture a replacement Python judgment as deployment work.
4. Deploy the application change together. Previously retained published-context judgments can become visible again automatically when their exact source/assets and current membership gates pass.
5. Rollback restores strict current-only public selection, which may hide stale editions again. Retained observations, judgments, memberships and files remain untouched in either direction.
