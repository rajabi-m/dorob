# Proposal

## Why

Dorob's administration currently trusts local access and has no authentication. Before deployment, management reads and writes need one consistent MVP access boundary shared by the API, browser panel, CLI workers and operator-driven AI guides.

## What Changes

- **BREAKING**: Require an opaque bearer token for every backend management request unless `DOROB_DEV_MODE=true` is explicitly configured. Unset configuration protects administration; invalid configuration fails startup.
- Generate a strong token once, retain it in private persistent storage, print it once at each protected API startup, and provide explicit rotation that invalidates existing credentials and browser sessions.
- Add Persian token entry, expiring HttpOnly browser sessions and logout; authorize web admin handlers and forward bearer credentials only after browser authorization.
- Add environment-based token support to ingestion and embedding clients, preserve unauthorized errors, and retain existing operation/replay recovery rules.
- Update `docs/ai-judge.md` and `docs/ai-group-reviewer.md` to obtain the token from the operator, authenticate every management read/write and exclude secrets from working records.
- Keep public browsing and health checks unauthenticated. Preserve explicit local development and the existing editorial contracts.

## Capabilities

### New Capabilities

- `admin-access`: Own protected-mode configuration, persistent token lifecycle, backend authorization, browser sessions and authenticated operator clients.

### Modified Capabilities

- `course-group-administration`: Replace the local-only, authentication-deferred transport constraints with token/session protection while preserving scoped handlers, same-origin checks and dev-mode access.
- `course-group-curation`: Permit the authenticated editorial workflow while retaining explicit local dev bypass and every existing editorial boundary.

## Impact

Affects API startup/configuration and management route composition; Next.js admin pages and handlers, server-side admin transport and shared login UI; ingestion/embedding HTTP clients; `run.sh`, environment examples, README/Plan and auth documentation. Adds private filesystem state, not database tables or user accounts. Existing local-only client destination restrictions stay intact. Docker packaging, data migration, deployment, remote-worker enablement, roles, OAuth and automatic AI execution are out of scope. Planning creates only this change's artifacts; guide and application edits occur during apply.
