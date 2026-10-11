import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { readObjectBytes, shopOwnedR2Keys } from "@/lib/r2";
import { createWatermarkedJpeg, prepareLogoPng } from "@/lib/watermark";
import { photoFilename } from "@/lib/watermark-text";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENT = 2;
const MAX_WAITING = 6;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/i;

// Same body for every "cannot serve this" case so the route cannot be used to probe shops/products.
const notFound = () => NextResponse.json({ error: "Photo not available" }, { status: 404, headers: { "Cache-Control": "no-store" } });

// Small per-instance limiter: sharp + satori are CPU/memory heavy and serverless memory is limited.
let running = 0;
const waiting: Array<() => void> = [];
async function acquire(): Promise<boolean> {
  if (running < MAX_CONCURRENT) { running += 1; return true; }
  if (waiting.length >= MAX_WAITING) return false;
  await new Promise<void>((resolve) => waiting.push(resolve));
  return true; // the slot is handed over by release()
}
function release() {
  const next = waiting.shift();
  if (next) next(); else running -= 1;
}

// Decoded logos by URL (tiny): saves one R2 read + decode per photo.
const logoCache = new Map<string, Buffer | null>();

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const productId = url.searchParams.get("product") ?? "";
    const indexParam = url.searchParams.get("i") ?? "";
    if (!SLUG.test(slug) || !/^[a-f0-9]{24}$/i.test(productId) || !/^\d{1,3}$/.test(indexParam)) return notFound();
    const index = Number(indexParam);

    const rate = await checkRateLimit(`photo:${requestClientId(request)}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many photo saves. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    await connectToDatabase();
    const shop = await Shop.findOne({ slug, isApproved: true, isActive: true, allowPhotoDownload: true })
      .select("_id name slug logoUrl")
      .lean();
    if (!shop) return notFound();
    const shopId = String(shop._id);

    const product = await Product.findOne({ _id: productId, shopId: shop._id, isPublished: true })
      .select("name images")
      .lean();
    const images: unknown[] = Array.isArray(product?.images) ? product.images : [];
    if (!product || index >= images.length) return notFound();

    // The only thing ever read is an object under THIS shop's own R2 prefix.
    const [sourceKey] = shopOwnedR2Keys(shopId, [images[index]]);
    if (!sourceKey) return notFound();

    if (!(await acquire())) {
      return NextResponse.json(
        { error: "Busy, please try again in a moment." },
        { status: 429, headers: { "Retry-After": "5", "Cache-Control": "no-store" } },
      );
    }
    try {
      const source = await readObjectBytes(sourceKey, MAX_SOURCE_BYTES);
      if (!source || source.length === 0) return notFound();

      let logoPng: Buffer | null = null;
      const logoUrl = typeof shop.logoUrl === "string" ? shop.logoUrl : "";
      if (logoUrl) {
        if (logoCache.has(logoUrl)) {
          logoPng = logoCache.get(logoUrl) ?? null;
        } else {
          const [logoKey] = shopOwnedR2Keys(shopId, [logoUrl]);
          const bytes = logoKey ? await readObjectBytes(logoKey, MAX_LOGO_BYTES).catch(() => null) : null;
          logoPng = await prepareLogoPng(bytes, 256);
          if (logoCache.size >= 32) logoCache.delete(logoCache.keys().next().value as string);
          logoCache.set(logoUrl, logoPng);
        }
      }

      let jpeg: Buffer;
      try {
        jpeg = await createWatermarkedJpeg({ image: source, shopName: String(shop.name ?? ""), shopSlug: shop.slug, logoPng });
      } catch (error) {
        console.error("Photo watermark failed:", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "Could not prepare this photo" }, { status: 500, headers: { "Cache-Control": "no-store" } });
      }

      const filename = photoFilename(shop.slug, product.name, index + 1);
      return new Response(new Uint8Array(jpeg), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpeg.length),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } finally {
      release();
    }
  } catch (error) {
    console.error("Photo route failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not prepare this photo" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
