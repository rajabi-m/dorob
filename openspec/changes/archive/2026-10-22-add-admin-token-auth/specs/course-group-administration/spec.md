# Spec Delta

## MODIFIED Requirements

### Requirement: Local management transport
The panel SHALL follow the `admin-access` protected-mode and explicit dev-bypass contract without admin accounts. Its web management handlers SHALL expose only required operations, use server-only API configuration, disable management caching, and reject cross-origin mutations. Protected handlers SHALL authorize the browser before forwarding bearer credentials. Setup SHALL document authenticated access and trusted loopback-only dev bypass.

#### Scenario: Browser management request
- **WHEN** an authorized browser performs a group mutation, or explicit local dev bypass is active
- **THEN** it uses a scoped same-origin handler without exposing backend configuration or forwarding arbitrary paths

#### Scenario: Foreign origin attempts a mutation
- **WHEN** an unrelated origin sends a mutation to a web management handler
- **THEN** the handler rejects it without modifying catalog data

#### Scenario: Missing browser session
- **WHEN** a protected web management handler is called without a valid session
- **THEN** it returns 401 without contacting the management backend using server credentials

### Requirement: Scoped discovery management transport
Browser discovery reads and mutations SHALL use concrete same-origin admin handlers, bounded validated requests/responses, server-only backend configuration and no-store responses. Foreign-origin mutations and unsupported operations SHALL be rejected. Administration SHALL follow `admin-access` authentication and explicit dev bypass without generic API forwarding.

#### Scenario: Untrusted mutation origin
- **WHEN** a foreign-origin request attempts discovery approval or promotion through the web app
- **THEN** the handler rejects it before contacting the management backend

#### Scenario: Unavailable or malformed backend response
- **WHEN** a discovery response is unavailable or fails validation
- **THEN** the UI shows a bounded Persian error and safe recovery action without reporting success or discarding unsaved editorial input

#### Scenario: Unauthorized discovery request
- **WHEN** browser authorization is absent or the backend rejects the credential
- **THEN** the handler preserves 401 and the UI requests authentication without regenerating pending promotion or review requests
