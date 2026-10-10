import { createHash, randomBytes } from "node:crypto";
import { mkdir, link, unlink, readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ImageError, OUTPUT_LIMIT, type ProcessedImage } from "./raster";
export const byteHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export interface StorageConfig { assetDirectory: string; stagingDirectory: string }
export function loadStorageConfig(env: Record<string, string | undefined>): StorageConfig {
  const assetDirectory = resolve(env.THUMBNAIL_ASSET_DIR ?? "storage/thumbnails");
  const stagingDirectory = resolve(env.THUMBNAIL_STAGING_DIR ?? "storage/staging");
  if (assetDirectory === stagingDirectory || assetDirectory.startsWith(stagingDirectory + "/") || stagingDirectory.startsWith(assetDirectory + "/")) throw new Error("Thumbnail asset and staging directories must be separate.");
  return { assetDirectory, stagingDirectory };
}
export function createAssetStore(config: StorageConfig) {
  function path(directory: string, key: string) {
    if (!/^[a-f0-9]{64}\.webp$/.test(key)) throw new ImageError("asset_unavailable", 503);
    return join(directory, key);
  }
  async function atomic(directory: string, key: string, bytes: Buffer) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = join(directory, `${randomBytes(32).toString("hex")}.tmp`);
    try {
      await Bun.write(temporary, bytes, { mode: 0o600 });
      try { await link(temporary, path(directory, key)); } catch (error) { if ((error as { code: string }).code !== "EEXIST") throw error; }
      const stored = await readFile(path(directory, key));
      if (byteHash(stored) !== byteHash(bytes)) throw new ImageError("asset_unavailable", 503);
    } finally { await unlink(temporary).catch(() => {}); }
  }
  return {
    config,
    async initialize() { await Promise.all([mkdir(config.assetDirectory, { recursive: true, mode: 0o700 }), mkdir(config.stagingDirectory, { recursive: true, mode: 0o700 })]); },
    async stage(image: ProcessedImage, token: string) { const key = `${token}.webp`; await atomic(config.stagingDirectory, key, image.bytes); return key; },
    async persist(image: ProcessedImage) { const hash = byteHash(image.bytes), key = `${hash}.webp`; await atomic(config.assetDirectory, key, image.bytes); return { hash, storageKey: key }; },
    async read(key: string, hash: string, staged = false) {
      try {
        const file = Bun.file(path(staged ? config.stagingDirectory : config.assetDirectory, key));
        if (file.size > OUTPUT_LIMIT) throw new Error();
        const bytes = Buffer.from(await file.arrayBuffer());
        if (!bytes.length || byteHash(bytes) !== hash) throw new Error(); return bytes;
      } catch { throw new ImageError("asset_unavailable", 503); }
    },
    async removeStage(key: string) { await unlink(path(config.stagingDirectory, key)).catch(() => {}); },
    async cleanupOrphanStage(referenced: (key: string) => Promise<boolean>) {
      let checked = 0;
      for (const key of await readdir(config.stagingDirectory)) {
        if (checked >= 100) break;
        if (/^[a-f0-9]{64}\.webp$/.test(key) && Date.now() - (await stat(path(config.stagingDirectory, key))).mtimeMs > 3600_000) {
          checked++;
          if (!(await referenced(key))) await unlink(path(config.stagingDirectory, key));
        }
      }
    },
    async cleanupTemporary() {
      // Bounded abandoned atomic writes only; never delete a content key or staged upload here.
      for (const directory of [config.assetDirectory, config.stagingDirectory]) {
        const entries = await readdir(directory); let cleaned = 0;
        for (const key of entries) {
          if (cleaned >= 100) break;
          if (/^[a-f0-9]{64}\.tmp$/.test(key) && Date.now() - (await stat(join(directory, key))).mtimeMs > 3600_000) { await unlink(join(directory, key)); cleaned++; }
        }
      }
    },
  };
}
export type AssetStore = ReturnType<typeof createAssetStore>;
