# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian RTL course discovery and comparison product. Project initialization is complete with a working hello-world frontend. Phase 1 remains incomplete. The selected visual direction is سنجش / لاجورد / the supplied ring-and-cap logo; further component development and validation are pending.

## Current frontend

- `/`: a responsive Persian welcome page with an original graduation-cap brand concept, a teal-and-ivory palette, and an introduction to the product.
- `/design-system`: the selected سنجش design with the لاجورد palette and supplied ring-and-cap logo. Preview sample search, free-course filtering, comparison, buttons, badges, typography, color tokens, and logo sizes. Alternative selectors have been removed. All course, provider, and price data is fictional.
- The welcome page is introductory. Design-lab search and comparison only demonstrate component states with fictional samples; product pages, scraping, and live AI are not implemented yet.

## Local development

Use Bun 1.3.8 or a compatible newer release. The workspace uses Bun for dependency management and explicitly runs the frontend tooling with Bun. This allows development on the current machine, whose Homebrew Node installation fails to start because of a missing `llhttp` library. No system installation is modified.

From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Stop the server with Ctrl+C.

Alternatively, run `./run.sh` (or `bash run.sh`). The script checks for Bun, installs dependencies with the frozen lockfile if Next.js is missing, and starts the development server. Open `/design-system` at the Local URL shown in the terminal. You can choose a port with `./run.sh --port 3001`. The script also works when invoked by its full path from another directory.

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

The frontend uses Next.js, React, TypeScript, Tailwind CSS, Lucide icons, and Vazirmatn. Welcome-page tokens live in `apps/web/src/app/globals.css`; proposed design-system colors live in `apps/web/src/app/design-system/page.tsx` and scoped geometry, spacing, and feedback tokens in `preview.css`. The selected direction is سنجش with لاجورد and the supplied logo. The full design system must be completed and reviewed before phase 2.

Lint and type checking pass. Both routes have been served locally with HTTP 200 responses. The production build currently fails with a Turbopack local-port permission error on this machine, including after an escalated retry. Full visual and accessibility validation remains pending.

Future API, worker, UI, and core packages will be introduced when their phases require them. Browser-safe shared contracts and backend-only dependencies must remain separate.

## Contribution workflow

Read `AGENTS.md` and `Plan.md` before making changes. Never commit without user confirmation. After confirmation, update all affected documentation before committing. The initial planning commit does not authorize commits of subsequent frontend work.

## Design system

Open `http://localhost:3000/design-system` after starting development. The page uses the selected سنجش design, لاجورد palette (`#304CB2` primary), and the supplied ring-and-cap mark. It has no design, palette, or logo selector. Try sample search, the free filter, and selecting at least two courses for comparison. Download the selected logo as SVG with the approved palette colors; small-size and reversed specimens remain available.

The exploration checkpoint is commit `f56b49f`, preserving all three directions, nine palettes, and ten logos. The selected-system component checkpoint includes the page simplification and its documentation. Exploration logo assets remain in `apps/web/public/logos` and their reusable renderer in `src/components/logo-prototypes.tsx`; the page only uses the supplied mark. The original root `logo.svg` is no longer present.

Phase 1 continues: overlays, additional forms and components, shared UI extraction, and comprehensive accessibility review remain pending. Phase 2 has not started. The welcome page retains its initial teal treatment.

Validation for the selected showcase: lint, type checking, and RTL audit pass; the route responds with HTTP 200. Turbopack remains blocked by worker-port permissions. A Webpack fallback (`bun run --cwd apps/web build --webpack`) compiles and type-checks successfully, then fails during page-data collection with a Bun CommonJS function-wrapper error. Full browser, keyboard, and mobile review remains pending.

## Course discovery component showcase

The selected design-system page now includes six category cards and full-width rectangular course rows, alongside the earlier compact-card variant. Category, level, free/paid, and search filters work together; sorting supports price and duration. Removable chips, three-item pagination, a comparison tray/table, and a native course-details dialog demonstrate interaction states with fictional samples.

Additional examples cover paid, discounted, free, and unknown prices; source/freshness notices; a clearly labeled placeholder for AI-summary attribution; native accordions; and selectable loading, empty, and error states. Retry is a visual example with no live request. Components live in `src/components/discovery-showcase.tsx`; styling uses the selected shared semantic colors in `preview.css`. Course rows span the content area on desktop and reflow on mobile; comparison tables allow horizontal scrolling. The hero and horizontal course list share search state. The compact cards are labeled as an independent component demonstration and retain separate selection state.

This expansion is included in the component checkpoint and remains in phase 1. Lint, types, and the RTL audit pass, and the local route returns HTTP 200. Computer Use permission was unavailable for Firefox, so visual mobile, focus-restoration, and keyboard interaction checks remain pending. The production build continues to encounter the existing Turbopack worker-port permission restriction.

### Card imagery preview

Phase 1 now includes three illustrated categories (programming, design, data) and three sample course covers (Python, UX, automation). Reusable decorative SVG artwork lives in `apps/web/src/components/course-artwork.tsx`, uses the selected brand colors with muted secondary tones, and contains no provider claims or embedded text. Other course rows demonstrate a missing-image fallback. Desktop thumbnails use a 16:10 aspect ratio and reflow alongside course text on mobile. These examples are included in the component checkpoint.

Lint, type checking, and RTL audit pass. Production build still fails on the existing Turbopack worker-port permission restriction after an escalated retry. Firefox accessibility output confirmed the updated page content, but subsequent Computer Use actions were denied; screenshot, mobile, and keyboard validation remain pending.

Discounted prices use a normal-size, muted struck-through original price, with a slightly smaller bold current price underneath and a compact discount badge. This shared treatment appears in course rows, price specimens, comparison tables, and the details dialog. The price treatment is included in the component checkpoint; lint, types, and RTL checks pass. Visual review remains pending, and the build still encounters the documented worker-port restriction.

Firefox review now confirms desktop rendering and a 393px responsive preview. Search/filter combinations, sorting, pagination, comparisons, accordions, and demo state controls were exercised; dialog Escape and trigger focus restoration worked. Known issues before refinement: search focus rings target the inner input, dialogs sit at the top-right, card demos have separate search/selection state, removed chips lose page focus, and mobile descriptions wrap beside thumbnails. Full screen-reader and all-breakpoint review remain pending. The owner first authorized a checkpoint before these improvements, then subsequently authorized the refinement commit described below.

### Firefox review refinements

Checkpoint `0d9f509` preserves the component preview before refinements. The preview now places search focus outlines on the complete field, centers scrollable dialogs, shares hero/list search, and shows selected course names with individual removal. Filter removal restores focus to the corresponding control; opening comparison focuses and scrolls to its heading. Compact select-all selects only displayed cards. All six categories have coordinated illustrations, mobile course descriptions span the row, and discounted prices have tighter vertical spacing.

Firefox desktop and 393px checks confirmed search focus, centered dialogs, chip focus restoration, comparison focus and removal, compact filtered selection, and mobile course layout. Lint, types, and the RTL audit pass. Full screen-reader and all-breakpoint review remain pending. The owner has authorized committing these refinements; phase 1 continues.

Final refinement validation: lint, types, and the RTL audit of the design-system/components directories pass. The wider source audit reports 20 existing warnings in the unchanged welcome-page CSS. Production build still fails when Turbopack binds its worker port, including an escalated retry.

Project-local contributor skills live in `.agents/skills/`: frontend design guidance and RTL guidance with a zero-dependency Python audit script. They are development resources and are not shipped in the app bundle. Preserve their supplied license and attribution when modifying or redistributing them.
