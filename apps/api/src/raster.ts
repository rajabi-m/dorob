export const THUMBNAIL_PROFILE = "webp-640-q80-v1";
export const INPUT_LIMIT = 10 * 1024 * 1024;
export const OUTPUT_LIMIT = 512 * 1024;
export class ImageError extends Error {
  constructor(public readonly code: "invalid_image" | "input_limit" | "output_limit" | "processing_timeout" | "unsafe_destination" | "download_failed" | "busy" | "asset_unavailable", public readonly status: 413 | 422 | 503 = 422) { super(code); }
}
export interface ProcessedImage { bytes: Buffer; width: number; height: number; profile: string }
export interface RasterProcessor { process(input: Uint8Array): Promise<ProcessedImage>; close(): Promise<void> }

export function createRasterProcessor(options: { deadlineMs?: number; workerUrl?: URL; concurrency?: number } = {}): RasterProcessor {
  const children = new Set<ReturnType<typeof Bun.spawn>>(); let active = 0; let closed = false;
  const workerUrl = options.workerUrl ?? new URL(import.meta.url.endsWith(".ts") ? "./raster-worker.ts" : "./raster-worker.js", import.meta.url);
  return {
    async process(input) {
      if (closed || active >= (options.concurrency ?? 2)) throw new ImageError("busy", 503);
      if (input.length > INPUT_LIMIT) throw new ImageError("input_limit", 413);
      active++;
      let child: Bun.Subprocess<"pipe", "pipe", "ignore"> | undefined; let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        child = Bun.spawn([process.execPath, workerUrl.pathname], { stdin: "pipe", stdout: "pipe", stderr: "ignore" }); children.add(child);
        child.stdin!.write(input); child.stdin!.end();
        const running = child;
        const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { running.kill(9); reject(new ImageError("processing_timeout")); }, options.deadlineMs ?? 30000); });
        const result = await Promise.race([Promise.all([new Response(child.stdout).text(), child.exited]), deadline]);
        if (result[0].length > 750000 || result[1] !== 0) throw new ImageError("invalid_image");
        const parsed = JSON.parse(result[0]); const bytes = Buffer.from(parsed.bytes, "base64");
        if (!bytes.length || bytes.length > OUTPUT_LIMIT || !Number.isInteger(parsed.width) || !Number.isInteger(parsed.height) || parsed.width < 1 || parsed.height < 1 || parsed.width > 640 || parsed.height > 640) throw new ImageError("output_limit");
        return { bytes, width: parsed.width, height: parsed.height, profile: THUMBNAIL_PROFILE };
      } catch (error) { if (error instanceof ImageError) throw error; throw new ImageError("invalid_image"); }
      finally { clearTimeout(timer); if (child) { child.kill(9); await child.exited; children.delete(child); } active--; }
    },
    async close() { closed = true; for (const child of children) child.kill(9); await Promise.all([...children].map(child => child.exited)); },
  };
}
