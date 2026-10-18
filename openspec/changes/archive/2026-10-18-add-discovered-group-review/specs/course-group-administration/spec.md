# Spec Delta

## ADDED Requirements

### Requirement: Browse saved discovered collections
The admin panel SHALL expose «پیشنهادهای گروه‌بندی», saved-run selection and paginated retained collections for a selected run. Run, page and selected candidate SHALL be addressable on reload. Run completion and partial status SHALL be visible. Reads SHALL NOT start inference or create editorial records.

#### Scenario: Open saved results
- **WHEN** an administrator selects a completed discovery run and opens a collection
- **THEN** the saved members and review state appear without invoking AI
- **AND** reloading the address preserves the selected run and collection

#### Scenario: No completed results
- **WHEN** no completed runs or no collections exist
- **THEN** the panel explains the empty state and that discovery is run separately through the existing local CLI
- **AND** no generation or simulated results are triggered

#### Scenario: Browse beyond the first page
- **WHEN** a run contains more collections than one page
- **THEN** pagination exposes the remaining collections without treating page-local counts as run-wide review totals

### Requirement: Inspect discovered collection evidence
Collection review SHALL show member identities, providers, available retained educational facts and source links. It SHALL expose mean/minimum pairwise similarity, run/model provenance, currentness, partial status, overlap links and available reconciliation with existing groups. Similarity SHALL NOT be presented as calibrated confidence or course quality.

#### Scenario: Untitled discovery
- **WHEN** a collection has no editorial title
- **THEN** its heading identifies a representative course as a preview rather than inventing an AI-generated group title or suitability explanation

#### Scenario: Incomplete course information
- **WHEN** a member lacks retained fields or cannot be hydrated
- **THEN** its identity remains visible with a missing/unavailable explanation and a safe retry where applicable
- **AND** available evidence for other members remains inspectable

#### Scenario: Overlap and reconciliation
- **WHEN** evidence includes overlapping candidates or nearby existing groups
- **THEN** the admin can inspect shared collections and direct member-to-group scores
- **AND** any coverage label remains provisional rather than claiming exhaustive novelty or equivalence

#### Scenario: Historical inputs
- **WHEN** the current course inspection differs from frozen discovery evidence
- **THEN** the UI distinguishes current retained facts from historical run inputs and marks stale evidence visibly

### Requirement: Explicit discovery decisions
The review workspace SHALL support approval, dismissal and return to pending, optional editorial title/note, and inspectable decision history. Mutations SHALL use observed versions and stable request identities. Pending controls SHALL prevent duplicate submission; conflicts SHALL preserve entered values and offer refresh without overwriting newer decisions.

#### Scenario: Approve a collection
- **WHEN** an administrator approves a collection
- **THEN** only the candidate review decision is saved
- **AND** no draft, membership or publication is created by that approval

#### Scenario: Revise a decision
- **WHEN** an administrator returns a dismissed candidate to pending
- **THEN** the new version is saved while earlier decisions remain inspectable

#### Scenario: Concurrent decision
- **WHEN** another reviewer has changed the observed version
- **THEN** the panel reports the conflict, preserves unsaved title/note and requires refreshed state before a new decision

### Requirement: Separate discovery draft creation
The panel SHALL offer a separate explicit draft form for approved, current, retained collections, requiring title, slug, scope, category and nullable level. Partial evidence SHALL require explicit acknowledgement. Suppressed or stale collections SHALL remain inspectable but ineligible for draft creation. Successful creation SHALL leave membership approval and publication to existing group administration.

#### Scenario: Create an editorial draft
- **WHEN** an administrator submits valid fields for an eligible collection
- **THEN** one empty unpublished draft and all-member suggestion plan are created
- **AND** the panel identifies these as suggestions awaiting separate membership decisions and links to group management

#### Scenario: Partial evidence
- **WHEN** the selected collection comes from a partial run
- **THEN** the panel explains the limitation and requires an unchecked-by-default acknowledgement before recording partial acceptance and enabling promotion

