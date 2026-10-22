# Tasks

## 1. Compact query facts and preparation

- [x] 1.1 Capture one isolated pre-change course-query baseline on a restored catalogue (SQL, image-check, hydration and total time); record first-page, selective-filter and later-page measurements and catalogue size in docs/validation.md without touching production or running broad unrelated tests.
- [x] 1.2 Extract shared deterministic search/filter derivation from existing normalization and price selection; verify Persian/Arabic letters, NFKC/ZWNJ/whitespace, literal wildcard characters, instructor/provider matching, offer ties and exact duration boundaries with focused tests, and document projection-version rules.
- [x] 1.3 Add the additive current-course projection/version migration and synchronous ingestion maintenance; verify same-course snapshot constraints, current-pointer/projection atomicity, concurrent acceptance and historical idempotent replay on an isolated database without modifying existing migration checksums.
- [x] 1.4 Extend explicit migration tooling with bounded resumable backfill, completion verification, startup gating and an explicit rebuild/invalidation path; verify populated-catalogue upgrade, interruption/resume, repeat execution, stale-identity rejection and old-writer rollback/re-upgrade. Document the preparation command, writer fencing, truthful partial-failure messages and deadline behavior alongside the tests.

## 2. Image-independent public contracts

- [x] 2.1 Make individual-course image metadata nullable across shared types, schemas, validators, public projection and OpenAPI; explicitly retain nonnull group cover/assessed-course contracts. Verify null-image individual responses and rejection of null group images with focused API/core contract tests, and document the coordinated client upgrade.
- [x] 2.2 Replace thumbnail-gated individual eligibility with accepted-current-observation eligibility for list and detail; verify missing/pending/failed/deleted/corrupt images do not exclude courses or alter totals, minimal references remain private, new facts never borrow old images, and metadata reads neither inspect files nor mutate image state. Preserve management processing/retry and retained-group behavior in relevant regressions; document the new visibility rule.

## 3. Database paging and frontend fallback

- [x] 3.1 Replace in-memory course filtering/paging with parameterized count/page queries in one consistent transaction, compact literal normalized search, existing category eligibility/deduplication and page-only field hydration; verify all filter combinations, stable timestamp ties, zero matches, excessive offsets, concurrent current-fact changes, exact totals and at-most-limit hydration against representative fixtures. Record query plans and justify the chosen ordering/filter indexes.
- [x] 3.2 Adapt the shared individual course card and first-party consumers to null or failed images using the existing Persian fallback, including reset when the image reference changes; verify no fabricated asset request, stable layout, retained provider navigation and unchanged homepage shelf behavior. Check focused web tests plus one narrow/mobile keyboard/RTL pass, and update frontend documentation.

## 4. Integrated acceptance and deployment handoff

- [x] 4.1 Run one post-change comparison against the isolated baseline, using the new visibility rule to separate intended count increases from regressions; verify zero image-filesystem calls and bounded card hydration, and record cold/warm timings plus CPU/RAM limits, including a 0.5-core/1-GB rehearsal where supported. Confirm migration/preparation fits supervisor deadlines or verify the explicit offline path; report limits without claiming a production SLA.
- [x] 4.2 Run the documented lint/type checks and production API/web builds, relevant focused API/core/web regressions, one production image build/upgrade smoke check and strict OpenSpec validation. Update README.md, Plan.md and deployment/validation docs with actual results, backup-first same-disk Darkub release steps, retained group limitations and tested rollback/rebuild instructions; review the scoped diff for private/generated data. Do not run production migrations, deploy, commit or push.

## Workflow follow-up

- Review and archive the accepted change through OpenSpec after implementation acceptance.
- Commit/push and release only when separately requested by the owner.
- For an authorized Darkub release, retain a verified off-disk backup, stop the sole app and remote writers, use the same /data disk and password, complete preparation, verify readiness/catalogue/fallbacks/groups, and resume writers. Do not re-import the database.
