# Proposal

## Why

Dorob is running on Hamravesh, but the owner cannot easily see when visitors arrive. Simple page-request logs provide enough visibility for the current review period.

## What Changes

- Print one compact line with UTC timestamp, visitor IP and pathname for public page requests.
- Exclude health checks, APIs, assets and framework prefetch traffic.
- Read standard ingress IP headers automatically; require no custom configuration.
- No dashboard, database storage, analytics service or person identification.

## Capabilities

### New Capabilities

- `visitor-logging`: Minimal server-side public page-request logging.

### Modified Capabilities

None.

## Impact

Next.js web proxy, focused web tests and project status documentation. Existing container supervision already forwards web output; no dependency or migration is needed.
