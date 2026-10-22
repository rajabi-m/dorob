# Tasks

## 1. Safe worker and request reporting

- [x] 1.1 Add optional typed worker lifecycle events and safe diagnostic categories for discovery, collection, delivery, image processing and fatal checkpoint errors; verify event order and that throwing observers cannot change checkpoint-before-delivery, stop or resume behavior with worker tests.
- [x] 1.2 Expose bounded request retry events from backend and provider transport with attempt/wait and allowlisted reason codes; verify timeout, HTTP failure, transport exhaustion and secret-bearing exceptions with backend-client/collector tests while preserving retry counts and legacy silence.
- [x] 1.3 Provide aggregate summary context, saved-progress state and unresolved failure categories without changing the journal schema or existing full report fields; verify an existing-format journal resumes and a synthetic 1,000-selection first-delivery failure produces one pending and 999 unattempted entries.
- [x] 1.4 Document optional observer and diagnostic behavior in apps/utils/README.md; verify examples match the implemented interfaces and explain that historical transport codes cannot recover discarded causes.

## 2. Terminal output and machine mode

- [x] 2.1 Implement the CLI reporter with startup/discovery/resume messages, TTY status replacement, ten-second liveness and throttled non-TTY lines; verify captured TTY/non-TTY output with an injectable clock, cancellation cleanup and no per-course success spam.
- [x] 2.2 Replace the default JSON dump with a bounded summary and immediate stage-specific errors; add truthful recovery guidance and shell-safe resume commands including backend destination. Verify collection, delivery, image, lock/mismatch, terminal rejection and pre-checkpoint failures, including paths with spaces/apostrophes and unsafe control characters.
- [x] 2.3 Add --json and a safe executable fatal-error boundary; verify stdout is exactly one existing-format report or the designed error document, stderr holds diagnostics, option errors retain useful causes and exit codes remain correct. Preserve standalone --help behavior and document it in CLI help.
- [x] 2.4 Update root README.md and apps/utils/README.md with human output examples, --json migration and resume guidance; verify help and documented flags and record the reporting decision in Plan.md without claiming the pending live run succeeded.

## 3. Integration verification

- [x] 3.1 Run offline CLI/worker integration coverage for complete, partial, canceled and resumed runs plus a synthetic 1,000-selection backend failure; verify bounded output, machine parsing, privacy and unchanged observation IDs/receipts without a live catalog crawl.
- [x] 3.2 Run bun run test:utils, bun run lint, bun run typecheck, bun run build and git diff --check; record results and any environment/build limitations in docs/validation.md, and verify only this change's intended files were modified.
