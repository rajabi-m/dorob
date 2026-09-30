# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian RTL course discovery and comparison product. Project initialization is complete with a working hello-world frontend. Phase 1 (visual identity and design system) remains incomplete and requires redesign and approval.

## Current frontend

- `/`: a responsive Persian welcome page with an original graduation-cap brand concept, a teal-and-ivory palette, and an introduction to the product.
- `/design-system`: an experimental showcase of colors, Persian typography, links, buttons, and badges. Its visual direction is not approved; the design system remains pending.
- All content is introductory. Search, course comparison, scraping, and live AI are not implemented yet.

## Local development

Use Bun 1.3.8 or a compatible newer release. The workspace uses Bun for dependency management and explicitly runs the frontend tooling with Bun. This allows development on the current machine, whose Homebrew Node installation fails to start because of a missing `llhttp` library. No system installation is modified.

From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Stop the server with Ctrl+C.

Validation and production commands:

```sh
bun run lint
bun run typecheck
bun run build
bun run start
```

Run `build` before `start`. No environment variables, database, API keys, or remote font requests are needed. Vazirmatn is bundled locally through its font package; its license is included in the installed package.

## Layout

```text
apps/web/
  src/app/                 App Router pages, metadata, global tokens and styles
  src/components/          Shared frontend components
AGENTS.md                  Contributor instructions and commit policy
Plan.md                    Product decisions, phases, and progress
```

The frontend uses Next.js, React, TypeScript, Tailwind CSS, Lucide icons, and Vazirmatn. Design tokens live in `apps/web/src/app/globals.css`. The current brand and palette are experimental and require redesign and approval before phase 2.

Lint and type checking pass. Both routes have been served locally with HTTP 200 responses. The production build currently fails with a Turbopack local-port permission error on this machine, including after an escalated retry. Full visual and accessibility validation remains pending.

Future API, worker, UI, and core packages will be introduced when their phases require them. Browser-safe shared contracts and backend-only dependencies must remain separate.

## Contribution workflow

Read `AGENTS.md` and `Plan.md` before making changes. Never commit without user confirmation. After confirmation, update all affected documentation before committing. The initial planning commit does not authorize commits of subsequent frontend work.
