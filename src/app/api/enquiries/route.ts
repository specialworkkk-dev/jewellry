import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { cleanString, isObjectId, isRecord } from "@/lib/validation";
import Enquiry from "@/models/Enquiry";
import Product from "@/models/Product";
import Shop from "@/models/Shop";

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(`enquiry:${requestClientId(req)}`, 8, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many enquiries. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const body: unknown = await req.json();
    if (!isRecord(body) || !isObjectId(body.shopId)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const customerName = cleanString(body.customerName, 100);
    const customerPhone = cleanString(body.customerPhone, 24).replace(/[^\d+\-() ]/g, "");
    const message = cleanString(body.message, 2000);
    if (customerName.length < 2 || !/^[+]?\d[\d\-() ]{7,22}$/.test(customerPhone) || message.length < 3) {
      return NextResponse.json({ error: "Please enter a valid name, phone number, and message" }, { status: 400 });
    }

    await connectToDatabase();
    const shop = await Shop.findOne({ _id: body.shopId, isApproved: true, isActive: true }).select("_id");
    if (!shop) {
      return NextResponse.json({ error: "This shop is not accepting enquiries" }, { status: 404 });
    }

    let productId;
    if (body.productId !== undefined) {
      if (!isObjectId(body.productId)) {
        return NextResponse.json({ error: "Invalid product" }, { status: 400 });
      }
      const product = await Product.findOne({
        _id: body.productId,
        shopId: shop._id,
        isPublished: true,
      }).select("_id");
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      productId = product._id;
    }

    await Enquiry.create({
      shopId: shop._id,
      productId,
      customerName,
      customerPhone,
      message,
      source: body.source === "WHATSAPP_CLICK" ? "WHATSAPP_CLICK" : "WEBSITE_FORM",
    });

    return NextResponse.json({ message: "Enquiry submitted successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Submit enquiry error:", error);
    return NextResponse.json({ error: "Unable to submit enquiry" }, { status: 500 });
  }
}
