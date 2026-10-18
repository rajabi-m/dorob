# Spec Delta

## ADDED Requirements

### Requirement: Read existing candidate promotion and delivery status
The local management API SHALL expose a read-only lookup by candidate ID returning its existing promotion ID, draft group ID, planned/delivered/pending suggestion counts and delivery completion, or an explicit absence for an unpromoted candidate. Counts SHALL be cumulative persisted state. Unknown candidates SHALL return 404. Reads SHALL NOT create drafts, deliver suggestions or invoke inference.

#### Scenario: Recover after browser restart
- **WHEN** a client looks up a previously promoted candidate
- **THEN** the original promotion and draft identities and cumulative delivery counts are returned without requiring the original request ID

#### Scenario: Candidate has not been promoted
- **WHEN** a known candidate has no promotion
- **THEN** the response explicitly identifies absence rather than treating it as an unknown candidate

#### Scenario: Partially delivered plan
- **WHEN** only part of a promotion's suggestion plan has been delivered
- **THEN** the response reports the actual planned, delivered and pending counts with completion false
- **AND** repeated reads do not advance delivery or alter membership decisions

#### Scenario: Persisted delivery completion
- **WHEN** all planned suggestions have been delivered
- **THEN** lookup returns pending zero and completion true even if suggestion review decisions have since changed


### Requirement: Sort saved discovered collections before pagination
The candidate listing API SHALL sort the selected run's retained or suppressed collections by frozen mean similarity descending or member count descending before pagination, with candidate ID ascending for ties. Omitting sort SHALL preserve existing ID order. Invalid or repeated values SHALL be rejected. Sorting SHALL be read-only and SHALL NOT invoke inference.

#### Scenario: Highest similarity across pages
- **WHEN** a client requests similarity order for a run containing multiple pages
- **THEN** the highest numeric mean scores appear first across the entire filtered result
- **AND** equal scores have stable candidate ID ascending order

#### Scenario: Most courses across pages
- **WHEN** a client requests course-count order
- **THEN** collections with more frozen members appear before smaller collections across pages
- **AND** equal member counts have stable candidate ID ascending order

#### Scenario: Compatibility and filtering
- **WHEN** the client omits sorting or requests the suppressed collection set
- **THEN** omission preserves ID order, and the selected retained/suppressed filter is applied before sorting

#### Scenario: Invalid sort
- **WHEN** an unsupported or repeated sort value is supplied
- **THEN** the API rejects the request without mutating records
