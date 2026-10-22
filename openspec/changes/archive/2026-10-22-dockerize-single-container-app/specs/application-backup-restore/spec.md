# Spec Delta

## Purpose

Transfer and recover Dorob's retained catalogue database and filesystem assets together through explicit, verifiable operations without overwriting a working deployment.

## ADDED Requirements

### Requirement: Consistent application export
An explicit export workflow SHALL capture the complete application database, permanent thumbnails and staging needed by retained upload metadata during an operator-established write-free window. It SHALL preserve catalogue history, editorial state, judgments, embeddings and migration records. It SHALL NOT copy live PostgreSQL physical data files between architectures or database installations.

#### Scenario: Export the current catalogue
- **WHEN** all catalogue and asset writers are stopped and the operator invokes export against a selected source
- **THEN** the workflow creates a logical database archive and matching filesystem archives without altering catalogue content

### Requirement: Private integrity manifest
An export SHALL include a manifest recording source database/extension versions, migration identity, archive checksums, application-table counts and content fingerprints, and referenced image hashes. Archives and private manifests SHALL stay outside Git and image layers. Database passwords and active admin tokens SHALL NOT appear in manifests, reports or command arguments.

#### Scenario: Detect modified export
- **WHEN** an archive or retained image differs from its recorded checksum
- **THEN** verification fails without declaring the export suitable for import

### Requirement: Explicit fresh-target import
Import SHALL require an explicit maintenance command and a selected fresh destination under exclusive disk ownership. It SHALL verify archive integrity and database/extension compatibility before restoring. It SHALL refuse an existing application database or initialized application-data destination without deleting, merging or overwriting it. Normal container startup SHALL never import a backup.

#### Scenario: Import before first normal boot
- **WHEN** the operator supplies a verified compatible export and a fresh destination
- **THEN** import restores logical records and matching assets while public application services remain stopped

#### Scenario: Existing target
- **WHEN** import is directed at a disk with existing application data or a previous incomplete import
- **THEN** it refuses without replacing data and reports how to select a fresh target

### Requirement: Verified restore completion
Restore SHALL compare the restored schema/migration identity, table counts and content fingerprints, and all referenced historical asset hashes against the export before marking the destination usable. It SHALL verify compatible vector storage and retain existing editorial publication state. Verification SHALL NOT reingest courses, infer new results, repair missing facts or silently publish groups.

#### Scenario: Complete verification
- **WHEN** restored data and assets match the export
- **THEN** a private completion report identifies the verified destination without exposing credentials

#### Scenario: Incomplete restore or asset loss
- **WHEN** restoration fails or a referenced historical image is missing or corrupted
- **THEN** the destination remains marked incomplete and normal startup refuses to serve it as a completed import

### Requirement: Recovery and source preservation
The transfer workflow SHALL retain the source database/volume and original export after verification. Documentation SHALL explain write fencing, transfer order, readiness checks and rollback. Backups SHALL be copied outside the deployment disk by an explicit operator action; keeping the only backup on that disk SHALL NOT be presented as disaster recovery.

#### Scenario: Cutover is not accepted
- **WHEN** destination verification or operator review fails
- **THEN** the source and export remain available and no automatic traffic switch or source removal occurs

### Requirement: Separate authentication recovery
Portable catalogue exports SHALL exclude admin credentials by default. First deployment SHALL generate a fresh token unless the operator explicitly restores separate private auth state. Same-disk container replacement SHALL retain its existing token. Auth recovery instructions SHALL preserve private permissions and avoid carrying stale live-process registrations into a new runtime.

#### Scenario: First deployment from local data
- **WHEN** catalogue data is imported without a separate auth backup
- **THEN** protected startup creates a fresh token while preserving all imported catalogue content

#### Scenario: Explicit credential recovery
- **WHEN** the operator restores a private credential backup offline
- **THEN** the recovered token is retained with safe permissions and runtime registration files do not falsely identify stopped processes as active
