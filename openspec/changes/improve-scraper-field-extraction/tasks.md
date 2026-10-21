# Tasks

## 1. TopLearn extraction corrections

- [ ] 1.1 Fix nested/inline educational label traversal, starting with the real n8n outcome paragraph; add reduced attributed fixtures and regressions for sibling paragraphs, inline values, Persian spacing and adjacent unrelated sections, and verify outcomes retain source evidence through unchanged validation.
- [ ] 1.2 Inspect the 12 retained positive-count missing-syllabus cases and representative zero-count pages using bounded read-only requests; implement only verified alternate lesson markup, add positive/missing-source regressions, and record recovered versus unresolved cases with published/extracted counts.
- [ ] 1.3 Recheck the linked public course script and its disclosed comments response; implement only an evidenced response/route variation within existing origins and limits, verify unavailable versus confirmed-empty, classification/redaction and later-page-failure cases, and retain unknown feedback if no usable source is established.
- [ ] 1.4 Correct educational coverage when facts are populated; run `bun test apps/utils/tests/toplearn.test.ts`, update `docs/provider-audits/toplearn.md` with actual results and the bounded failed-course-URL recheck, and document that existing thumbnail failures require separate operational recovery.

## 2. Roocket pricing and rating corrections

- [ ] 2.1 Preserve explicit free classification for archived courses using existing pricing/provider-state fields; add a reduced Canvas fixture and regressions for archived-free, archived-paid, ambiguous zero, coming-soon and contradictory prices, verifying zero free pricing coexists with unchanged unavailable state without access guarantees.
- [ ] 2.2 Suppress aggregate rating for explicit zero votes, preserve known positive/unknown-count cases, and improve educational extraction only for observed explicit labels; verify rating and adjacent-section negative cases through unchanged validation and existing source locators.
- [ ] 2.3 Diagnose the retained syllabus-count mismatch and recheck CSS Grid/Flexbox HTTP failures using bounded read-only requests; recover only evidenced omitted structures, test ordering/mismatch behavior, run `bun test apps/utils/tests/roocket.test.ts`, and update `docs/provider-audits/roocket.md` with fixes, persistent errors and archived-state UI limitations.

## 3. Sabzlearn evidence and diagnostics

- [ ] 3.1 Check matching course JSON-LD and directly disclosed public rating presentation/module semantics for a verified scale; populate the existing nullable-count rating only if proven, add proven-scale/unresolved-scale/zero-vote and mixed-comment-count regressions, and record inspected sources and the actual outcome without assuming five points.
- [ ] 3.2 Expand explicit educational label/list/FAQ handling and remove misleading paid-currency warnings from confirmed free extraction; verify course-scoped positive cases, unrelated marketing exclusions, paid-currency safeguards and free provenance using attributed fixtures and unchanged validation.
- [ ] 3.3 Verify existing feedback page/item bounds and stop reasons remain accurate without changing defaults or settings; run `bun test apps/utils/tests/sabzlearn.test.ts` and update `docs/provider-audits/sabzlearn.md` with extracted improvements, unresolved ratings/date limits and existing options for deeper later collection.

## 4. Maktabkhooneh conservative corrections

- [ ] 4.1 Inspect representative retained syllabus mismatches against public chapter/unit structures and published-count semantics; repair only evidenced omissions within existing embedded collection, add ordering/count and effort-versus-content regressions, and preserve partial coverage for unresolved cases without adding review traversal or settings.
- [ ] 4.2 Suppress explicit zero-vote aggregates and improve existing educational fields only for observed explicit statements; verify unknown counts are distinct from zero and that disabled prices, free-type evidence, provider identity and legacy v2 shape remain intact in `bun test apps/utils/tests/maktabkhooneh.test.ts apps/utils/tests/maktabkhooneh-v3.test.ts`.
- [ ] 4.3 Document fixed and source-blocked Maktabkhooneh cases in `docs/provider-adapters.md`, including page-only review sampling, unchanged raw date handling and the unknown-price course outcome; verify every claim against fixtures or recorded bounded source checks.

## 5. Compatibility and integrated verification

- [ ] 5.1 Update version constants only for changed extractors through existing mechanisms, verify existing journal/version checks remain untouched with relevant utility tests, and document fresh-checkpoint requirements and the absence of automatic catalog refresh in `apps/utils/README.md` and `docs/provider-adapters.md`.
- [ ] 5.2 Run `bun run test:utils`, `bun run lint`, `bun run typecheck`, `bun run build:api` and `bun run build`; record actual results or specific blockers in `docs/validation.md`, with no contract changes or dependency installation to evade failures.
- [ ] 5.3 Perform bounded read-only live verification for representative changed providers, compare only affected facts with the audit baseline and validate outputs through unchanged validators; record provider-specific before/after results or access blockers without ingesting, processing thumbnails, saving/resuming journals or rewriting catalog data.
- [ ] 5.4 Review the scoped diff to confirm no shared contract/schema, API, database, frontend, CLI/worker/journal, dependency, lockfile or existing-output edits; update affected README/Plan status with consequential results, verify `git diff --check` and `openspec validate improve-scraper-field-extraction --strict`, and leave unrelated contributor work untouched.

## Workflow follow-up

- Review these planning artifacts before explicitly invoking implementation.
- Any later catalog recollection/ingestion, thumbnail recovery, commit, branch or push requires its own user instruction; a scraper fix does not refresh retained facts.
- Archive and sync the delta only when separately requested after implementation and review.
