import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { cleanString, isObjectId, isRecord } from "@/lib/validation";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import Shop from "@/models/Shop";
import Product from "@/models/Product";

const EVENT_TYPES = new Set(["SHOP_VIEW", "PRODUCT_VIEW", "STORY_VIEW", "WHATSAPP_CLICK"]);

export async function POST(req: Request) {
  try {
    const clientId = requestClientId(req);
    const rate = checkRateLimit(`analytics:${clientId}`, 120, 60 * 1000);
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

    if (body.eventType === "PRODUCT_VIEW") {
      if (!body.targetId) return NextResponse.json({ success: false }, { status: 400 });
      const updated = await Product.updateOne(
        { _id: body.targetId, shopId: body.shopId, isPublished: true },
        { $inc: { viewsCount: 1 } },
      );
      if (updated.matchedCount === 0) return NextResponse.json({ success: false }, { status: 404 });
    }

    await AnalyticsEvent.create({
      shopId: body.shopId,
      eventType: body.eventType,
      targetId: body.targetId,
      userAgent: cleanString(req.headers.get("user-agent"), 500),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json({ success: false }, { status: 202 });
  }
}