#### Scenario: Invalid or conflicting fields
- **WHEN** submitted fields fail validation or the slug conflicts
- **THEN** entered values remain available for correction without claiming draft creation succeeded

### Requirement: Recover promotion and delivery in the panel
On opening a collection the panel SHALL recover any existing promotion and cumulative delivery state. Draft creation and suggestion delivery SHALL have separate feedback. Uncertain responses SHALL be reconciled through readback or identical request replay. Delivery retry SHALL be explicit and SHALL NOT create another draft or approve members.

#### Scenario: Reload after successful promotion
- **WHEN** the administrator reloads a collection that already produced a draft
- **THEN** its existing draft link and delivered/remaining suggestion counts appear without requiring the original browser session

#### Scenario: Response lost
- **WHEN** a promotion response is lost
- **THEN** the panel checks the saved promotion and preserves the original request identity and payload for any identical replay
- **AND** it does not blindly create another draft

#### Scenario: Interrupted delivery
- **WHEN** a draft exists with undelivered suggestions
- **THEN** the panel explains that draft creation succeeded, shows delivery progress and offers an explicit retry for missing suggestions

### Requirement: Distinctive shared discovery review presentation
Discovery review SHALL use Dorob's existing tokens, Vazirmatn and Persian RTL conventions in a course-centered queue/detail composition. Selected collections and pending/approved/dismissed states SHALL be distinguishable without color alone. Every new reusable component or variant SHALL appear in `/design-system` using the production implementation and isolated labelled samples.

#### Scenario: Review on desktop and mobile
- **WHEN** an admin navigates with a keyboard at desktop or narrow mobile width
- **THEN** the queue, detail view and decision controls remain reachable with visible focus and no page-level horizontal overflow
- **AND** Persian numerals, Jalali dates and isolated Latin identifiers remain readable

#### Scenario: Showcase interactions
- **WHEN** a reviewer opens the discovery specimens at `/design-system`
- **THEN** collection preview, evidence states and decision controls demonstrate pending, approved, dismissed, stale, partial, loading, empty and error cases as applicable
- **AND** interactions neither mutate catalog records nor invoke AI

### Requirement: Scoped discovery management transport
Browser discovery reads and mutations SHALL use concrete same-origin admin handlers, bounded validated requests/responses, server-only backend configuration and no-store responses. Foreign-origin mutations and unsupported operations SHALL be rejected. Administration SHALL remain local-only without introducing authentication or generic API forwarding.

#### Scenario: Untrusted mutation origin
- **WHEN** a foreign-origin request attempts discovery approval or promotion through the web app
- **THEN** the handler rejects it before contacting the management backend

#### Scenario: Unavailable or malformed backend response
- **WHEN** a discovery response is unavailable or fails validation
- **THEN** the UI shows a bounded Persian error and safe recovery action without reporting success or discarding unsaved editorial input


### Requirement: Choose and retain discovered collection ordering
The review desk SHALL offer Persian choices for default order, highest experimental mean similarity and most courses. Sort SHALL persist in the URL across navigation and reload. Changing sort SHALL clear candidate/page selection. Run/type changes SHALL retain sort. The accessible shared control SHALL have an isolated showcase. Similarity SHALL NOT imply calibrated confidence or course quality.

#### Scenario: Change ordering while reviewing
- **WHEN** an editor changes sorting on a later candidate page with a selected collection
- **THEN** the queue opens its first page in the new order with no candidate selected

#### Scenario: Preserve ordering across navigation
- **WHEN** an editor opens a candidate, paginates, reloads or navigates browser history
- **THEN** the URL preserves the chosen sort and the corresponding order is restored

#### Scenario: Accessible sort control
- **WHEN** an editor uses the sort select at desktop or mobile width
- **THEN** its Persian label, keyboard focus and selected value remain readable without horizontal overflow


#### Scenario: Change run or collection type
- **WHEN** an editor changes the selected run or retained/suppressed collection type
- **THEN** the chosen ordering remains active

#### Scenario: Isolated sort specimen
- **WHEN** the showcase sort is changed
- **THEN** only local sample state changes and no management requests are sent
