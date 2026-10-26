# Tasks

## 1. Visitor logs

- [x] 1.1 Add the logging helper and extend the existing web proxy; verify focused tests cover public document requests, excluded traffic, unchanged admin protection and logging failure isolation.
- [x] 1.2 Add automatic standard ingress IP parsing and safe one-line output; verify IPv4/IPv6, forwarded chains, Real-IP fallback, invalid values and omission of queries/credentials with focused tests.
- [x] 1.3 Keep project status accurate and remove the unnecessary visitor-logging section from container deployment documentation; verify no custom header setting or stale setup links remain.

## 2. Integration checks

- [x] 2.1 Run documented web lint, type checking and production build; smoke-check the production server for one public visit line, no health/asset/prefetch lines and preserved admin protection. Record results and any hosted-header verification still pending.
