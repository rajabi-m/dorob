# Spec Delta

## MODIFIED Requirements

### Requirement: Thumbnail presentation readiness
Management detail SHALL report presentation readiness only when the current snapshot has an accepted pricing section and its own ready hosted thumbnail. Unknown pricing SHALL remain unknown. Minimal references and observations without ready images SHALL remain manageable without claiming image readiness. This management flag SHALL NOT gate individual-course discovery. Existing minimal public-group reads SHALL retain their contract.

#### Scenario: Facts ready before image
- **WHEN** the current snapshot contains valid pricing but its own image has not processed successfully, even if earlier snapshots have ready assets
- **THEN** management returns its facts with presentation readiness false while individual-course discovery can expose the accepted current facts with no image

#### Scenario: Successful processing
- **WHEN** the current snapshot with an accepted pricing section gains its own ready hosted thumbnail
- **THEN** current management detail reports presentation readiness true and individual-course reads return that hosted image reference

## ADDED Requirements

### Requirement: Image-independent individual-course visibility
A missing, pending, failed, unreadable or corrupt thumbnail SHALL NOT alone exclude an accepted individual course or change its matching count. Metadata reads SHALL not inspect image files or invalidate thumbnail state. Asset retrieval and explicit processing/retry SHALL retain bounded validation and safe errors; normal catalogue reads SHALL never trigger image retrieval from providers or repair.

#### Scenario: Image file disappears after processing
- **WHEN** an accepted course's recorded thumbnail file disappears
- **THEN** its individual-course metadata and matching count remain available, and the failed asset request can produce a website fallback without hiding the course

#### Scenario: Processing fails or is retried
- **WHEN** explicit image processing fails or later succeeds for the current observation
- **THEN** the accepted course remains discoverable throughout and successful processing makes its own hosted image available without changing its course identity

#### Scenario: Strict evaluated group assets remain protected
- **WHEN** a retained group comparison depends on an unavailable evaluated image
- **THEN** its existing group-image eligibility and historical-snapshot rules continue to apply independently of individual-course visibility
