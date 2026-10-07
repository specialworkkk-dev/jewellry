import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { cleanString, isDuplicateKeyError, isObjectId, isRecord } from "@/lib/validation";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Story from "@/models/Story";
import { EVENT_DEDUPE_WINDOWS_MS, isNonHumanRequest, viewDedupeKey } from "@/lib/engagement-dedupe";

const EVENT_TYPES = new Set(["SHOP_VIEW", "PRODUCT_VIEW", "STORY_VIEW", "WHATSAPP_CLICK"]);

export async function POST(req: Request) {
  try {
    // Crawlers and link-preview fetchers must not inflate engagement numbers.
    if (isNonHumanRequest(req.headers)) return NextResponse.json({ success: true, ignored: true }, { status: 202 });
    const clientId = requestClientId(req);
    const rate = await checkRateLimit(`analytics:${clientId}`, 120, 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ success: false }, { status: 202 });

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)
      || !isObjectId(body.shopId)
      || typeof body.eventType !== "string"
      || !EVENT_TYPES.has(body.eventType)
      || (body.targetId !== undefined && !isObjectId(body.targetId))) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await connectToDatabase();
    const shop = await Shop.findOne({ _id: body.shopId, isApproved: true, isActive: true })
      .select("_id")
      .lean();
    if (!shop) return NextResponse.json({ success: false }, { status: 404 });

    const targetId = typeof body.targetId === "string" ? body.targetId : undefined;
    if (body.eventType === "PRODUCT_VIEW") {
      if (!targetId) return NextResponse.json({ success: false }, { status: 400 });
      const exists = await Product.exists({ _id: targetId, shopId: body.shopId, isPublished: true });
      if (!exists) return NextResponse.json({ success: false }, { status: 404 });
    } else if (body.eventType === "SHOP_VIEW" && targetId && targetId !== body.shopId) {
      return NextResponse.json({ success: false }, { status: 400 });
    } else if (body.eventType === "STORY_VIEW") {
      if (!targetId) return NextResponse.json({ success: false }, { status: 400 });
      const exists = await Story.exists({ _id: targetId, shopId: body.shopId });
      if (!exists) return NextResponse.json({ success: false }, { status: 404 });
    } else if (body.eventType === "WHATSAPP_CLICK" && targetId) {
      // A WhatsApp tap may carry the product that was being viewed.
      const exists = await Product.exists({ _id: targetId, shopId: body.shopId, isPublished: true });
      if (!exists) return NextResponse.json({ success: false }, { status: 404 });
    }

    const userAgent = cleanString(req.headers.get("user-agent"), 500);
    const dedupeKey = viewDedupeKey(
      body.eventType,
      body.shopId,
      targetId,
      clientId,
      userAgent,
      Date.now(),
      EVENT_DEDUPE_WINDOWS_MS[body.eventType],
    );

    // The unique dedupeKey makes "first view in this window" an atomic insert.
    try {
      await AnalyticsEvent.create({
        shopId: body.shopId,
        eventType: body.eventType,
        targetId,
        userAgent,
        dedupeKey,
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) return NextResponse.json({ success: true, deduped: true }, { status: 202 });
      throw error;
    }

    if (body.eventType === "PRODUCT_VIEW") {
      await Product.updateOne({ _id: targetId, shopId: body.shopId }, { $inc: { viewsCount: 1 } });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json({ success: false }, { status: 202 });
  }
}
