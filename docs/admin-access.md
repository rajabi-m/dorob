# MVP admin access

Administration is protected by default, including every read and write under
`/api/v1/manage`, admin pages and concrete `/api/admin` handlers. Public catalogue,
thumbnail, health and API-documentation routes remain public. The operator token
does not verify the identity claimed by `systemId` or change editorial authority.

`DOROB_DEV_MODE` accepts only `true` or `false`; unset means protected. For trusted
loopback-only development use `DOROB_DEV_MODE=true ./run.sh`. The launcher passes
one explicit mode to both services and prints bypass notices; framework dev mode
does not disable authentication. With normal `./run.sh`, copy the token from the
API startup output and enter it at `/admin/login`.

The API generates a 256-bit token once and keeps private state at
`apps/api/storage/auth` beneath the workspace root. `DOROB_AUTH_DIR` overrides it
with an absolute directory shared by API and web. Start API before standalone web.
The directory must be owned by the service user, mode 0700, without symlink
ancestors; the credential file is mode 0600. Do not share or commit this state.
A future container can mount `/data/auth`; Docker deployment is separate work.

The active token prints once at each successful protected API startup. Anyone
with access to these logs has admin access. Ordinary logs, OpenAPI, working notes,
checkpoints and recovery records must not contain it. Damaged state fails closed;
never delete the credential file as an automatic startup recovery action.

## Browser access

The Persian login exchanges the token for an eight-hour signed HttpOnly,
SameSite=Strict cookie. HTTPS uses Secure cookies. Set `DOROB_WEB_ORIGIN` to the
exact public HTTPS origin (no path, query or fragment); HTTP is allowed only on
loopback for development. API and web must use the same mode and credential state.
Authentication mismatch or unavailable handshake blocks management.

The browser never stores the operator token in localStorage/sessionStorage.
Logout clears that browser's cookie. A separately copied cookie remains valid
until expiry or global token rotation; there is no individual session revocation.
On 401 the panel asks for login while keeping edits and pending recovery identity;
review and retry the intended action explicitly after login.

## CLI and operator agents

Set `DOROB_ADMIN_TOKEN` privately in the invoking environment for ingestion or
embedding commands. Backend requests carry `Authorization: Bearer <token>`;
provider/model requests do not. Avoid command-line token flags, URLs and saved
invocation transcripts. A 401 stops retries: correct the environment credential
and resume the same checkpoint/operation. Existing client destination restrictions
still apply; authentication does not enable remote embedding destinations.

Both AI role guides ask the operator for missing credentials before protected
reads and writes. Explicit dev bypass is the only credential-free management mode.

## Rotation

Stop both API and web first. With the same absolute `DOROB_AUTH_DIR`, run
`bun run auth:rotate` from the workspace, then restart API and web. The replacement
is printed to the operator; old tokens and browser sessions no longer authorize.
Rotation refuses service registrations whose process is still alive. Stale service
registrations from stopped processes are removed during rotation.

A crash during lifecycle operations can leave `lifecycle.lock`. Inspect its PID and
confirm the owner has stopped before manually removing that one lock; do not delete
credential state. Keep backups private. No rotation command runs automatically.
