# Proposal

## Why

The ingestion command stays silent during collection, then dumps every selected course as JSON while omitting the reason it stopped. The owner's 1,000-selection run collected one course and stopped on backend transport failure, leaving the operator without useful progress or recovery guidance.

## What Changes

- Show startup, discovery, current course/stage, bounded retry updates and periodic liveness during long waits.
- Report safe, actionable failures immediately, distinguishing collection, backend delivery and thumbnail processing.
- End with a compact summary, saved checkpoint location and appropriate recovery guidance, including a reproducible resume command when recovery is possible.
- **BREAKING**: Replace default JSON stdout with readable terminal output; retain the full existing machine report through explicit `--json` mode.
- Preserve current selection, request limits, retries, checkpoint format, resume identity, stop rules and exit codes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scraper-worker`: Specify ongoing progress, bounded default terminal output, safe failure diagnostics and opt-in machine output.

## Impact

Changes are limited to the ingestion CLI, worker reporting/event hooks, safe request diagnostics in the collector/backend client where needed, nearby tests and operator documentation. No new runtime dependency is expected. No backend API, database, frontend, legacy export command, scheduling or checkpoint migration is included. The actual backend outage is separate from this reporting change.
