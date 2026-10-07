import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2Client } from "@/lib/r2";
import { cleanString, isRecord } from "@/lib/validation";
import { getVerifiedOwnerTenant } from "@/lib/tenant";

const ALLOWED_FOLDERS = new Set(["products", "logos", "covers", "posts", "stories"]);
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
]);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { shopId, shop } = tenant;

    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const filename = cleanString(body.filename, 180);
    const contentType = cleanString(body.contentType, 100).toLowerCase();
    const contentLength = Number(body.contentLength);
    const durationSeconds = Number(body.durationSeconds);
    const folderValue = cleanString(body.folder, 30);
    const folder = ALLOWED_FOLDERS.has(folderValue) ? folderValue : "products";
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "");

    if (!filename || !ALLOWED_TYPES.has(contentType) || !Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Invalid filename, file type, or file size" }, { status: 400 });
    }
    const isVideo = contentType.startsWith("video/");
    if (isVideo && (folder === "logos" || folder === "covers")) {
      return NextResponse.json({ error: "Videos are not allowed in this section" }, { status: 400 });
    }
    if (!isVideo && contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be smaller than 10 MB" }, { status: 413 });
    }
    if (isVideo) {
      if (!shop?.isActive || shop.videoUploadsEnabled !== true) {
        return NextResponse.json({ error: "Video uploads are not enabled for this shop" }, { status: 403 });
      }
      const maximumDuration = Math.min(120, Math.max(5, Number(shop.maxVideoDurationSeconds ?? 30)));
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > maximumDuration + 0.25) {
        return NextResponse.json({ error: `Video must be ${maximumDuration} seconds or shorter` }, { status: 400 });
      }
    }
    if (!bucket || !publicBaseUrl) {
      return NextResponse.json({ error: "Media storage is not configured" }, { status: 503 });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `shops/${shopId}/${folder}/${crypto.randomUUID()}-${safeFilename}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    return NextResponse.json({ signedUrl, key, publicUrl: `${publicBaseUrl}/${key}` });
  } catch (error: unknown) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json({ error: "Unable to prepare upload" }, { status: 500 });
  }
}
