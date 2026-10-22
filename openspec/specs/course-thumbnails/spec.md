# course-thumbnails Specification

## Purpose

Give course presentation a reliable Dorob-hosted thumbnail while keeping image processing bounded, recoverable, and economical across retained source observations.

## Requirements

### Requirement: Required thumbnail input
Every course ingestion observation SHALL account for a thumbnail through a public HTTPS URL, an uploaded image reference, or an explicit unavailable/failed reason. Uploaded files SHALL be accepted through a documented file-upload operation. URL input SHALL be downloaded by the backend; binary image content SHALL NOT be embedded in snapshot JSON.

#### Scenario: URL and file alternatives
- **WHEN** one client supplies a thumbnail URL and another uploads an image and submits its reference
- **THEN** both inputs can produce a Dorob-hosted thumbnail attached to the corresponding observation

#### Scenario: No usable image
- **WHEN** a valid observation explicitly reports no usable thumbnail
- **THEN** its source facts remain stored and management reports missing thumbnail readiness

### Requirement: Bounded remote image retrieval
Remote downloads SHALL require credential-free HTTPS with verified TLS. URL/DNS preflight SHALL reject private, loopback, link-local, reserved and metadata-network addresses, including mixed DNS answers and redirects. Retrieval SHALL enforce byte, redirect, concurrency and time limits without forwarding credentials or cookies.

#### Scenario: Redirect to local destination
- **WHEN** a public thumbnail URL redirects to a private or loopback address
- **THEN** preflight rejects the private redirect without issuing that request or discarding the observation

#### Scenario: Oversized or stalled download
- **WHEN** an image response exceeds the configured byte limit or retrieval deadline
- **THEN** the backend stops retrieval, records a bounded failure reason, and removes temporary bytes

### Requirement: Temporary IP pinning exception
IP pinning SHALL be temporarily deferred for internal-crawler image URLs by owner decision. Documentation and code SHALL state the accepted SSRF/DNS rebinding risk from independent preflight/connection DNS resolution and include a TODO to restore verified pinning. TLS verification and every other retrieval protection SHALL remain enabled.

#### Scenario: Standard HTTPS and accepted DNS rebinding risk
- **WHEN** preflight DNS answers are public and standard HTTPS makes the request
- **THEN** TLS verification remains enabled without connection IP pinning, and the known gap between preflight DNS and connection resolution is documented rather than claimed to prevent rebinding

### Requirement: Image validation and compression
The backend SHALL validate actual decoded image content and enforce input-byte and decoded-pixel limits. Supported raster input SHALL be oriented, resized without upscaling or cropping, stripped of metadata, and re-encoded into a compressed web thumbnail under a documented processing profile. Invalid, unsupported, or excessive images SHALL fail safely.

#### Scenario: Large valid source image
- **WHEN** a supported image exceeds the thumbnail dimensions but stays within input limits
- **THEN** the resulting asset fits the processing profile, preserves aspect ratio, and has recorded dimensions, format, size, and profile version

#### Scenario: Spoofed image upload
- **WHEN** uploaded bytes are not a supported image despite an image filename or content type
- **THEN** the upload is rejected without publishing an asset

### Requirement: Stable asset hosting
Successful processing SHALL expose only the processed image through a stable Dorob asset URL with correct content type, caching validators, and immutable-content caching. Client paths SHALL NOT select filesystem locations. Source images, temporary uploads, and raw evidence SHALL NOT be publicly served.

#### Scenario: Course image request
- **WHEN** a client requests a ready thumbnail asset
- **THEN** Dorob returns the processed bytes and cache headers without relying on a new request to the provider

#### Scenario: Filesystem traversal attempt
- **WHEN** a request supplies an unknown asset identifier or traversal-shaped path
- **THEN** no file outside the hosted asset namespace is returned

### Requirement: Asset reuse and historical retention
Identical processed content SHALL reuse one stored asset across courses and observations. Every successful observation-to-asset association SHALL remain traceable. Normal refreshes, migration reruns, and restarts SHALL retain referenced assets; original full-size inputs SHALL NOT be retained by default after processing.

#### Scenario: Same thumbnail on repeated checks
- **WHEN** several observations resolve to identical processed bytes
- **THEN** their associations point to one asset without repeated permanent file copies

#### Scenario: Thumbnail changes
- **WHEN** a later observation produces a different thumbnail
- **THEN** its asset and the earlier snapshot's asset remain separately addressable

### Requirement: Recoverable processing state
Management SHALL expose missing, pending, ready, and failed thumbnail states, safe failure reasons, and an explicit bounded retry operation. Processing failure or interruption SHALL NOT remove accepted facts or historical assets. Current thumbnail state SHALL belong only to the current snapshot. Repeated or concurrent processing SHALL NOT duplicate assets or attach an asset to the wrong observation.

#### Scenario: Failed refresh with an earlier thumbnail
- **WHEN** downloading a new observation's thumbnail fails while an older thumbnail is ready
- **THEN** current detail reports the new snapshot's failed thumbnail and unready presentation without using the older image; that image remains available through its historical snapshot

#### Scenario: Interrupted processing
- **WHEN** the API restarts during image processing
- **THEN** the observation and recoverable state remain inspectable and an explicit retry can finish processing

### Requirement: Thumbnail presentation readiness
Management detail SHALL report presentation readiness only when the current snapshot has an accepted pricing section and its own ready hosted thumbnail. Unknown pricing SHALL remain unknown. Minimal references and observations without ready images SHALL remain manageable without claiming image readiness. This management flag SHALL NOT gate individual-course discovery. Existing minimal public-group reads SHALL retain their contract.

#### Scenario: Facts ready before image
- **WHEN** the current snapshot contains valid pricing but its own image has not processed successfully, even if earlier snapshots have ready assets
- **THEN** management returns its facts with presentation readiness false while individual-course discovery can expose the accepted current facts with no image

#### Scenario: Successful processing
- **WHEN** the current snapshot with an accepted pricing section gains its own ready hosted thumbnail
- **THEN** current management detail reports presentation readiness true and individual-course reads return that hosted image reference

### Requirement: Persistent local asset lifecycle
Local asset storage and metadata SHALL survive normal API restarts. Upload tokens SHALL be bounded, expire, and never authorize arbitrary storage paths. Temporary inputs and abandoned staging files SHALL have documented bounded cleanup; assets referenced by history SHALL NOT be automatically deleted.

#### Scenario: Restart with retained history
- **WHEN** the API and database are normally restarted with asset storage preserved
- **THEN** historical ready thumbnail URLs still resolve and unconsumed expired upload inputs can be cleaned safely

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
