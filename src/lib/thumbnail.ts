import sharp from "sharp";

// Keep in sync with THUMB_WIDTH in media-url.ts. Standalone (no "@/" or server-only imports) so it can be unit-tested
// in plain node; it is only ever imported by the server-only image-variants module.
const THUMB_MAX_SIDE = 640;

/**
 * Resizes a photo to a small WebP thumbnail (<= 640px on its longest side, never enlarged).
 * Honours EXIF rotation and tolerates slightly damaged files instead of throwing.
 */
export async function makeThumbnail(input: Uint8Array | Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none", limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: THUMB_MAX_SIDE, height: THUMB_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
}
