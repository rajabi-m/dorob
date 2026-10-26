# Design

## Context

See proposal.md for motivation. Next.js 16 already has `src/proxy.ts` for admin authentication. The container supervisor inherits web stdout, so no logging service is needed. Hamravesh's actual IP-header behavior has not been verified.

## Goals / Non-Goals

**Goals:** Add lightweight document-request visibility while preserving admin protection.

**Non-Goals:** Completed-response status, client-side navigation tracking, visitor counting, alerts or retained analytics.

## Decisions

- Extend the existing proxy with an explicit public-page matcher and a small server-only logging helper; retain admin matching and ensure public requests bypass admin authorization. This avoids a custom server or reverse proxy.
- Emit JSON lines such as `{"event":"visitor","time":"2026-10-26T14:32:10Z","ip":"203.0.113.42","path":"/groups"}`. JSON keeps one-line output safe and searchable. Log request arrival, not final response status: proxy executes before rendering.
- Log public GET document requests only; filter prefetch and RSC requests as well as excluded paths. This deliberately covers direct openings and reloads, without claiming every in-app navigation is logged.
- Automatically use a valid single `X-Real-IP` value, then the first `X-Forwarded-For` address as fallback. Prefer the ingress's resolved address because Next.js can synthesize `X-Forwarded-For` from its socket when absent. Validate with Node's IP parser; emit `unknown` only if neither supplies a valid address. Require no environment setting. These fields are log attribution only and never affect authentication.
- No persistence or extra dependencies. Keep logging failures isolated from page delivery.

## Risks / Trade-offs

- Bots can request pages; shared IPs and VPNs obscure identity -> describe lines as requests, never verified people.
- Forwarding headers depend on ingress behavior and can be spoofed when accessed directly -> use them for informational logging only, never access control.
- Client navigation, cached pages and prefetching limit coverage -> document that this is a basic arrival log.
- Platform retention controls history -> use existing Hamravesh log retention; add no storage.

## Migration Plan

Build and deploy the updated image through the existing process; no extra settings or migrations are needed. Open a public page and inspect its `visitor` line in Hamravesh. Deployment is a separate operator action. Roll back the image to remove logging.
