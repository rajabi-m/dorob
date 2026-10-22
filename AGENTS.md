# Working on Dorob

## Commit policy

- Never commit changes without explicit user confirmation for those changes. A previous approval does not authorize future commits.
- A direct user request to commit is confirmation for the scope of that request. Do not ask for redundant confirmation.
- After the user confirms a commit, review and update `Plan.md`, `README.md`, and any other affected documentation before committing the results. Keep status, setup instructions, decisions, and limitations accurate.
- Review the staged diff and run appropriate available checks before committing. Mention any checks that could not run.
- Stage only files within the approved scope. Never include secrets, generated output, unrelated changes, or another contributor's unfinished work.
- Do not push, rewrite history, or create branches without user authorization.

## Product and implementation

- Read `Plan.md` before making product or architecture changes. Keep work within the active phase.
- Dorob is a Persian-only, RTL course discovery and comparison product. Use `lang="fa"` and `dir="rtl"`, logical CSS properties, and explicit direction for mixed Latin text where needed.
- Build a polished, accessible, responsive interface with shared semantic design tokens and reusable components.
- Phase 1 establishes the design system. Phase 2 uses mock data. Live scraping, AI integration, and backend work belong to phase 3.
- Keep the frontend and eventual JavaScript/TypeScript backend in one workspace. Share browser-safe contracts without leaking server code or secrets.
- Make every product UI design look and read like the final product, including when it uses mock data. Never add placeholder or design-process labels such as «برای مثال», «نمونه», or «پیش‌نمایش طراحی» to product screens. Keep mock-data provenance and integration limitations in developer documentation; do not fabricate provider facts.
- Keep shared course cards focused on comparable information. Do not show lesson counts, provider-specific completion deadlines, or study-effort estimates in the card metadata; show content duration only.
- Course strengths and weaknesses must describe the course itself, using supported facts and clearly reasoned tradeoffs. Never fill weakness bullets with missing-data, scraping, or implementation limitations; never invent negative reviews or absent topics. Keep technical limitations in developer documentation.
- Keep changes focused and document consequential decisions and known limitations as work proceeds.

## Validation

- Use the package manager and commands documented in `README.md`; preserve the lockfile.
- Run lint, type checking, and a production build when changing application code, where the environment supports them.
- Check Persian text, keyboard focus, mixed-direction content, and mobile layouts when changing UI.
- If network failures prevent installation, report the failure clearly. The user can enable their Germany VPN.
