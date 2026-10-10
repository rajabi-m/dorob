import sharp from "sharp";
sharp.cache(false); sharp.concurrency(1);
try {
  const input = Buffer.from(await Bun.stdin.arrayBuffer());
  if (!input.length || input.length > 10 * 1024 * 1024) throw new Error("input_limit");
  const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning", animated: true });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("unsupported_image");
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 25_000_000) throw new Error("pixel_limit");
  for (const quality of [80, 65, 50]) {
    const result = await sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" }).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality }).timeout({ seconds: 25 }).toBuffer({ resolveWithObject: true });
    if (result.data.length <= 512 * 1024) {
      console.log(JSON.stringify({ width: result.info.width, height: result.info.height, bytes: result.data.toString("base64") }));
      process.exit(0);
    }
  }
  throw new Error("output_limit");
} catch { console.log(JSON.stringify({ error: "invalid_image" })); process.exit(1); }
