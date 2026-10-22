# Finite local embedding worker

This server-only application worker uses HTTP for all catalog persistence.
It has no database URL, SQL imports, idle queue/daemon, startup hooks, schedules,
remote inference fallback or automatic model download. The independent lab is
unchanged and its evidence/feedback is never imported.

See [workflow and API guide](../../docs/catalog-embeddings.md) for commands,
configuration, recovery, score meaning, discovery promotion and local trust limits.

```sh
bun run worker:embeddings --help
bun run build:embedding-worker
bun apps/embedding-worker/dist/cli.js --help
bun run test:embedding-worker
bun run lint:embedding-worker
bun run typecheck:embedding-worker
```

No command/help prints usage and exits without network calls or catalog writes.
Explicit commands do selected work and exit. Defaults select all eligible courses
and nonprotected group definitions; selected IDs and generation entity scope
narrow that scope. All inference uses the verified installed BGE-M3 artifact.

## Protected management access

Set `DOROB_ADMIN_TOKEN` privately in the process environment for a protected
backend. The client sends it as `Authorization: Bearer <token>` only to backend
management requests, never provider or Ollama requests. A 401 stops automatic
retries; correct the token and resume the existing checkpoint/operation without
changing its replay identity. Explicit `DOROB_DEV_MODE=true` on the application
is the only credential-free mode. See [admin access](../../docs/admin-access.md)
for private state, browser sessions and rotation.
