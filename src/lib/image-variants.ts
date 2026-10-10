import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, readObjectBytes } from "@/lib/r2";
import { thumbKeyFor } from "@/lib/media-url";
import { makeThumbnail } from "@/lib/thumbnail";

/** Writes the thumbnail next to `key` from already-available bytes. Never throws: thumbnails are optional. */
export async function putThumbnailFromBytes(key: string, bytes: Uint8Array | Buffer): Promise<boolean> {
  try {
    const thumbKey = thumbKeyFor(key);
    const bucket = process.env.R2_BUCKET_NAME;
    if (!thumbKey || !bucket) return false;
    const body = await makeThumbnail(bytes);
    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: body,
      ContentLength: body.length,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return true;
  } catch (error) {
    console.error("Thumbnail generation failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

/** Reads the stored full-size photo from R2 and writes its thumbnail. Never throws. */
export async function createThumbnailForKey(key: string): Promise<boolean> {
  try {
    if (!thumbKeyFor(key)) return false;
    const bytes = await readObjectBytes(key, 12 * 1024 * 1024);
    return bytes ? await putThumbnailFromBytes(key, bytes) : false;
  } catch (error) {
    console.error("Thumbnail source read failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}
