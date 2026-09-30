# Dorob | دورُب

نام فارسی پروژه «دورُب» است؛ ترکیبی از نام‌های «دوره» و «ترب».

A Persian RTL course discovery and comparison product. Project initialization is complete with a working hello-world frontend. Phase 1 remains incomplete. The selected visual direction is سنجش / لاجورد / the supplied ring-and-cap logo; further component development and validation are pending.

## Current frontend

- `/`: a responsive Persian welcome page with an original graduation-cap brand concept, a teal-and-ivory palette, and an introduction to the product.
- `/design-system`: an interactive design review lab with three proposed systems (سنجش, رویش, جهش), each with three switchable palettes. Preview search, free-course filtering, comparison selection, buttons, badges, typography, and semantic color tokens. All courses, providers, and prices are explicitly fictional samples. The owner selected سنجش / لاجورد / نشان شما; this checkpoint retains all exploration options before the page is simplified.
- The welcome page is introductory. Design-lab search and comparison only demonstrate component states with fictional samples; product pages, scraping, and live AI are not implemented yet.

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

The frontend uses Next.js, React, TypeScript, Tailwind CSS, Lucide icons, and Vazirmatn. Welcome-page tokens live in `apps/web/src/app/globals.css`; proposed design-system colors live in `apps/web/src/app/design-system/page.tsx` and scoped geometry, spacing, and feedback tokens in `preview.css`. The selected direction is سنجش with لاجورد and the supplied logo. The full design system must be completed and reviewed before phase 2.

Lint and type checking pass. Both routes have been served locally with HTTP 200 responses. The production build currently fails with a Turbopack local-port permission error on this machine, including after an escalated retry. Full visual and accessibility validation remains pending.

Future API, worker, UI, and core packages will be introduced when their phases require them. Browser-safe shared contracts and backend-only dependencies must remain separate.

## Contribution workflow

Read `AGENTS.md` and `Plan.md` before making changes. Never commit without user confirmation. After confirmation, update all affected documentation before committing. The initial planning commit does not authorize commits of subsequent frontend work.

## Design review

Open `http://localhost:3000/design-system` after starting development. Choose a direction, then choose one of its three palettes. Each direction uses different heading weights, spacing, geometry, and card treatments while retaining locally bundled Vazirmatn. Try search, the free filter, and selecting at least two courses for a sample comparison. Palette selection is kept per direction during the current page session. Reloading resets the preview.

The proposals remain in phase 1. They are foundation previews, not complete production design systems; overlays, further form components, comprehensive accessibility review, and extraction into a shared UI package follow selection of a direction. Lint, type checking, and the RTL detector pass for the preview. The local route returns HTTP 200. Visual browser and mobile validation could not run because no browser surface was available. The production build still encounters the Turbopack port-permission error after an escalated retry.

The design lab also includes ten SVG logo options. The first five are: جوانه (cap and sprout), کتاب (cap and book), هم‌سنج (paired course cards), مسیر (learning path), and دال (Persian monogram). A selection stays active across direction and palette changes during the session. It updates the preview header, hero mark, and dedicated specimens for 24/32/48-pixel widths and reversed color. Download the selected mark as SVG in the active primary color; standalone teal-based versions are in `apps/web/public/logos`. These downloads contain the mark, without a font-dependent wordmark. The reusable renderer and export helper live in `apps/web/src/components/logo-prototypes.tsx`. The supplied mark (نشان شما) has been selected for continued development.

Options six through ten add your uploaded `logo.svg` (نشان شما) and four related ring-and-cap explorations: مدار، پیوند، درگاه، شکوفه. Your option is initially selected. All ten follow the active palette; the uploaded mark maps its ring to primary, cap to text/ink, tassel to accent, and separation outline to white. SVG downloads retain those palette colors. The supplied SVG geometry is preserved in the reusable renderer; `public/logos/reference.svg` is the teal-themed copy. The original root `logo.svg` is no longer present in the working tree. Reversed specimens use a single white mark with background-colored separation.

The owner authorized a commit preserving the complete exploration state, followed by an uncommitted simplification to the selected design. Phase 1 continues with more components; the exploration checkpoint does not mark the design system complete.
