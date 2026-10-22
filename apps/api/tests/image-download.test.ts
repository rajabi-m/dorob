import { test, expect } from "bun:test";
import { createImageDownloader, createPublicHttpsTransport, isPublicAddress, type ImageTransport } from "../src/image-download";

const body = async function* () { yield Buffer.from("image"); };
const publicDns = async () => [{ address: "8.8.8.8", family: 4 }];
test("public classification blocks private, reserved, mapped and transition addresses", () => {
  for (const address of ["0.1.1.1", "127.0.0.1", "10.1.1.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.1.1", "192.0.2.1", "198.18.1.1", "224.0.0.1", "240.0.0.1", "::", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "2001:db8::1", "2002:7f00:1::", "3fff::1"]) expect(isPublicAddress(address)).toBe(false);
  expect(isPublicAddress("8.8.8.8")).toBe(true); expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
});
test("mixed DNS and private redirects never connect to unsafe targets", async () => {
  let calls = 0;
  const mixed = createImageDownloader({ resolve: async () => [...await publicDns(), { address: "127.0.0.1", family: 4 }], connect: async () => { calls++; return { status: 200, body: body() }; } });
  await expect(mixed("https://example.org/image")).rejects.toMatchObject({ code: "unsafe_destination" }); expect(calls).toBe(0);
  const redirect = createImageDownloader({ resolve: publicDns, connect: async () => { calls++; return { status: 302, location: "https://127.0.0.1/internal", body: body() }; } });
  await expect(redirect("https://example.org/image")).rejects.toMatchObject({ code: "unsafe_destination" }); expect(calls).toBe(1);
});
test("preflights every redirect without pinning and does not accept credentials", async () => {
  let resolved = 0; const requested: string[] = [];
  const transport: ImageTransport = { resolve: async () => { resolved++; return [{ address: resolved === 1 ? "8.8.8.8" : "1.1.1.1", family: 4 }]; }, connect: async (url) => {
    requested.push(url.hostname); expect(url.username).toBe("");
    return requested.length === 1 ? { status: 302, location: "https://second.example/image", body: body() } : { status: 200, body: body() };
  } };
  const download = createImageDownloader(transport); expect((await download("https://first.example/image")).toString()).toBe("image"); expect(requested).toEqual(["first.example", "second.example"]); expect(resolved).toBe(2);
  await expect(download("https://user:password@first.example/image")).rejects.toMatchObject({ code: "unsafe_destination" });
  await expect(download("http://first.example/image")).rejects.toMatchObject({ code: "unsafe_destination" });
});
test("false/absent lengths still enforce streaming byte limits and abort", async () => {
  for (const contentLength of [undefined, "1", "100"]) {
    let aborted = false;
    const download = createImageDownloader({ resolve: publicDns, connect: async (_url, signal) => {
      signal.addEventListener("abort", () => { aborted = true; }); return { status: 200, contentLength, body: body() };
    } }, { maxBytes: 3 });
    await expect(download("https://example.org/image")).rejects.toMatchObject({ code: "input_limit" }); expect(aborted).toBe(true);
  }
});
test("deadline cancels transport and bounds concurrent retrieval", async () => {
  let aborted = false;
  const download = createImageDownloader({ resolve: publicDns, connect: (_url, signal) => new Promise((_, reject) => { signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); }); }) }, { deadlineMs: 20, concurrency: 1 });
  const pending = download("https://example.org/image");
  await expect(download("https://example.org/image")).rejects.toMatchObject({ code: "busy" }); await expect(pending).rejects.toMatchObject({ code: "download_failed" }); expect(aborted).toBe(true);
  await expect(download("https://example.org/image")).rejects.toMatchObject({ code: "download_failed" });
});

test("standard HTTPS keeps TLS verification, manual redirects and credential omission; DNS pinning is deferred", async () => {
  const requests: { url: string; options: RequestInit }[] = [];
  const fetcher = (async (url: URL | string | Request, options?: RequestInit) => {
    requests.push({ url: String(url), options: options! }); return new Response("image");
  }) as typeof fetch;
  const transport = createPublicHttpsTransport(fetcher);
  transport.resolve = publicDns;
  const download = createImageDownloader(transport);
  expect((await download("https://example.org/image")).toString()).toBe("image");
  expect(requests[0].url).toBe("https://example.org/image"); // Original hostname, not the preflight IP.
  expect(requests[0].options).toMatchObject({ credentials: "omit", redirect: "manual", tls: { rejectUnauthorized: true } });
  expect(Object.keys(requests[0].options.headers!)).toEqual(["Accept", "User-Agent"]);
  expect(requests[0].options).not.toHaveProperty("lookup");
});
