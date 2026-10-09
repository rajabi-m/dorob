# Spec Delta

## Purpose

Give developers a persistent local PostgreSQL database and an observable check that Dorob's backend can actually query it.

## ADDED Requirements

### Requirement: Persistent local database
The project SHALL provide a documented command to start a local PostgreSQL service with persistent storage and a health check. Its host port SHALL default to `127.0.0.1:5432` and be configurable. Normal stop/start operations SHALL preserve stored data; destructive volume removal SHALL be a separate explicitly documented action.

#### Scenario: Start local development
- **WHEN** a developer follows the documented database setup with the required tools installed
- **THEN** PostgreSQL becomes healthy and accepts connections using the documented local development configuration

#### Scenario: Preserve data across restart
- **WHEN** a developer writes a temporary validation record and stops and restarts the database without removing its volume
- **THEN** the record remains available

### Requirement: Database readiness
The backend SHALL expose `GET /health/ready` and perform a real database query for each check. Success SHALL return HTTP 200 with JSON `{ "status": "ok", "database": "up" }`. Connection failure or a check exceeding five seconds SHALL return HTTP 503 with JSON `{ "status": "unavailable", "database": "down" }`, without credentials or internal errors.

#### Scenario: Healthy connection
- **WHEN** the configured PostgreSQL database accepts and completes the readiness query
- **THEN** `/health/ready` returns the specified HTTP 200 response

#### Scenario: Unreachable or slow database
- **WHEN** the database refuses a connection or cannot complete the query within five seconds
- **THEN** `/health/ready` returns the specified HTTP 503 response within the check deadline plus normal response overhead

#### Scenario: Recovery after database restart
- **WHEN** the database becomes available after an outage without restarting the API
- **THEN** a subsequent readiness request returns HTTP 200 after a successful database query

### Requirement: Example configuration without secrets
The project SHALL provide a tracked environment example with development-only connection values and document how the API loads local configuration. Real local environment files SHALL remain ignored, and database credentials SHALL NOT appear in health responses or startup logs.

#### Scenario: Configure the API locally
- **WHEN** a developer follows the environment example and setup instructions
- **THEN** the API can use the local database and their actual environment file is excluded from version control

#### Scenario: Connection error is reported safely
- **WHEN** a readiness query fails using a URL containing a password
- **THEN** the HTTP response and diagnostic logs do not contain that password or the full credential-bearing URL
