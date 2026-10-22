# admin-access Specification

## Purpose

Protect Dorob's MVP administration through one persistent operator token and authenticated browser sessions while supporting explicit local development bypass.

## Requirements

### Requirement: Explicit development bypass
The application SHALL protect administration when `DOROB_DEV_MODE` is unset or `false`. Only the literal value `true` SHALL bypass admin authentication. Other values SHALL fail startup. API and web processes SHALL agree on the mode; inconsistent configuration SHALL fail closed. Dev bypass SHALL print a clear startup notice and SHALL NOT be inferred from framework development mode.

#### Scenario: Default protected mode
- **WHEN** the application starts without a dev-mode value
- **THEN** unauthenticated management requests are rejected

#### Scenario: Explicit bypass
- **WHEN** both application processes start with `DOROB_DEV_MODE=true`
- **THEN** local admin pages, handlers and management endpoints work without credentials and startup announces the bypass

#### Scenario: Invalid or inconsistent mode
- **WHEN** mode configuration is invalid or the web and API disagree
- **THEN** startup fails or administration remains inaccessible without authorizing a request

### Requirement: Persistent operator token
Protected startup SHALL generate a token containing at least 256 bits of cryptographic randomness only when no credential state exists. It SHALL persist the token in private configurable storage and reuse it after restarts. Unreadable, malformed or insecure credential state SHALL fail startup rather than regenerate or bypass protection. Secrets SHALL NOT be committed or embedded in browser assets.

#### Scenario: First protected startup
- **WHEN** protected startup finds an empty writable credential location
- **THEN** one token is created atomically with owner-only access and reused by API and web authorization

#### Scenario: Restart or concurrent initialization
- **WHEN** services restart or initialize concurrently against the same credential location
- **THEN** they use the same retained token without replacing it or authorizing with different tokens

#### Scenario: Damaged credential state
- **WHEN** retained state cannot be safely read or validated
- **THEN** startup reports a secret-free actionable error without replacing the state

### Requirement: Token disclosure and rotation
The protected API SHALL print the active token once per successful startup for the operator. Other logs, responses and recovery artifacts SHALL redact credentials. A documented explicit rotation command SHALL atomically replace the token while application services are stopped. After restart, prior tokens and sessions SHALL be invalid. Rotation failure SHALL preserve the prior valid state.

#### Scenario: Retrieve the credential
- **WHEN** protected API startup completes
- **THEN** its startup output includes the active copyable token once and ordinary request logs do not include it

#### Scenario: Rotate with controlled restart
- **WHEN** the operator stops both services, rotates the token and restarts them
- **THEN** only the replacement token authorizes new requests and old browser sessions are rejected

### Requirement: Backend management authorization
In protected mode every method under `/api/v1/manage` SHALL require `Authorization: Bearer <token>` before private reads, writes or execution. Missing, malformed or incorrect credentials SHALL return a safe `401` with a Bearer challenge. Comparison SHALL avoid token-dependent timing. Authentication SHALL NOT grant authority beyond existing endpoint semantics or treat caller-supplied system IDs as verified identities.

#### Scenario: Reject unauthorized management read
- **WHEN** a management GET has no valid bearer token
- **THEN** the API returns 401 without querying private evidence

#### Scenario: Reject unauthorized execution
- **WHEN** ingestion, upload, judgment, membership or embedding execution lacks valid credentials
- **THEN** the API returns 401 before processing a body or performing side effects

#### Scenario: Valid operator request
- **WHEN** a management operation includes the current token
- **THEN** existing validation, revision, replay, conflict and editorial rules still apply

### Requirement: Public access and API documentation
Public catalogues, categories, hosted thumbnails, greeting and health endpoints SHALL remain accessible without an admin credential. Swagger/OpenAPI SHALL document bearer authentication and 401 responses for management operations and support explicit token entry without embedding a live token. Documentation and public requests SHALL NOT disclose credential or session state.

#### Scenario: Public visitor
- **WHEN** a visitor browses catalogues or loads a thumbnail without authentication
- **THEN** the request retains its existing public behavior

#### Scenario: Swagger management operation
- **WHEN** an operator supplies a token using Swagger authorization
- **THEN** management requests include the bearer header and public operations remain unauthenticated

### Requirement: Browser token entry and sessions
Protected admin navigation SHALL require a valid session before rendering private content or fetching private data. A Persian token-entry screen SHALL exchange a valid token for an expiring HttpOnly, SameSite session cookie; HTTPS cookies SHALL be Secure. Sessions SHALL expire after at most eight hours, survive ordinary reloads and support logout. Tokens and session credentials SHALL NOT use browser local/session storage or URLs.

#### Scenario: Open a protected deep link
- **WHEN** an unauthenticated visitor opens an admin page
- **THEN** token entry is shown without private content and successful login returns only to a validated same-origin admin destination

#### Scenario: Invalid login or expired session
- **WHEN** a token is incorrect or a session expires or belongs to an old token
- **THEN** no protected action occurs and the UI offers token entry with a safe Persian message

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** their browser credential is cleared and subsequent requests from that browser require authentication

### Requirement: Authorized web management transport
Every web admin handler and server-side management fetch SHALL authorize the caller before forwarding credentials to the API. A configured server credential alone SHALL NOT authorize a browser request. Login, logout and cookie-authenticated mutations SHALL reject foreign origins. Sensitive responses SHALL be no-store; unauthorized requests SHALL remain 401 rather than becoming 503. Public handlers SHALL NOT expose management forwarding.

#### Scenario: Call an admin handler directly
- **WHEN** a caller without a valid session directly invokes a web admin handler
- **THEN** it returns 401 without using the server's token to call the management API

#### Scenario: Cross-origin session request
- **WHEN** a foreign origin attempts login, logout or a management mutation
- **THEN** it is rejected before session changes or management execution

#### Scenario: Authorization lost during editing
- **WHEN** a management response reports 401 while the user is editing or recovering an operation
- **THEN** authentication is requested without automatically replaying mutations or discarding pending recovery identity

### Requirement: Authenticated operator clients and guides
Ingestion and embedding CLI clients SHALL accept `DOROB_ADMIN_TOKEN` and attach it only to management requests at the validated backend origin. Both AI role guides SHALL request the token from the operator when protection is enabled and no credential is supplied. Every management read and write SHALL authenticate. A 401 SHALL stop automatic retry and request credential correction without replacing pending requests or editorial scope.

#### Scenario: CLI delivery
- **WHEN** an operator runs a management CLI command with a token
- **THEN** requests carry the bearer header without leaking it to provider/model calls, logs, checkpoints or reports

#### Scenario: AI role invocation
- **WHEN** either guide is used in protected mode without a supplied token
- **THEN** the agent asks the operator before management access, keeps the supplied token out of evidence and recovery files, and sends it in the header for every management request

#### Scenario: Rotation during pending delivery
- **WHEN** a saved submission encounters 401
- **THEN** recovery pauses for a valid token while retaining the original destination, body, revision and replay identity

### Requirement: Accessible token-entry presentation
The token screen SHALL use existing Persian RTL design tokens and reusable controls, explicit LTR token input, a masked input with accessible reveal control, labelled errors, visible keyboard focus and narrow-screen layout. New shared variants SHALL have isolated design-system specimens without real credentials or backend mutations.

#### Scenario: Keyboard and mobile entry
- **WHEN** the user enters a long token on a narrow screen using a keyboard
- **THEN** the token remains unmodified and readable on reveal, controls have visible focus and the page has no horizontal overflow
