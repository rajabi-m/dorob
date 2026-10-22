# Tasks

## 1. Configuration and persistent token lifecycle

- [x] 1.1 Add server-only auth configuration/state helpers with strict `DOROB_DEV_MODE` parsing and consistent absolute `DOROB_AUTH_DIR` resolution; verify unset/false/true/invalid values and different working directories with focused tests.
- [x] 1.2 Implement atomic exclusive credential creation, 256-bit tokens, private permissions and safe retained-state validation; verify concurrent initialization, restart reuse, symlink/permission rejection, corrupt state and failed-write behavior in disposable directories.
- [x] 1.3 Add startup initialization, single API token disclosure, dev-bypass notice and internal web/API mode-generation consistency checks; verify protected/bypass/mismatched startup combinations and that ordinary logs/public responses contain no token.
- [x] 1.4 Add offline rotation with lifecycle locking and controlled service restart instructions; verify running services prevent rotation, failed rotation retains valid state, and restarted services reject old tokens/session generations.
- [x] 1.5 Update auth environment examples, launcher propagation and setup/rotation documentation; verify `run.sh` does not silently enable bypass and documented paths/commands match the implementation.

## 2. API enforcement and contracts

- [x] 2.1 Install early namespace-wide bearer authorization before route dispatch/body parsing; verify all registered management routes/methods, exact namespace boundaries, encoded path variants, malformed/incorrect headers and constant-time fixed-size comparison behavior without private reads or side effects.
- [x] 2.2 Document bearer security, safe 401 and challenge headers in Swagger/OpenAPI; verify management authorization works through Swagger and no token is embedded in generated documentation.
- [x] 2.3 Add public-route and authenticated editorial regressions; verify health/categories/catalogues/thumbnails stay credential-free and authorized validation, revisions, conflicts and exact replay retain their behavior using isolated fixtures/databases. Document the endpoint protection boundary.

## 3. Browser sessions and admin authorization

- [x] 3.1 Implement bounded token login, signed eight-hour generation-bound cookie verification and logout with trusted-origin checks; verify cookie flags, expiry, tampering, rotated-token rejection, foreign origins and safe local return destinations.
- [x] 3.2 Gate every protected admin page before private server fetches and every concrete admin handler before privileged forwarding; verify direct handler calls, server rendering/prefetch, mode mismatch, and login exceptions cannot bypass authentication or create a server-credential proxy.
- [x] 3.3 Preserve upstream 401 across group/discovery transport and support reauthentication without automatic mutations; verify unsaved form state and existing promotion/replay identities survive expiry and login recovery.
- [x] 3.4 Build the Persian token-entry screen and logout affordance using shared controls, masked LTR input and accessible reveal/errors; add isolated specimens and verify keyboard focus, mixed-direction tokens, mobile layout and no real credential exposure. Apply project RTL/frontend skills when implementing this UI.
- [x] 3.5 Document browser session duration, logout limits, HTTPS/trusted-origin setup and dev-mode behavior; verify instructions with the local protected login/deep-link/reload/logout flow.

## 4. CLI and AI operator compatibility

- [x] 4.1 Add `DOROB_ADMIN_TOKEN` injection to ingestion client construction and management requests; verify token isolation from provider/image calls, non-transient 401 handling, no token in journals/reports and unchanged delivery recovery. Update utility usage documentation.
- [x] 4.2 Add the same environment-token contract to embedding backend transport; verify GET/POST/control operations, 401 retry termination, no token forwarding to Ollama, no-work help and existing loopback restrictions. Update embedding worker usage documentation.
- [x] 4.3 Update `docs/ai-judge.md` invocation inputs, headers/examples, dev-mode handling and 401 recovery; verify a non-mutating walkthrough asks for absent credentials before protected reads and preserves revision/request identity without persisting secrets or expanding authority.
- [x] 4.4 Update `docs/ai-group-reviewer.md` with the same contract; verify a non-mutating walkthrough covers protected listing, review/promotion/delivery and recovery without token leakage, changed queue scope or automatic publication.

## 5. Integrated acceptance

- [x] 5.1 Exercise API, web and both CLI transports together with disposable persistent auth storage: verify first start, unchanged-token restart, protected deep links, authorized reads/writes against isolated data, explicit bypass and controlled rotation invalidating prior tokens/sessions.
- [x] 5.2 Run documented workspace lint/type checks, relevant auth/API/client/UI suites, API build and web production build; record exact results and any existing Bun production-build blocker without claiming deployment readiness. Review Persian RTL, keyboard and mobile behavior.
- [x] 5.3 Update README, Plan.md and validation records for the implemented boundary and remaining Docker/deployment work; verify OpenSpec strict validation, scope-only diff and absence of secrets/generated outputs. Do not commit, deploy, import data or rotate working credentials.
