import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { cleanString, isDuplicateKeyError, isObjectId, isRecord } from "@/lib/validation";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Story from "@/models/Story";
import { viewDedupeKey } from "@/lib/engagement-dedupe";

const EVENT_TYPES = new Set(["SHOP_VIEW", "PRODUCT_VIEW", "STORY_VIEW", "WHATSAPP_CLICK"]);

export async function POST(req: Request) {
  try {
    const clientId = requestClientId(req);
    const rate = await checkRateLimit(`analytics:${clientId}`, 120, 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ success: false }, { status: 202 });

    const body: unknown = await req.json();
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
    } else if (body.eventType === "STORY_VIEW" && targetId) {
      const exists = await Story.exists({ _id: targetId, shopId: body.shopId });
      if (!exists) return NextResponse.json({ success: false }, { status: 404 });
    }

    const userAgent = cleanString(req.headers.get("user-agent"), 500);
    const dedupeKey = body.eventType === "PRODUCT_VIEW" || body.eventType === "SHOP_VIEW"
      ? viewDedupeKey(body.eventType, body.shopId, targetId, clientId, userAgent)
      : undefined;

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
