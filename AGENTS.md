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
- Identify sample data and AI-derived text clearly. Do not fabricate provider facts or imply live integrations exist.
- Keep changes focused and document consequential decisions and known limitations as work proceeds.

## Validation

- Use the package manager and commands documented in `README.md`; preserve the lockfile.
- Run lint, type checking, and a production build when changing application code, where the environment supports them.
- Check Persian text, keyboard focus, mixed-direction content, and mobile layouts when changing UI.
- If network failures prevent installation, report the failure clearly. The user can enable their Germany VPN.
