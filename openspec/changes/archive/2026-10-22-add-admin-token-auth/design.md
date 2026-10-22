# Design

## Context

See proposal.md for motivation and scope. `apps/api/src/app.ts` composes all management APIs without authentication; management paths share `/api/v1/manage`. `apps/web/src/lib/admin-api.ts` owns scoped forwarding and existing Origin checks but converts unrecognized upstream errors, including 401, to 503. The admin layout has no gate, and discovery uses its own transport paths. Ingestion and embedding HTTP clients currently send no token; the embedding worker requires loopback destinations. Both AI guides describe trusted unauthenticated local use. Existing administration and curation specs explicitly defer auth; their deltas replace those constraints.

The Next.js application renders server components and has concrete browser admin handlers, so headers alone cannot authenticate ordinary page navigation. The known Bun Next.js production page-data blocker remains outside this auth change; successful production deployment is not an acceptance claim here.

## Goals / Non-Goals

**Goals:** A consistent fail-closed management boundary; persistent operator credentials usable by humans and tools; a reload-friendly browser session; no changes to editorial data, inference or recovery identity. Keep secret-bearing code server-only and out of browser-safe core contracts.

**Non-Goals:** Docker or platform deployment, database migration, multiple accounts, per-agent identities, permission tiers, remote-worker destination expansion, lab authentication or automatic inference. The independent loopback experiment lab remains independent.

## Decisions

### 1. One explicit configuration and credential state

Use `DOROB_DEV_MODE`, parsing only unset/`false` as protected and literal `true` as bypass. Do not derive security from NODE_ENV. `run.sh` forwards the selected value consistently and does not silently turn bypass on. Example local instructions explicitly opt into dev bypass or use the printed token.

Use `DOROB_AUTH_DIR`, an absolute server-only path with a stable ignored default under `apps/api/storage/auth`, resolved consistently for commands launched from different working directories. A future container will point it at `/data/auth`. Store a versioned credential record with mode 0600 under a directory with mode 0700; reject symlinks, malformed records and unsafe permissions. Generate 32 random bytes encoded as base64url. Initial publication must be atomic and exclusive so concurrent starters adopt one complete record. Never replace unreadable state as a recovery shortcut.

The API initializes state before listening and prints its active token once after successful protected startup. Web startup reads the same state before accepting admin traffic. Put filesystem/crypto helpers in a dedicated server-only module/package, not `@dorob/core`. A wrong or absent web credential state fails closed. Include a non-secret internal mode/credential-generation handshake between web and API so even a valid web session cannot forward into an inconsistent bypass instance. It is loopback/internal, not a public proxy or a token-disclosure endpoint. Unavailability blocks admin, not public browsing.

Alternative: environment-only credentials would avoid a file but would not satisfy the approved generated, persistent token lifecycle. Generating on every restart would break operator clients and sessions.

### 2. Explicit offline rotation

Provide a documented rotation CLI requiring both app services stopped, guarded by the auth-state lifecycle lock. Publish a fresh token atomically and retain the old valid record if publication fails. Restart both processes to load the same replacement. A persistent generation identifier binds browser sessions and internal consistency checks to that credential. Do not implement hot rotation or an unauthenticated HTTP rotation endpoint. Rotation outputs the replacement to the operator; auth state and prior secret backups never enter Git.

### 3. Enforce in API before dispatch and body parsing

Install a global early request guard before route plugins: match the exact `/api/v1/manage` namespace boundary, all descendants and all methods. Authenticate before repository access, uploads, raster work or expensive request parsing. Verify bounded well-formed bearer credentials using fixed-size constant-time digest comparison. Return 401 with `WWW-Authenticate: Bearer`, a safe body and no-store headers. Validate actual framework hook ordering with integration tests instead of assuming plugin inheritance. Test malformed/encoded paths against routing normalization to prevent alternate path bypass.

Public APIs, `/assets/thumbnails`, greeting, health and Swagger remain public. Declare HTTP bearer security and management 401 responses in OpenAPI, leaving public operations unmarked. Shared auth grants operator access, not verified authorship: `systemId` remains caller supplied. Existing revision and replay behavior remains unchanged after authorization.

### 4. Browser session with backend bearer forwarding

