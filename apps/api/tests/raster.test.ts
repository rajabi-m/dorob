import { test, expect } from "bun:test";
import sharp from "sharp";
import { createRasterProcessor, INPUT_LIMIT } from "../src/raster";

test("static formats resize, preserve aspect, remove metadata, do not upscale", async () => {
  const processor = createRasterProcessor();
  try {
    for (const format of ["jpeg", "png", "webp"] as const) {
      const input = await sharp({ create: { width: 1280, height: 640, channels: 3, background: "red" } }).toFormat(format).withMetadata().toBuffer();
      const result = await processor.process(input), metadata = await sharp(result.bytes).metadata();
      expect([result.width, result.height]).toEqual([640, 320]); expect(result.bytes.length).toBeLessThanOrEqual(524288); expect(metadata.format).toBe("webp"); expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined();
    }
    const small = await sharp({ create: { width: 20, height: 10, channels: 3, background: "blue" } }).jpeg().toBuffer();
    expect((await processor.process(small)).width).toBe(20);
    const oriented = await sharp({ create: { width: 40, height: 20, channels: 3, background: "red" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const result = await processor.process(oriented); expect([result.width, result.height]).toEqual([20, 40]);
  } finally { await processor.close(); }
});
test("spoofed, SVG, animation, input/pixel limits fail without output", async () => {
  const processor = createRasterProcessor();
  try {
    await expect(processor.process(Buffer.from("<svg><rect width='10'/></svg>"))).rejects.toMatchObject({ code: "invalid_image" });
    await expect(processor.process(Buffer.from("not png"))).rejects.toMatchObject({ code: "invalid_image" });
    await expect(processor.process(new Uint8Array(INPUT_LIMIT + 1))).rejects.toMatchObject({ code: "input_limit" });
    const enormous = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: "red" } }).png().toBuffer();
    await expect(processor.process(enormous)).rejects.toMatchObject({ code: "invalid_image" });
    const animated = await sharp(Buffer.from([255,0,0,0,0,255]), { raw: { width: 1, height: 2, channels: 3, pageHeight: 1 } }).webp({ loop: 0, delay: [100,100] }).toBuffer();
    await expect(processor.process(animated)).rejects.toMatchObject({ code: "invalid_image" });
  } finally { await processor.close(); }
});
test("deadline kills isolated work and reclaims concurrency", async () => {
  const processor = createRasterProcessor({ deadlineMs: 30, workerUrl: new URL("./fixtures/stalled-raster.ts", import.meta.url), concurrency: 1 });
  const first = processor.process(new Uint8Array([1]));
  await expect(processor.process(new Uint8Array([1]))).rejects.toMatchObject({ code: "busy" });
  await expect(first).rejects.toMatchObject({ code: "processing_timeout" });
  await expect(processor.process(new Uint8Array([1]))).rejects.toMatchObject({ code: "processing_timeout" }); await processor.close();
});
