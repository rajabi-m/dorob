# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian-only RTL course discovery and comparison product. Phase 1's design system is accepted; **phase 2 is complete for now**, by owner decision on October 4, 2026. Phase 3 architecture and production integration remain pending.

Start with the [documentation hub](docs/index.md), [project plan](Plan.md), and [contributor instructions](AGENTS.md).

## Current experience

- `/`: snapshot-backed homepage with Persian search, category/free filtering, shared course cards and details, the selected blue hero, and cycling course-group covers.
- `/design-system`: approved سنجش / لاجورد design, the supplied ring-and-cap logo, Vazirmatn, semantic tokens, interactive discovery examples, and component previews. Most examples are fictional; course-card snapshots are dated explicitly.
- `/groups/[id]`: three topic destinations with course information and comparison interactions. `/groups/python-beginner` uses the selected eight-course Python prototype with real saved facts, a manual cover gallery, and labeled editorial analysis.

The homepage uses 18 dated provider samples; its beginner Python group has three members, while the Python route previews eight offerings across levels. Reconciling that membership and dedicated results/detail/comparison routes remain follow-ups. Search/filter state resets on reload. Prices are snapshots, popularity/order is illustrative, and no live AI, scheduled refresh, or production backend is connected. See [frontend behavior and decisions](docs/frontend.md) and [snapshot provenance](docs/provider-snapshots.md).

## Local development

Use Bun 1.3.8 or a compatible release. From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Stop the server with Ctrl+C. Alternatively use `./run.sh` (or `bash run.sh`); it checks for Bun, installs with the frozen lockfile if Next.js is missing, and starts development. `./run.sh --port 3001` selects another port; the script also works when invoked by its full path from another directory.

```sh
bun run lint
bun run typecheck
bun run test:utils
bun run build
bun run start
```

Run `build` successfully before `start`. Lint, type checking, and 72 utility tests pass. Production compilation/types pass, but page-data collection fails under Bun 1.3.8 with `Expected CommonJS module to have a function wrapper`. The experimental Turbopack worker-thread configuration resolves the earlier worker-port failure. The local Homebrew Node executable was previously unable to start because `libllhttp.9.3.dylib` was missing. See [current validation and limitations](docs/validation.md).

No environment variables, database, API keys, or remote fonts are needed. Vazirmatn is bundled locally; its license is included in the installed font package.

## Standalone data utilities

Four server-side adapters export the [version-2 course contract](docs/course-data-format.md), separately from frontend fixtures:

```sh
bun run scrape:maktabkhooneh --limit 2
bun run scrape:toplearn --limit 2
bun run scrape:sabzlearn --limit 2
bun run scrape:roocket --limit 2
```

Each supports `--help`, explicit URLs, `--all`, `--resume`, and an output path. Generated exports are ignored under `apps/utils/output/`. Version-1 checkpoints require a fresh export without `--resume`; use a new output path to preserve old files. Requests are bounded, obey access rules, and preserve unknown values and source evidence. Public feedback is an anonymous bounded sample, not all student reviews.

To inspect existing local exports:

```sh
bun run dashboard:aggregate
bun run dashboard:data
```

Aggregation expects `apps/utils/output/dashboard-<provider>.json` files by default and supports repeatable `--input PATH` plus `--output PATH`. The read-only dashboard opens at `http://127.0.0.1:8787`; use `--file PATH --port N` for another snapshot/port. It rereads saved data without scraping and omits raw source HTML from browser responses. Generated files must be supplied locally; they are not committed. See [utility setup and limitations](apps/utils/README.md) and [provider mappings](docs/provider-adapters.md).

## Workspace

```text
apps/web/       Next.js frontend, component showcase, browser-safe snapshots
apps/utils/     Standalone TypeScript adapters, export CLI, local data dashboard
docs/index.md   Documentation hub
Plan.md         Current decisions, phase status, and remaining scope
AGENTS.md       Contributor instructions and commit policy
```

The frontend uses Next.js, React, TypeScript, Tailwind CSS, and Lucide icons. Shared tokens live in `apps/web/src/app/globals.css`; components use shared styles and CSS modules. Future API, worker, UI, and core packages will be introduced when needed. Keep scraper/server code and secrets out of browser-safe contracts.

## Contributing

Read `AGENTS.md` and `Plan.md` before changing product scope. Use the documented Bun commands and preserve the lockfile. Never commit without explicit confirmation for the current changes; review affected documentation, staged scope, and checks before committing. Pushes, branches, and history rewriting require separate authorization.

Project-local frontend and RTL skills live in `.agents/skills/`. Preserve their supplied license and attribution. Earlier exploration and implementation checkpoints are in [project history](docs/project-history.md).
