# container-deployment Specification

## Purpose

Run Dorob's public website, management API and PostgreSQL together as one replaceable production container while retaining application state on an independently mounted disk.

## Requirements

### Requirement: Single production image
The project SHALL build one Linux AMD64 image that runs the production Next.js website, Bun API and PostgreSQL 17 with compatible pgvector. The image SHALL include required runtime assets, native dependencies and migration tooling without requiring host Node, Bun or PostgreSQL. Normal startup SHALL NOT run collectors, models, experiment servers or embedding jobs.

#### Scenario: Build and run independently
- **WHEN** the documented image is built from the workspace with its frozen lockfile and run with documented settings and an empty persistent mount
- **THEN** the website, API and database operate within that single container without development servers or source bind mounts

### Requirement: Private internal services
By default only the website SHALL accept external traffic. Operators MAY expose API port 3001 for remote workers through HTTPS ingress; management SHALL require bearer authentication. PostgreSQL SHALL remain on loopback or private sockets. Internal auth state SHALL require a verified loopback peer, ignoring host and forwarding headers. Public reads SHALL retain existing behavior and browser assets SHALL exclude secrets.

#### Scenario: Inspect network exposure
- **WHEN** the container runs without explicit API exposure
- **THEN** the public port serves the website while API and PostgreSQL ports cannot be reached through the container network interface

#### Scenario: Remote worker access
- **WHEN** the operator enables API exposure and routes an HTTPS API domain to port 3001
- **THEN** remote workers can use management endpoints with the admin bearer token, unauthenticated management calls are refused, internal authentication state remains inaccessible to remote peers, and PostgreSQL remains private

### Requirement: Independent persistent state
The runtime SHALL store PostgreSQL data, thumbnails, staging and private authentication state beneath the documented `/data` mount. A required volume identity SHALL distinguish persistent storage from the container filesystem. Missing, unreadable, incompatible or unwritable state SHALL fail closed without reinitializing existing data. Ordinary restart and image replacement SHALL preserve retained data and tokens.

#### Scenario: Replace the image
- **WHEN** the stopped container is replaced using the same initialized disk
- **THEN** records, historical thumbnail bytes and the active admin token remain intact

#### Scenario: Missing or incompatible disk
- **WHEN** startup lacks the required prepared disk identity or finds incompatible PostgreSQL files
- **THEN** the runtime exits with a safe diagnostic and does not create a replacement catalogue on ephemeral storage

### Requirement: Exclusive disk ownership
One running or maintenance container SHALL hold an exclusive runtime lease on its data disk. A second cooperating container SHALL refuse that disk before starting PostgreSQL or changing application state. Deployment instructions SHALL require one replica and stop-before-replace updates without overlapping database processes.

#### Scenario: Concurrent use
- **WHEN** another container attempts normal startup, import or rotation against an actively leased disk
- **THEN** it fails without modifying that disk's database, credentials or assets

### Requirement: Ordered startup
The container SHALL validate storage and configuration, start PostgreSQL, wait for real readiness, invoke existing explicit migrations, start the API and wait for readiness before starting the website. Container orchestration SHALL NOT move migrations into standalone API startup. Failed or timed-out stages SHALL prevent readiness and stop started services safely.

#### Scenario: Migration failure
- **WHEN** a migration checksum mismatch or migration error occurs
- **THEN** the website does not become ready, existing committed data is retained and startup exits nonzero after shutting down PostgreSQL

#### Scenario: Initialized disk
- **WHEN** startup finds compatible initialized PostgreSQL data
- **THEN** it reuses that cluster and applies only pending migrations without restoring or seeding data

### Requirement: Supervised failure and shutdown
The runtime SHALL reap child processes and fail the container if PostgreSQL, API or website exits unexpectedly. SIGTERM SHALL stop website traffic, drain application services and shut down PostgreSQL cleanly within a documented total grace period. Shutdown SHALL NOT remove persistent state or claim a successful startup after a required child fails.

#### Scenario: Child failure
- **WHEN** any essential child exits unexpectedly after readiness
- **THEN** readiness fails, siblings shut down and the container exits nonzero for platform restart

#### Scenario: Platform termination
- **WHEN** the platform sends SIGTERM with the documented grace period
- **THEN** application listeners stop and PostgreSQL completes a clean shutdown with data preserved

### Requirement: Aggregate health
The image SHALL expose bounded liveness and readiness checks through the website port and a container health command. Readiness SHALL require completed startup, functioning web/API services, a real database query and accessible persistent directories. Health responses SHALL exclude credentials and internal diagnostics. Liveness SHALL NOT depend on a database query.

#### Scenario: Dependency outage
- **WHEN** the API, database or required storage becomes unavailable
- **THEN** readiness returns non-success within its documented deadline even if the website can still serve an error page

### Requirement: Private build and runtime credentials
Build inputs and image layers SHALL exclude local environments, database files, auth records, backups, outputs and private evidence. Application and database processes SHALL run under appropriate unprivileged users. Production startup SHALL reject dev authentication bypass and missing database secrets. The admin token SHALL be generated or reused on disk and disclosed only through its existing dedicated startup message.

#### Scenario: Build confidentiality
- **WHEN** sentinel private files exist in ignored local storage and environment locations
- **THEN** they do not enter the build context, image layers or build logs

#### Scenario: Production configuration
- **WHEN** a deployment attempts to enable dev bypass or omit required database credentials
- **THEN** container startup fails without printing those credentials or disabling protection

### Requirement: Offline maintenance and restart compatibility
The image SHALL provide offline token rotation and backup/restore entry modes under the same exclusive disk lease. Restart recovery SHALL distinguish stale runtime registrations from current services without deleting persistent credentials or bypassing live-service rotation safeguards. Hard interruption SHALL NOT require a new admin token to recover.

#### Scenario: Interrupted container restart
- **WHEN** a container is killed and a replacement acquires the released disk lease
- **THEN** stale container-runtime locks cannot permanently block startup or offline maintenance, and the retained token remains unchanged
