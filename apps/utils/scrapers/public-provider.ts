import { setTimeout as sleep } from "node:timers/promises";

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", zwnj: "\u200c", zwj: "\u200d", ndash: "–", mdash: "—" };
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

// Output is plain source text, never HTML intended for rendering.
export function plainText(value: unknown): string | null {
  const source = typeof value === "string" && value.trim() ? value.trim() : null;
  return source ? decodeEntities(source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() || null : null;
}

export function parseSitemap(xml: string): { kind: "index" | "urls"; urls: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urls" : null;
  if (!kind) throw new Error("Invalid sitemap XML");
  const urls = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decodeEntities(match[1].replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, "$1").trim()));
  return { kind, urls: [...new Set(urls)] };
}

type Rule = { allow: boolean; pattern: string };
/** Robots groups use the most specific matching user-agent and longest path rule. */
export function parseRobots(source: string, agent = "DorobBot") {
  const groups: { agents: string[]; rules: Rule[]; delay: number | null }[] = [];
  const sitemaps: string[] = [];
  let group: typeof groups[number] | undefined, hasDirectives = false;
  for (const line of source.split(/\r?\n/)) {
    const match = line.replace(/#.*/, "").match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2];
    if (key === "sitemap") { sitemaps.push(value); continue; }
    if (key === "user-agent") {
      if (!group || hasDirectives) { group = { agents: [], rules: [], delay: null }; groups.push(group); hasDirectives = false; }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      hasDirectives = true;
      if ((key === "allow" || key === "disallow") && value) group.rules.push({ allow: key === "allow", pattern: value });
      if (key === "crawl-delay" && Number.isFinite(Number(value)) && Number(value) >= 0) group.delay = Number(value) * 1000;
    }
  }
  const scores = groups.map(g => Math.max(-1, ...g.agents.map(a => a === "*" ? 0 : agent.toLowerCase().includes(a) ? a.length : -1)));
  const best = Math.max(-1, ...scores);
  const selected = groups.filter((_, i) => scores[i] === best && best >= 0);
  return {
    sitemaps,
    delayMs: Math.max(0, ...selected.map(g => g.delay ?? 0)),
    allows(input: string) {
      const url = new URL(input, "https://robots.invalid"), path = decodeURI(url.pathname + url.search);
      const matches = selected.flatMap(g => g.rules).filter(rule => {
        const expression = rule.pattern.split("*").map(part => part.replace(/[.+?^{}()|[\]\\]/g, "\\$&")).join(".*");
        return new RegExp(`^${expression}`).test(path);
      }).sort((a, b) => b.pattern.replace(/[*$]/g, "").length - a.pattern.replace(/[*$]/g, "").length || Number(b.allow) - Number(a.allow));
      return matches[0]?.allow ?? true;
    },
  };
}

export class AccessDeniedError extends Error {}
class HttpError extends Error {
  constructor(public status: number, public retryAfter: string | null) { super(`HTTP ${status}`); }
}

export type ScraperOptions = {
  delayMs?: number; timeoutMs?: number; retries?: number; maxResponseBytes?: number;
  fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; signal?: AbortSignal;
};

export class PublicProviderClient {
  private robots: ReturnType<typeof parseRobots> | undefined;
  private initialization: Promise<void> | undefined;
  private nextRequestAt = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private denied = false;
  private options: Required<Omit<ScraperOptions, "signal">> & Pick<ScraperOptions, "signal">;
  constructor(private readonly origin: string, options: ScraperOptions = {}) {
    if (new URL(origin).origin !== origin || !origin.startsWith("https://")) throw new Error("Expected HTTPS origin");
    this.options = { delayMs: 1500, timeoutMs: 30000, retries: 3, maxResponseBytes: 20 * 1024 * 1024, fetch: globalThis.fetch, sleep: ms => sleep(ms, undefined, { signal: options.signal }), ...options };
    for (const key of ["delayMs", "timeoutMs", "maxResponseBytes", "retries"] as const) {
      const value = this.options[key];
      if (!Number.isSafeInteger(value) || value < (key === "retries" || key === "delayMs" ? 0 : 1)) throw new Error(`Invalid ${key}`);
    }
    if (this.options.retries > 3) throw new Error("Maximum three retries");
  }

  async initialize(): Promise<void> {
    this.initialization ??= (async () => {
      const result = await this.queuedRequest(`${this.origin}/robots.txt`, true);
      this.robots = parseRobots(result.body);
      this.options.delayMs = Math.max(this.options.delayMs, this.robots.delayMs);
    })();
    return this.initialization;
  }

  private queuedRequest(input: string, robotsRequest = false): Promise<{ body: string; url: string }> {
    const task = this.queue.then(() => this.performRequest(input, robotsRequest));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async wait(ms: number): Promise<void> {
    const signal = this.options.signal;
    if (!signal) return this.options.sleep(ms);
    signal.throwIfAborted();
    let onAbort: () => void = () => undefined;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    try { await Promise.race([this.options.sleep(ms), aborted]); }
    finally { signal.removeEventListener("abort", onAbort); }
  }

  private async performRequest(input: string, robotsRequest: boolean): Promise<{ body: string; url: string }> {
    if (this.denied) throw new AccessDeniedError("Provider paused after access denial");
    const initialUrl = this.providerUrl(input).href;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      this.options.signal?.throwIfAborted();
      try {
        let url = initialUrl;
        for (let redirects = 0; redirects <= 5; redirects++) {
          if (!robotsRequest && !this.robots?.allows(url)) throw new AccessDeniedError(`Robots disallows ${url}`);
          const wait = this.nextRequestAt - Date.now();
          if (wait > 0) await this.wait(wait);
          this.options.signal?.throwIfAborted();
          this.nextRequestAt = Date.now() + this.options.delayMs;
          const timeout = AbortSignal.timeout(this.options.timeoutMs);
          const signal = this.options.signal ? AbortSignal.any([timeout, this.options.signal]) : timeout;
          const response = await this.options.fetch(url, { redirect: "manual", signal, headers: { "User-Agent": "DorobBot/1.0 (public course catalog)", Accept: robotsRequest ? "text/plain" : "text/html,application/xml,text/xml" } });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            await response.body?.cancel();
            const location = response.headers.get("location");
            if (!location || redirects === 5) throw new Error("Invalid or excessive redirects");
            url = this.providerUrl(new URL(location, url).href).href;
            if (robotsRequest && new URL(url).pathname !== "/robots.txt") throw new Error("Unexpected robots redirect");
            continue;
          }
          if (response.status === 401 || response.status === 403) { this.denied = true; await response.body?.cancel(); throw new AccessDeniedError(`Provider denied access: HTTP ${response.status}`); }
          // RFC 9309 §2.3.1.3: a missing robots resource is not an access denial.
          // Only robots 404 is accepted; ordinary 404s and unreachable/denied robots still fail.
          if (robotsRequest && response.status === 404) { await response.body?.cancel(); return { body: "", url }; }
          if (!response.ok) { await response.body?.cancel(); throw new HttpError(response.status, response.headers.get("retry-after")); }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Empty response body");
          let bytes = 0, body = "";
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              bytes += value.byteLength;
              if (bytes > this.options.maxResponseBytes) { await reader.cancel(); throw new Error("Response exceeds size limit"); }
              body += decoder.decode(value, { stream: true });
            }
          } finally { reader.releaseLock(); }
          return { body: body + decoder.decode(), url };
        }
        throw new Error("Redirect limit exceeded");
      } catch (error) {
        this.options.signal?.throwIfAborted();
        const transient = error instanceof HttpError ? error.status === 429 || error.status >= 500 : error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name));
        if (!transient) throw error;
        const retry = error instanceof HttpError ? error.retryAfter : null;
        const retryMs = retry ? /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now()) : 0;
        // Persist the wait so future requests respect Retry-After too.
        this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + Math.max(1000 * 2 ** attempt + Math.random() * 250, Number.isFinite(retryMs) ? retryMs : 0));
        if (attempt === this.options.retries) throw error;
      }
    }
    throw new Error("Request retries exhausted");
  }


  private providerUrl(input: string): URL {
    const url = new URL(input, `${this.origin}/`);
    if (url.origin !== this.origin || url.username || url.password) throw new Error(`Only HTTPS ${new URL(this.origin).hostname} URLs are allowed`);
    url.hash = "";
    return url;
  }

  canonicalUrl(input: string): string { return this.providerUrl(input).href; }
  get sitemapUrls(): string[] { return [...(this.robots?.sitemaps ?? [])]; }
  allows(input: string): boolean { return this.robots?.allows(this.canonicalUrl(input)) ?? false; }
  async request(input: string): Promise<{ body: string; url: string }> {
    await this.initialize();
    return this.queuedRequest(input);
  }
}
