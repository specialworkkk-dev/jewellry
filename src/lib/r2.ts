import { DeleteObjectsCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { thumbKeyFor } from "@/lib/media-url";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (process.env.NODE_ENV !== "test" && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
  console.warn("⚠️ Missing Cloudflare R2 environment variables");
}

export const r2Client = new S3Client({
  region: "auto",
  // Recent AWS SDKs add a CRC32 checksum to every request. For a presigned PUT the checksum of an
  // empty body ends up signed into the URL, so the browser's real upload then fails verification.
  // Only compute checksums when an operation requires them.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Map public media URLs to R2 object keys, keeping only keys that live under
 * this shop's own prefix (shops/{shopId}/). Foreign/malformed URLs are ignored.
 */
export function shopOwnedR2Keys(shopId: string, urls: unknown[]): string[] {
  const base = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "");
  if (!base || !/^[a-f0-9]{24}$/i.test(shopId)) return [];
  const prefix = `shops/${shopId}/`;
  const keys = new Set<string>();
  for (const value of urls) {
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      const baseUrl = new URL(base);
      if (url.origin !== baseUrl.origin) continue;
      const basePath = baseUrl.pathname.replace(/\/$/, "");
      if (basePath && !url.pathname.startsWith(`${basePath}/`)) continue;
      const key = decodeURIComponent(url.pathname.slice(basePath.length + 1));
      if (!key.startsWith(prefix) || key.length === prefix.length) continue;
      if (key.split("/").some((segment) => segment === ".." || segment === ".")) continue;
      keys.add(key);
    } catch {
      continue;
    }
  }
  return [...keys];
}

/** Best-effort deletion of a shop's own R2 objects. Never throws. */
export async function deleteShopObjects(shopId: string, urls: unknown[]): Promise<void> {
  await deleteR2Keys(shopOwnedR2Keys(shopId, urls));
}

/** Best-effort deletion of exact R2 keys (callers must have verified ownership). Never throws. */
export async function deleteR2Keys(requestedKeys: string[]): Promise<void> {
  try {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket || requestedKeys.length === 0) return;
    // A photo's generated thumbnail lives next to it and must go with it.
    const keys = [...new Set(requestedKeys.flatMap((key) => {
      const thumb = thumbKeyFor(key);
      return thumb ? [key, thumb] : [key];
    }))];
    for (let index = 0; index < keys.length; index += 1000) {
      const chunk = keys.slice(index, index + 1000);
      await r2Client.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }));
    }
  } catch (error) {
    console.error("R2 object cleanup failed:", error instanceof Error ? error.message : "unknown error");
  }
}

/**
 * Reads the stored size and the first bytes of an object with one ranged GET.
 * Returns null when the object does not exist.
 */
export async function readObjectHead(key: string, bytes = 512): Promise<{ length: number; head: Uint8Array } | null> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Media storage is not configured");
  try {
    const response = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
    // ContentRange is "bytes 0-511/12345"; without it the whole (small) object was returned.
    const total = Number(response.ContentRange?.split("/")[1] ?? response.ContentLength);
    const head = response.Body ? await response.Body.transformToByteArray() : new Uint8Array();
    return { length: Number.isFinite(total) ? total : head.length, head };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    if (name === "InvalidRange") return { length: 0, head: new Uint8Array() }; // zero-byte object
    throw error;
  }
}

/** Reads a whole (size-capped) object. Returns null when it does not exist or is larger than maxBytes. */
export async function readObjectBytes(key: string, maxBytes: number): Promise<Uint8Array | null> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Media storage is not configured");
  try {
    const response = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (typeof response.ContentLength === "number" && response.ContentLength > maxBytes) return null;
    return response.Body ? await response.Body.transformToByteArray() : null;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw error;
  }
}
