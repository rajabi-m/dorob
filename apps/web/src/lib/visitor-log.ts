import 'server-only';
import {isIP} from 'node:net';

function visitorIP(headers: Headers) {
  // Prefer the ingress's resolved address over a forwarding chain (which
  // Next.js may synthesize from its socket). Never use this for authorization.
  const real = headers.get('x-real-ip')?.trim();
  if (real && isIP(real)) return real;
  const forwarded = headers.get('x-forwarded-for')?.split(',', 1)[0].trim();
  return forwarded && isIP(forwarded) ? forwarded : 'unknown';
}

/** Arrival logs cover public document requests, not client-side navigation. */
export function logVisitor(request: Request, write: (line: string) => void = console.log) {
  try {
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET' || !/^(?:\/|\/courses\/?|\/groups(?:\/[^/]+)?\/?)$/.test(path)) return;
    const headers = request.headers;
    if (headers.has('rsc') || headers.has('next-router-prefetch') || headers.has('next-router-segment-prefetch')) return;
    if (['purpose', 'sec-purpose'].some(name => /prefetch|prerender/i.test(headers.get(name) ?? ''))) return;
    if (headers.get('sec-fetch-dest') !== 'document' && !headers.get('accept')?.includes('text/html')) return;
    write(JSON.stringify({event: 'visitor', time: new Date().toISOString(), ip: visitorIP(headers), path}));
  } catch {
    // Logging must never prevent page delivery.
  }
}
