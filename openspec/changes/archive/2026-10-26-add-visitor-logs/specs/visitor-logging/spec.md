# Spec Delta

## Purpose

Give Dorob's operator a simple timestamped record of public page requests in application logs.

## ADDED Requirements

### Requirement: Public page request output
The website SHALL write one compact single-line record to standard output for each public GET document request, containing event `visitor`, an ISO 8601 UTC timestamp, IP and pathname. Public pages SHALL include `/`, `/courses`, `/groups` and `/groups/<slug>`. Logging SHALL NOT change routing or authorization behavior.

#### Scenario: Visitor opens a page
- **WHEN** a visitor directly opens or reloads `/groups/python`
- **THEN** one visitor record contains its timestamp, IP and `/groups/python`, and the request continues normally

### Requirement: Background traffic exclusion
Visitor records SHALL exclude API, health, admin, design-system, asset, framework-internal, non-GET, prefetch and React Server Component requests. These records SHALL represent document requests rather than unique people or all client-side navigation.

#### Scenario: Routine background traffic
- **WHEN** a health probe, thumbnail load, prefetch or client-side component request reaches the website
- **THEN** no visitor record is emitted for that request

### Requirement: Automatic ingress client IP
The website SHALL automatically use a valid single `X-Real-IP` address, falling back to a valid first `X-Forwarded-For` address. It SHALL require no custom configuration and use `unknown` when neither provides a valid IP. Forwarded values SHALL NOT affect authorization.

#### Scenario: Standard forwarding chain
- **WHEN** `X-Real-IP` is absent or invalid and `X-Forwarded-For` contains `203.0.113.42, 10.0.0.5`
- **THEN** the visitor record uses `203.0.113.42` without an environment setting

#### Scenario: Resolved ingress address
- **WHEN** `X-Real-IP` contains a valid IPv4 or IPv6 address, even if `X-Forwarded-For` is also present
- **THEN** the visitor record uses that address

#### Scenario: No valid address
- **WHEN** neither standard header supplies a valid address
- **THEN** the visitor record uses `unknown` without failing the page request

### Requirement: Bounded log contents
Visitor records SHALL omit query strings, request bodies, cookies, authorization headers and other arbitrary request headers. Request-derived text SHALL be encoded to prevent extra log lines. Logging failure SHALL NOT prevent page delivery.

#### Scenario: Request includes sensitive or multiline input
- **WHEN** an eligible request contains query parameters, credentials or line-break characters
- **THEN** its visitor record contains only the defined fields on one line, without query parameters or credentials
