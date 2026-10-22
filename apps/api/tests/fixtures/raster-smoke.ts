import sharp from "sharp";
for (const format of ["jpeg", "png", "webp"] as const) {
  const input = await sharp({ create: { width: 48, height: 24, channels: 3, background: "#2456af" } }).toFormat(format).toBuffer();
  const metadata = await sharp(input).metadata();
  const result = await sharp(input).rotate().resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  if (metadata.format !== format || result.info.format !== "webp" || result.info.width !== 32 || result.info.height !== 16) throw new Error("Raster fixture failed");
}
console.log("Bun JPEG/PNG/WebP decode and WebP encode smoke passed.");
