import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { deleteR2Keys, r2Client } from "@/lib/r2";
import { fullSizeBaseName, isThumbEligible } from "@/lib/media-url";
import { putThumbnailFromBytes } from "@/lib/image-variants";
import { errorMessage } from "@/lib/validation";
import { getVerifiedOwnerTenant } from "@/lib/tenant";
import { withRetry } from "@/lib/retry";
import { getUploadPlanBlock } from "@/lib/plan";
import { createReservation, dailyLimit, dailyLimitMessage, releaseDailyUpload, reserveDailyUpload } from "@/lib/media-quota";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { declaredMatchesSniffed, sniffMedia } from "@/lib/media-sniff";

const ALLOWED_FOLDERS = new Set(["products", "logos", "covers", "posts", "stories"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { shopId, shop } = tenant;

    const rate = await checkRateLimit(`upload-file:${shopId}:${requestClientId(req)}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many uploads. Please wait a moment." }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "");
    if (!bucket || !publicBaseUrl) {
      return NextResponse.json({ error: "Media storage is not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const requestedFolder = formData.get("folder");
    const durationSeconds = Number(formData.get("durationSeconds"));
    const folder = typeof requestedFolder === "string" && ALLOWED_FOLDERS.has(requestedFolder)
      ? requestedFolder
      : "products";

    // Expired shops may still upload branding (logo/cover); all other content stays blocked.
    const planBlock = getUploadPlanBlock(shop, folder);
    if (planBlock) {
      return NextResponse.json({ error: planBlock.error }, { status: planBlock.status });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please choose a file" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, AVIF, MP4, WebM, and MOV files are allowed" }, { status: 415 });
    }
    if (isVideo && (folder === "logos" || folder === "covers")) {
      return NextResponse.json({ error: "Videos are not allowed in this section" }, { status: 400 });
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

    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / 1024 / 1024);
      return NextResponse.json({ error: `File must be smaller than ${maxMb} MB` }, { status: 413 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMedia(fileBuffer.subarray(0, 512));
    if (!declaredMatchesSniffed(file.type, sniffed)) {
      return NextResponse.json({ error: "File content does not match its type" }, { status: 415 });
    }

    const extension = EXTENSION_BY_TYPE[file.type] ?? (isImage ? "jpg" : "mp4");
    const withThumbnail = isThumbEligible(folder, file.type);
    const key = `shops/${shopId}/${folder}/${withThumbnail ? fullSizeBaseName(crypto.randomUUID()) : crypto.randomUUID()}.${extension}`;

    const kind = isVideo ? "videos" : "photos";
    const limit = dailyLimit(kind, shop);
    const day = await reserveDailyUpload(shopId, kind, limit);
    if (!day) {
      return NextResponse.json({ error: dailyLimitMessage(kind, limit) }, { status: 429 });
    }

    try {
    await withRetry(() => r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentLength: file.size,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })), {
        attempts: 3,
        baseDelayMs: 150,
        maxDelayMs: 1_000,
      });
      // Server-verified bytes: record as confirmed so the key can be attached to content.
      await createReservation({ shopId, key, kind, day, contentType: file.type, contentLength: file.size, state: "confirmed" });
    } catch (uploadError) {
      await releaseDailyUpload(shopId, kind, day);
      await deleteR2Keys([key]);
      throw uploadError;
    }

    if (withThumbnail) await putThumbnailFromBytes(key, fileBuffer);

    return NextResponse.json({ publicUrl: `${publicBaseUrl}/${key}`, key });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: errorMessage(error, "Upload failed") }, { status: 500 });
  }
}
