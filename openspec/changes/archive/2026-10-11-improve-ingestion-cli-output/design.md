# Design

## Context

See proposal.md for motivation. `ingest-maktabkhooneh.ts` prints `JSON.stringify(result, null, 2)` after `ScraperWorker.run()`; its executable catch discards the exception. The worker retains failure phase/code in its private journal but returns a report without those failures and with an observation identity row for every selection. The backend client already categorizes HTTP status, timeout and transport failures and bounds retries; generic transport causes are deliberately discarded. Existing CLI, worker and backend-client tests use injectable services and fixtures. The main `scraper-worker` spec already fixes durability and stopping behavior.

## Goals / Non-Goals

**Goals:** Add reporting across CLI, worker and request boundaries without making logging part of the durable state machine. Keep terminal output useful for long runs and machine output opt-in.

**Non-Goals:** A terminal UI framework, new dependencies, automatic backend startup, changed retry policy, a journal schema migration, richer persisted exception text, or diagnosing/repairing the actual service failure.

## Decisions

### Separate ephemeral events from durable state

Add an optional typed observer for discovery, stage start/completion, retries, failure and run completion. Events carry allowlisted diagnostic codes and safe context: course position/identity, phase, attempt, wait and backend origin. Connect request retry events through the collector and backend client as needed; optional hooks leave legacy exporters silent. Emit success/state changes only after the corresponding checkpoint save succeeds. Reporting failures must not prevent persistence or delivery, and observer events must not contain payloads or receipts. This preserves existing journal files and the full `RunReport` shape; putting human messages into checkpoints would require migration and risk replay compatibility.

For resume, use saved phase/code for unresolved entries and runtime events for fresh failures. Old journals can explain `transport`, not recover the discarded original exception. Do not promise exact connection causes. If new requests expose a known connection code, map only recognized codes; never echo arbitrary error messages or bodies. Classify CLI validation, discovery, filesystem and lock errors at their source so the executable catch can render a specific safe category with a generic fallback for unknown failures.

### Use a small terminal reporter

Keep the existing English operator CLI convention. Use a replaceable status line on TTY stderr with course position, bounded safe identity, stage, counters and elapsed time. Print permanent failure/retry lines after clearing that line. On non-TTY stderr use append-only stage/progress updates throttled to ten seconds, plus immediate startup, retry/failure and final lines; avoid per-course success output. A ten-second heartbeat covers discovery and long requests without inventing progress. Clear timers and the active line in `finally`, including fatal exits and cancellation. No progress bar library is needed.

Strip terminal control characters from all displayed context and bound lengths, including decoded public course identities. Use a course title only after collection; otherwise use provider course key or a bounded URL. Final human summary goes to stdout; human progress and diagnostics go to stderr in both modes.

### Bound the summary and make recovery truthful

Use existing aggregate counts plus a derived unattempted count from entries with no collection attempt or observation; do not count collection failures as unattempted. Summarize accepted facts and image states separately. Include status/stop reason, elapsed time and saved checkpoint location. Failure details appear as they happen, while the final summary groups codes and does not enumerate every selection. Cap displayed failure groups and show an omitted-group count if necessary.

Offer resume only when a validated saved journal has retryable unresolved work. Include the effective backend origin, checkpoint path and shell-safe quoting so paths containing spaces/apostrophes work. Terminal delivery rejection gets review guidance; fatal checkpoint mismatch/lock errors do not trigger destructive recovery advice. Discovery failure before journal creation must not claim saved progress. Preserve the current nonzero status for partial, pending and interrupted runs.

### Preserve machine report compatibility explicitly

Add `--json` to help and option parsing. With a run result, serialize the existing full report exactly once to stdout; progress and failure explanations remain on stderr. Before a report exists, emit `{ "error": { "code": "<safe-code>", "message": "<safe-message>" }, "exitCode": 1 }` once. Recognize JSON mode even for invalid options so the executable boundary does not mix arbitrary text into stdout. Default output changes intentionally; scripts parsing the old stdout must add `--json`. Keep the exported worker/report API intact.

## Risks / Trade-offs

- Shared request hooks could affect other adapters: keep them optional and run existing utility regressions.
- Terminal output could expose untrusted content: allowlist diagnostics, strip controls and never include raw errors, responses or payloads.
- Long pauses could still look stalled: report the active stage with ten-second liveness; no ETA until a defensible estimate exists.
- Old checkpoints lack detailed causes: report their known codes and safe guidance rather than inventing specifics.
- Human-default stdout breaks report-parsing scripts: document explicit `--json`, preserving the report structure.
- Excess progress could replace the JSON spam with log spam: throttle redirected progress, aggregate final failures and test a synthetic 1,000-selection run.

## Migration Plan

No data migration is needed. Existing journals, including the owner's pending 1,000-selection run, remain valid under the same extractor/backend compatibility rules. Update root and utility READMEs with output examples, machine mode and resume guidance. Rollback restores the previous CLI formatting without changing saved observations, receipts or backend data. Validate with fixtures/fake services; this change does not require another live 1,000-course crawl.