Add `/admin/login` and concrete session/login/logout handlers. The token is submitted once in a bounded same-origin POST body and verified server-side. Use a signed, versioned cookie containing a random nonce, issued/expiry times and credential generation, with a domain-separated signing key derived from the retained token. Absolute expiry is eight hours, with no silent extension. Validate signatures, bounds, generation and expiry on every protected operation. Keep the token out of the cookie payload. Logout clears the browser cookie; token rotation revokes all sessions. There is no per-session server revocation list in this MVP.

Cookies are HttpOnly, SameSite=Strict, Path=/, host-only and Secure on HTTPS. Plain HTTP cookie operation is allowed only for trusted loopback development/testing. Use an explicit trusted public origin setting for deployed login/mutation Origin checks and Secure-cookie decisions; do not trust arbitrary forwarded headers. Preserve existing no-store responses and cross-origin protections. Safe return destinations are local `/admin` paths only; reject external, protocol-relative or encoded bypass destinations.

Gate admin server rendering before any private fetch; a layout-only check is insufficient for independently callable handlers or prefetches. Every admin handler and server-side admin request authorizes its caller independently. Only then does the web server attach its current token to the fixed upstream management origin. A missing browser session never causes use of a privileged server token. Direct CLI traffic uses backend bearer authentication, not browser cookies. Keep public thumbnail proxy requests credential-free.

Add explicit 401 handling throughout group and discovery clients: request login, preserve unsaved input and existing pending promotion/replay records, and never replay mutations automatically after login. Preserve uncertain-write state across reauthentication; secret fields are excluded from its existing storage. Use shared Persian controls and styling, masked LTR input, accessible reveal/error/focus states and isolated specimens. No login account or password-reset UI is introduced.

Alternative: localStorage bearer credentials simplify fetch calls but expose a durable operator secret to JavaScript and do not authenticate server-rendered navigation. HTTP Basic authentication would not provide the requested token-entry flow and common CLI bearer contract.

### 5. Clients and AI guides

Both ingestion and embedding commands read `DOROB_ADMIN_TOKEN` from environment and pass it explicitly into their backend transport. Do not use a CLI token flag that exposes it in process arguments. Keep existing destination validation, redirect refusal, timeouts and operation recovery. Never attach credentials to provider scraping/image/model requests. A 401 is non-transient and stops automatic retries with a credential-safe diagnostic. Help commands still do no work or credential initialization.

Revise both AI guides' invocation inputs and request examples: ask the operator for a token before protected reads, accept an explicitly stated dev bypass, use bearer headers on every management request and pause on 401. Never discover the token by reading service logs/files on the user's behalf as part of these roles. Do not persist credentials with durable evidence/recovery records. Reauthentication does not change request UUIDs, revision rules, selected groups, membership limits or publication authority. Retain current trusted loopback origin restrictions; public remote-agent ingress belongs to deployment planning.

## Risks / Trade-offs

- Shared credential grants all management authority → suitable for one-owner MVP; no verified per-agent attribution or individual revocation.
- Required startup output discloses the secret to log readers → document that log access grants admin access, print only in the dedicated startup message and redact every other path.
- Browser cookie authenticates mutations automatically → keep strict same-origin checks including login/logout, SameSite and trusted HTTPS configuration.
- Signed-cookie logout does not invalidate a separately stolen copy → eight-hour bound and operator rotation revoke wider access; no claim of individual server-side revocation.
- Different process modes/state could bypass or break auth → internal consistency check and fail-closed admin behavior; test mismatches.
- New default breaks unauthenticated local scripts → explicit documented bypass or environment token, with focused worker compatibility tests.

## Migration Plan

1. Implement and validate against disposable auth directories and isolated test databases; do not rotate working credentials or mutate the live catalogue during acceptance.
2. Document new protected defaults, consistent absolute auth directory, trusted web origin, token handling, rotation and both client paths. Retain existing loopback listener defaults.
3. For first protected operation start API to initialize the private record, then start web against the same location and mode. Retrieve the token from API startup output and log into admin; configure worker environment when needed.
4. No SQL migration or reingestion is needed. Existing records, editions and pending recovery payloads remain intact.
5. Rollback application code only in a trusted loopback environment: older code has no auth. Retain private credential state for a later forward recovery; do not expose a rolled-back unauthenticated app publicly.
