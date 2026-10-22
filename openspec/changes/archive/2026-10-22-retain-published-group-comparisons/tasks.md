# Tasks

## 1. Retained edition selection and exact source projection

- [x] 1.1 Refactor the public judged-group repository to load published-context retained judgments and their manifest snapshot dependencies without requiring working revision equality; verify isolated API integration tests preserve the original three-course edition after a fourth member is added and after group definition/reference edits.
- [x] 1.2 Project all assessed facts and hosted images from exact same-course manifest snapshots, keying projections by snapshot identity; verify refreshed title/URL/price/offers/rating/instructors/level/duration/source dates do not alter the edition, two groups can retain different snapshots of one course, and individual-course APIs still expose latest facts.
- [x] 1.3 Implement deterministic newest complete ready candidate selection with full-history traversal, missing-input/readiness exclusion and integrity checks; verify tie ordering, candidates beyond 100 historical judgments, null snapshots, mismatched manifest/content or snapshot ownership, and a newer unready judgment preserving a preceding ready edition.
- [x] 1.4 Preserve current publication and assessed-member withdrawal gates after selection; verify unpublishing and removing assessed members hide the whole edition without older-history fallback, removing waiting members does not hide it, and draft-context judgments do not surface merely on publication.
- [x] 1.5 Preserve read-only exact-asset verification and safe errors; verify newer working image failure leaves the edition visible, missing/corrupt selected files do not borrow facts or fall back, storage outages return 503, and reads leave judgments, snapshots, memberships and image attempts unchanged.
- [x] 1.6 Update public route descriptions/examples and docs/catalog.md for retained selection, working isCurrent semantics, source identity, readiness and withdrawal behavior; verify examples against route/contracts and run the relevant API integration tests with an isolated database.

## 2. Public surfaces, replacement and authoring compatibility

- [x] 2.1 Derive summary counts, providers, covers, retained category and search results from the selected edition with current slug routing; verify list filters/totals/pagination and detail agree after working category/membership changes and preserve existing validated response schemas.
- [x] 2.2 Verify complete replacement and pinned traversal across repository and web consumers; tests must show unchanged pins succeed after additions/refreshes, ready four-course replacements switch all content together, old pins return 409 with restart behavior, and strict authoring revision/all-member coverage/idempotent replay still pass.
- [x] 2.3 Verify homepage group cards, featured Python shelf, catalogue, comparison rows, breadcrumbs and metadata use the same edition facts/counts/category; add focused web regressions showing waiting courses absent and no public updating or pending-course section.
- [x] 2.4 Preserve accurate Persian judgment/source dates and wording suitable for historical prices; verify rendered text, keyboard focus, mixed-direction course content and mobile layout remain correct, updating only affected consumers if needed while preserving the concurrent frontend refactor.
- [x] 2.5 Update docs/frontend.md, docs/ai-judge.md, README.md and Plan.md to describe working groups versus public editions, automatic ready replacement, waiting courses, exact historical sources, retained assets and withdrawal/rollback limitations; verify documentation matches API and rendered behavior.

## 3. Integration acceptance

- [x] 3.1 Run an isolated end-to-end acceptance sequence for three-course publication, fourth-course approval, source refresh, unready replacement, ready replacement, assessed/waiting removal and unpublication; verify HTTP readback, historical data values and public desktop/mobile output without mutating the working Python catalogue.
- [x] 3.2 Run workspace lint/type checking, focused core/web and isolated database-backed API tests, API build and web production build as documented; record exact results and any known environment/build limitations in docs/validation.md, and verify the change with strict OpenSpec validation.
