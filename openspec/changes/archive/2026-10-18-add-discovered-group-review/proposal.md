# Proposal

## Why

Dorob already saves newly discovered course collections, but reviewing them and turning them into editorial drafts requires terminal commands. Administrators need a Persian review workspace that makes the courses and evidence easy to assess, with explicit decisions and Dorob's established visual identity.

## What Changes

- Add «پیشنهادهای گروه‌بندی» to admin navigation, with saved-run selection, paginated discovered collections, and a selected collection review view.
- Add run-wide sorting by mean pairwise similarity or course count before pagination, with stable ties and URL persistence.
- Present actual course identities, available retained information, experimental similarity evidence, overlap, currentness, and incomplete-run warnings without invented group titles or AI explanations.
- Support approval, dismissal, return to pending, optional editorial title/note, and a separate explicit form for creating an unpublished draft. Course membership review and publication remain separate existing workflows.
- Show promotion and suggestion-delivery status across reloads, link to the created draft, and allow explicit delivery retry. Add only the minimal read API needed to recover this state.
- Build a distinctive RTL review desk using the existing لاجورد, pale-blue, gold and semantic feedback tokens. Showcase every new reusable component or variant at `/design-system` using labelled, isolated sample interactions.
- Add scoped same-origin web handlers and validation for the existing discovery APIs, preserving local-only administration.

## Capabilities

### New Capabilities

None; extend the existing discovery and administration capabilities.

### Modified Capabilities

- `course-group-administration`: Add frontend discovery browsing, evidence inspection, editorial decisions, draft creation/recovery and reusable review-desk presentation.
- `course-group-discovery`: Add read-only lookup of a candidate's existing promotion and cumulative delivery status for safe frontend recovery.

## Impact

Affected areas include `apps/web/src/app/admin`, concrete `api/admin` handlers, admin client/validation, shared admin components, `/design-system`, browser-safe contracts in `packages/core`, and a narrow additive read endpoint in `apps/api`. Existing inference, discovery thresholds, immutable evidence, membership approval and publication semantics remain unchanged. No schema migration or new dependency is expected.

Out of scope: starting AI jobs from the browser, generating group titles or explanations, redesigning existing course-to-group inboxes, bulk membership approval, automatic publication, authentication/deployment, and changes to the independent embedding lab. Implementation will update setup/design/validation documentation and relevant project status; this proposal itself changes planning artifacts only.
