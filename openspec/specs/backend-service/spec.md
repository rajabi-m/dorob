# backend-service Specification

## Purpose

Provide an independently runnable Dorob HTTP service that developers can inspect and exercise before introducing product APIs.

## Requirements

### Requirement: Hello-world response
The service SHALL expose `GET /api/v1/hello`, returning HTTP 200 with JSON `{ "message": "سلام دنیا" }` independently of database availability.

#### Scenario: Developer tries the greeting
- **WHEN** a developer requests `/api/v1/hello` from the running service
- **THEN** the response is HTTP 200 with the specified Persian JSON message and a JSON content type

#### Scenario: Database is unavailable
- **WHEN** PostgreSQL is unavailable and a developer requests `/api/v1/hello`
- **THEN** the service still returns the greeting successfully

### Requirement: Process liveness
The service SHALL expose `GET /health/live`, returning HTTP 200 with JSON `{ "status": "ok" }` while it can serve requests, without querying the database.

#### Scenario: Database outage does not imply process failure
- **WHEN** the database is unreachable and the running service receives `/health/live`
- **THEN** it returns HTTP 200 with the specified liveness response

### Requirement: Interactive API documentation
The service SHALL serve Swagger UI at `/docs` and an OpenAPI document at `/docs/json`. The document SHALL describe the greeting and both health endpoints, including successful and unavailable-readiness responses. Swagger requests SHALL target the running API origin.

#### Scenario: Try a request in Swagger
- **WHEN** a developer opens `/docs` and executes the documented greeting operation
- **THEN** Swagger calls the running service and displays the HTTP 200 Persian greeting response

#### Scenario: Machine-readable contract
- **WHEN** a developer requests `/docs/json`
- **THEN** the service returns a valid OpenAPI document with schemas and response codes for all three API operations

### Requirement: Validated startup configuration
The service SHALL accept `DATABASE_URL`, `HOST`, and `PORT` configuration, with default host `127.0.0.1` and port `3001`. Missing or invalid required database configuration or invalid listener settings SHALL cause a nonzero startup exit with an actionable diagnostic that excludes credentials.

#### Scenario: Default local listener
- **WHEN** the developer starts the service with a valid database URL and omits host and port overrides
- **THEN** the service listens on `127.0.0.1:3001`

#### Scenario: Invalid configuration
- **WHEN** the developer starts the service with a missing database URL, invalid PostgreSQL URL, or invalid port
- **THEN** it exits nonzero before listening and reports the invalid setting without revealing credentials

### Requirement: Controlled shutdown
The service SHALL stop accepting requests and close database resources on SIGINT or SIGTERM, finishing or terminating in-flight work within a documented bounded shutdown period.

#### Scenario: Developer stops the API
- **WHEN** SIGINT or SIGTERM is delivered to the running service
- **THEN** shutdown completes within the configured bound and the listener and database resources are released
