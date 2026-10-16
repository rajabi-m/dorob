# Tasks

## 1. Establish the existing catalog inventory

- [x] 1.1 Confirm the intended local backend origin and availability using categories and readiness reads; record the credential-free origin and execution date in `docs/curation/initial-course-groups.md`, or document the precise unavailable-service blocker without inventing data.
- [x] 1.2 Before any curation write, create a timestamped complete custom-format dump of the confirmed target database under ignored `apps/api/storage/backups/`; verify successful exit, nonempty archive, readable `pg_restore --list`, and SHA-256 checksum, and record its identity/path/time without secrets in the report.
- [x] 1.3 Restore the backup into a new isolated temporary database and compare schema, migration ledger, record counts, group definitions and exact memberships against the quiescent pre-work baseline; verify success before writes, remove only the temporary verification database, and document restore commands and their effect on post-backup changes. Block curation writes if verification cannot complete.
- [x] 1.4 Read all management course pages and each current observation; verify unique canonical IDs against pagination totals and record provider totals, snapshot IDs/dates, missing observations, readiness, and failed reads in the report.
- [x] 1.5 Read all existing management groups and their membership pages; record the pre-existing IDs/slugs, fields, publication state, and memberships needed to verify preservation and resolve collisions before writes.

## 2. Research and define initial groups

- [x] 2.1 Research candidate comparison sets across `code`, `design`, `data`, `business`, `language`, and `tools` using substantive retained evidence and identified public pages when necessary; verify that the report covers each category with supported candidates or an explicit evidence/course gap.
- [x] 2.2 Select focused groups with at least two evidenced existing members each; record Persian title, slug, category, description within API limits, nullable target level, inclusion/exclusion scope, and exact canonical member IDs, and verify each member's documented fit beyond title similarity.
- [x] 2.3 Record per-member snapshot/source references, collection dates, fit reasoning, readiness, and separately dated supplemental research; verify unresolved candidates are excluded and single-provider limitations are explained where applicable.
- [x] 2.4 Check proposed slugs and identities against the existing-group inventory and prepare the persistence ledger; verify no plan requires overwriting unrelated records, publishing drafts, collecting new courses, or changing source facts.
- [x] 2.5 Document the one-time agent/editorial workflow and its separation from backend AI and future automatic assignment in `docs/catalog.md`; verify the documented management operations match existing route schemas and the report is linked from `docs/index.md`.

## 3. Persist and verify explicit draft groups

- [x] 3.1 Recheck selected courses and slug collisions immediately before mutation, then create researched groups through management POST with `isPublished: false`; verify returned definitions and record each group ID/outcome in the ledger, reconciling uncertain POST responses before any retry.
- [x] 3.2 Assign only the selected existing course IDs through URL-encoded membership PUT operations; verify successful responses and record confirmed/pending links after each group without changing unrelated memberships or observations.
- [x] 3.3 Read back every created group's fields and all membership pages; verify exact member IDs, distinct counts, descriptions, category, target level, and draft flag against the report, marking only fully verified groups persisted.
- [x] 3.4 Reconcile and repeat this change's confirmed membership PUTs, then read back group identities and counts; verify continuation adds no duplicate groups/links and preserve unresolved outcomes as pending rather than claiming completion.
- [x] 3.5 Update the report ledger and `Plan.md`/`README.md` with actual curation outcomes, category gaps, draft status, and remaining MVP scope; verify documentation does not imply publication, frontend group integration, or automatic assignment exists.

## 4. Verify the complete editorial delivery

- [x] 4.1 Compare pre/post catalog state and public group reads; verify unrelated groups/memberships and selected source snapshot identities are preserved and the new drafts remain absent from public group eligibility.
- [x] 4.2 Perform a normal API restart where available and read back the created groups and memberships; verify stable IDs/links persist without database reset, and document any check the environment prevented.
- [x] 4.3 Validate the completed curation report against the delta scenarios and run `openspec validate curate-initial-course-groups --strict`; verify all six categories are accounted for, every persisted member has evidence, and pending work/limitations are explicit. No application-code tests or production build are required for this data/documentation-only scope; if application code proves necessary, resolve scope before proceeding.

## Workflow follow-up

- Keep the verified database backup; restore the working database only on an explicit owner request, following the recorded recovery procedure.
- Present the verified draft groups and coverage report for owner review. Publication requires a separate instruction and is not a completion prerequisite for this draft-curation change.
- Connect reviewed real groups and factual comparisons to the frontend in a separate change.
- Design automatic course-to-group assignment separately, using the documented group boundaries and curated examples as input.
- Commit only after explicit user confirmation; no branch creation or push is included.
