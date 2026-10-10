import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ImageError, INPUT_LIMIT } from "./raster";

export interface Address { address: string; family: number }
export interface ImageTransportResponse { status: number; location?: string; contentLength?: string; body: AsyncIterable<Uint8Array> }
export interface ImageTransport {
  resolve(hostname: string): Promise<Address[]>;
  connect(url: URL, signal: AbortSignal): Promise<ImageTransportResponse>;
}
function ipv4Number(ip: string): number { return ip.split(".").reduce((sum, part) => sum * 256 + Number(part), 0); }
function in4(ip: number, base: string, prefix: number) { const size = 2 ** (32 - prefix); return Math.floor(ip / size) === Math.floor(ipv4Number(base) / size); }
/** Conservative public-unicast policy. Special-use and transition ranges fail closed. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const n = ipv4Number(address);
    return !([ ["0.0.0.0",8], ["10.0.0.0",8], ["100.64.0.0",10], ["127.0.0.0",8], ["169.254.0.0",16], ["172.16.0.0",12], ["192.0.0.0",24], ["192.0.2.0",24], ["192.88.99.0",24], ["192.168.0.0",16], ["198.18.0.0",15], ["198.51.100.0",24], ["203.0.113.0",24], ["224.0.0.0",3] ] as [string, number][]).some(([base, prefix]) => in4(n, base, prefix));
  }
  if (family !== 6 || address.includes("%") || address.includes(".")) return false;
  const parts = address.toLowerCase().split("::");
  const left = parts[0] ? parts[0].split(":") : [], right = parts[1] ? parts[1].split(":") : [];
  const words = parts.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  const n = words.reduce((sum, word) => (sum << 16n) + BigInt(`0x${word}`), 0n);
  const range = (base: bigint, prefix: number) => (n >> BigInt(128 - prefix)) === (base >> BigInt(128 - prefix));
  return range(0x20000000000000000000000000000000n, 3) && ![
    [0x20010000000000000000000000000000n,23], [0x20010db8000000000000000000000000n,32],
    [0x20020000000000000000000000000000n,16], [0x3ffe0000000000000000000000000000n,16], [0x3fff0000000000000000000000000000n,20],
  ].some(([base, prefix]) => range(BigInt(base), Number(prefix)));
}
/**
 * TODO: restore verified connection IP pinning in a later change.
 * Owner accepted SSRF/DNS rebinding risk for internal-crawler URLs on 2026-10-10:
 * preflight DNS validation and this standard HTTPS request resolve independently.
 * TLS certificate/hostname verification stays enabled; redirects remain manual.
 */
export function createPublicHttpsTransport(fetcher: typeof fetch = fetch): ImageTransport {
  return {
    resolve: hostname => lookup(hostname, { all: true, verbatim: true }),
    async connect(url, signal) {
      const response = await fetcher(url, {
        method: "GET", signal, redirect: "manual", credentials: "omit",
        tls: { rejectUnauthorized: true },
        headers: { Accept: "image/jpeg, image/png, image/webp", "User-Agent": "Dorob-local-thumbnail/1" },
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        return { status: response.status, location: response.headers.get("location") ?? undefined, body: (async function* () {})() };
      }
      const body = (async function* () {
        const reader = response.body?.getReader(); if (!reader) return;
        try {
          while (true) { const item = await reader.read(); if (item.done) break; yield item.value; }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      })();
      return { status: response.status, contentLength: response.headers.get("content-length") ?? undefined, body };
    },
  };
}
export const publicHttpsTransport = createPublicHttpsTransport();
export function createImageDownloader(transport: ImageTransport = publicHttpsTransport, options: { deadlineMs?: number; concurrency?: number; maxBytes?: number } = {}) {
  let active = 0;
  return async function download(input: string): Promise<Buffer> {
    if (active >= (options.concurrency ?? 2)) throw new ImageError("busy", 503);
    active++; const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = options.maxBytes ?? INPUT_LIMIT;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ImageError("download_failed")); }, options.deadlineMs ?? 15000); });
    async function run(): Promise<Buffer> {
      let url: URL; try { url = new URL(input); } catch { throw new ImageError("unsafe_destination"); }
      for (let redirects = 0; ; redirects++) {
        if (controller.signal.aborted) throw new ImageError("download_failed");
        if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new ImageError("unsafe_destination");
        const hostname = url.hostname.replace(/^\[|\]$/g, "");
        const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await transport.resolve(hostname);
        if (!addresses.length || addresses.some(item => !isPublicAddress(item.address) || item.family !== isIP(item.address))) throw new ImageError("unsafe_destination");
        if (controller.signal.aborted) throw new ImageError("download_failed");
        const response = await transport.connect(url, controller.signal);
        if (response.status >= 300 && response.status < 400) {
          if (redirects >= 3 || !response.location) throw new ImageError("download_failed");
          url = new URL(response.location, url); continue;
        }
        if (response.status !== 200) { controller.abort(); throw new ImageError("download_failed"); }
        if (response.contentLength !== undefined && (!/^\d+$/.test(response.contentLength) || Number(response.contentLength) > limit)) { controller.abort(); throw new ImageError("input_limit", 413); }
        const chunks: Buffer[] = []; let bytes = 0;
        for await (const chunk of response.body) {
          if (controller.signal.aborted) throw new ImageError("download_failed");
          bytes += chunk.length; if (bytes > limit) { controller.abort(); throw new ImageError("input_limit", 413); } chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
    }
    try { return await Promise.race([run(), deadline]); }
    catch (error) { controller.abort(); if (error instanceof ImageError) throw error; throw new ImageError("download_failed"); }
    finally { clearTimeout(timer); active--; }
  };
}
