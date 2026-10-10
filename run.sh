#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
WEB_PORT=3000

usage() {
  printf 'Usage: ./run.sh [--port WEB_PORT] [--api-port API_PORT] [--db-port DB_PORT]\n'
  printf 'Starts the local PostgreSQL database, migrations, backend and frontend.\n'
  printf 'Defaults: frontend 3000, backend 3001, database 5432.\n'
}
valid_port() {
  [[ "$1" =~ ^[0-9]{1,5}$ ]] && (( 10#$1 >= 1 && 10#$1 <= 65535 ))
}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port|--api-port|--db-port)
      if [[ $# -lt 2 ]] || ! valid_port "$2"; then
        printf 'Expected a port from 1 to 65535 after %s.\n' "$1" >&2
        exit 1
      fi
      case "$1" in
        --port) WEB_PORT="$2" ;;
        --api-port) export PORT="$2" ;;
        --db-port) export POSTGRES_PORT="$2" ;;
      esac
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 1 ;;
  esac
done

for tool in bun docker; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '%s is required. Install Bun and start Docker Desktop, then retry.\n' "$tool" >&2
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf 'Docker Compose and a running Docker engine are required. Start Docker Desktop, then retry.\n' >&2
  exit 1
fi

if ! (cd apps/api && bun -e 'for (const name of ["elysia", "@elysia/openapi", "@sinclair/typebox", "sharp", "swagger-ui-dist/package.json"]) import.meta.resolve(name);' >/dev/null 2>&1) ||
   ! (cd apps/web && bun -e 'import.meta.resolve("next/dist/bin/next");' >/dev/null 2>&1); then
  printf 'Installing project dependencies…\n'
  bun install --frozen-lockfile
fi

# Always use this Compose project's local dev database, including root .env port overrides.
DB_PORT="$(docker compose config --format json | bun -e '
const config = await Bun.stdin.json();
console.log(config.services.postgres.ports[0].published);
')"
export DATABASE_URL="postgres://dorob:dorob_dev@127.0.0.1:${DB_PORT}/dorob"
API_CONFIG="$(cd apps/api && bun -e '
import { loadConfig } from "./src/config.ts";
try {
  const { host, port } = loadConfig(process.env);
  const browserHost = host === "0.0.0.0" ? "127.0.0.1" : host === "::" ? "[::1]" : host.includes(":") ? `[${host}]` : host;
  console.log(port);
  console.log(`http://${browserHost}:${port}/docs`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid API configuration.");
  process.exit(1);
}
')"
API_PORT="${API_CONFIG%%$'\n'*}"
SWAGGER_URL="${API_CONFIG#*$'\n'}"
if (( 10#$WEB_PORT == 10#$API_PORT || 10#$WEB_PORT == 10#$DB_PORT || 10#$API_PORT == 10#$DB_PORT )); then
  printf 'Frontend, backend and database ports must be different.\n' >&2
  exit 1
fi

API_PID=""
WEB_PID=""
STOP_DATABASE=0
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  for pid in "$API_PID" "$WEB_PID"; do
    if [[ -n "$pid" ]]; then kill -TERM -- "-$pid" 2>/dev/null || true; fi
  done
  # Bound shutdown even if a development process fails to exit normally.
  for ((attempt=0; attempt<10; attempt++)); do
    local running=0
    for pid in "$API_PID" "$WEB_PID"; do
      if [[ -n "$pid" ]] && kill -0 -- "-$pid" 2>/dev/null; then running=1; fi
    done
    if [[ "$running" -eq 0 ]]; then break; fi
    sleep 1
  done
  for pid in "$API_PID" "$WEB_PID"; do
    if [[ -n "$pid" ]]; then kill -KILL -- "-$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
  done
  if [[ "$STOP_DATABASE" -eq 1 ]]; then
    printf '\nStopping the dev database (saved data is retained)…\n'
    docker compose stop postgres || true
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ -z "$(docker compose ps --status running --quiet postgres)" ]]; then STOP_DATABASE=1; fi
printf 'Starting the dev database…\n'
docker compose up -d --wait postgres
printf 'Applying database migrations…\n'
bun run db:migrate

# Separate process groups let cleanup stop Bun's watcher and Next's children together.
set -m
bun run --cwd apps/api dev &
API_PID=$!
bun run dev --port "$WEB_PORT" &
WEB_PID=$!

printf '\nDorob development services are starting:\n'
printf 'App:     http://localhost:%s\n' "$WEB_PORT"
printf 'Swagger: %s\n' "$SWAGGER_URL"
printf 'Database: 127.0.0.1:%s\n' "$DB_PORT"
printf 'Press Ctrl+C to stop. Saved database data is retained.\n\n'

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do sleep 1; done
result=0
if ! kill -0 "$API_PID" 2>/dev/null; then
  wait "$API_PID" || result=$?
else
  wait "$WEB_PID" || result=$?
fi
printf '\nA development service exited; stopping the other service.\n' >&2
exit "$result"
