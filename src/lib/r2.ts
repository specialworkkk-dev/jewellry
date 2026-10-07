import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (process.env.NODE_ENV !== "test" && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
  console.warn("⚠️ Missing Cloudflare R2 environment variables");
}

export const r2Client = new S3Client({
  region: "auto",
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
  try {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) return;
    const keys = shopOwnedR2Keys(shopId, urls);
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
