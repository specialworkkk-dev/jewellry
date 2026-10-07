import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2Client } from "@/lib/r2";
import { errorMessage } from "@/lib/validation";
import { getVerifiedOwnerTenant } from "@/lib/tenant";
import { withRetry } from "@/lib/retry";
import { getPlanBlock } from "@/lib/plan";
import { dailyLimit, dailyLimitMessage, releaseDailyUpload, reserveDailyUpload } from "@/lib/media-quota";

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

    const planBlock = getPlanBlock(shop);
    if (planBlock) {
      return NextResponse.json({ error: planBlock.error }, { status: planBlock.status });
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

    const extension = EXTENSION_BY_TYPE[file.type] ?? (isImage ? "jpg" : "mp4");
    const key = `shops/${shopId}/${folder}/${crypto.randomUUID()}.${extension}`;

    const kind = isVideo ? "videos" : "photos";
    const limit = dailyLimit(kind, shop);
    if (!(await reserveDailyUpload(shopId, kind, limit))) {
      return NextResponse.json({ error: dailyLimitMessage(kind, limit) }, { status: 429 });
    }

    try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
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
    } catch (uploadError) {
      await releaseDailyUpload(shopId, kind);
      throw uploadError;
    }

    return NextResponse.json({ publicUrl: `${publicBaseUrl}/${key}`, key });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: errorMessage(error, "Upload failed") }, { status: 500 });
  }
}
