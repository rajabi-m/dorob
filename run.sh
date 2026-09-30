#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  printf 'Bun is required. Install it from https://bun.sh, then run this script again.\n' >&2
  exit 1
fi

if [[ ! -d apps/web/node_modules/next ]]; then
  printf 'Installing project dependencies…\n'
  bun install --frozen-lockfile
fi

printf 'Starting Dorob. Open /design-system at the Local URL printed below.\n'
printf 'The default preview is http://localhost:3000/design-system\n'
printf 'Press Ctrl+C to stop.\n\n'
exec bun run dev "$@"
