#!/bin/sh
set -eu
node /app/container/storage.mjs preflight
exec flock --nonblock --conflict-exit-code 73 --no-fork /data/.runtime.lock node /app/container/supervisor.mjs "$@"
