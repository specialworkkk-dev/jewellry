import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { isDuplicateKeyError, isObjectId, isRecord } from "@/lib/validation";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import Interaction from "@/models/Interaction";
import Post from "@/models/Post";
import Product from "@/models/Product";
import Shop from "@/models/Shop";

const TARGET_TYPES = new Set(["PRODUCT", "POST", "SHOP"]);
const INTERACTION_TYPES = new Set(["LIKE", "FAVORITE", "FOLLOW"]);
const VISITOR_COOKIE = "luxestore_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function anonymousVisitorId(req: NextRequest) {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  return existing && isObjectId(existing) ? existing : new Types.ObjectId().toString();
}

function setVisitorCookie(response: NextResponse, visitorId: string) {
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const targetId = req.nextUrl.searchParams.get("targetId");
    const targetType = req.nextUrl.searchParams.get("targetType");
    const interactionType = req.nextUrl.searchParams.get("interactionType") || "LIKE";
    if (!targetId || !isObjectId(targetId)
      || !targetType || !TARGET_TYPES.has(targetType)
      || !INTERACTION_TYPES.has(interactionType)) {
      return NextResponse.json({ error: "Invalid interaction" }, { status: 400 });
    }

    await connectToDatabase();
    const model = targetType === "PRODUCT" ? Product : targetType === "POST" ? Post : Shop;
    const target = await model.findById(targetId).select(targetType === "SHOP" ? "_id" : "likesCount").lean();
    if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

    const session = await getServerSession(authOptions);
    const cookieVisitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    const actorId = session?.user?.id || (cookieVisitorId && isObjectId(cookieVisitorId) ? cookieVisitorId : undefined);
    const state = actorId
      ? Boolean(await Interaction.exists({ userId: actorId, targetId, interactionType }))
      : false;
    const likesCount = "likesCount" in target ? Number(target.likesCount || 0) : undefined;

    return NextResponse.json({ state, likesCount });
  } catch (error: unknown) {
    console.error("Read interaction error:", error);
    return NextResponse.json({ error: "Unable to read interaction" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(`interaction:${requestClientId(req)}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many interactions. Please try again shortly." }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    const visitorId = session?.user?.id ? undefined : anonymousVisitorId(req);
    const actorId = session?.user?.id || visitorId;

    const body: unknown = await req.json();
    if (!isRecord(body)
      || !isObjectId(body.targetId)
      || !isObjectId(body.shopId)
      || typeof body.targetType !== "string"
      || typeof body.interactionType !== "string"
      || !TARGET_TYPES.has(body.targetType)
      || !INTERACTION_TYPES.has(body.interactionType)) {
      return NextResponse.json({ error: "Invalid interaction" }, { status: 400 });
    }

    if (body.targetType === "SHOP" && body.interactionType !== "FOLLOW") {
      return NextResponse.json({ error: "Invalid shop interaction" }, { status: 400 });
    }
    if (body.targetType !== "SHOP" && body.interactionType === "FOLLOW") {
      return NextResponse.json({ error: "Invalid follow target" }, { status: 400 });
    }

    await connectToDatabase();
    const shop = await Shop.findOne({ _id: body.shopId, isApproved: true, isActive: true }).select("_id");
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let targetModel = null;
    if (body.targetType === "PRODUCT") {
      targetModel = await Product.findOne({ _id: body.targetId, shopId: shop._id, isPublished: true }).select("_id");
    } else if (body.targetType === "POST") {
      targetModel = await Post.findOne({ _id: body.targetId, shopId: shop._id, isPublished: true }).select("_id");
    } else if (body.targetId === body.shopId) {
      targetModel = shop;
    }
    if (!targetModel) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const identity = {
      userId: actorId,
      targetId: body.targetId,
      interactionType: body.interactionType,
    };
    const removed = await Interaction.findOneAndDelete(identity);

    if (removed) {
      let likesCount: number | undefined;
      if (body.interactionType === "LIKE") {
        const model = body.targetType === "PRODUCT" ? Product : Post;
        await model.updateOne({ _id: body.targetId, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } });
        const target = await model.findById(body.targetId).select("likesCount").lean();
        likesCount = target?.likesCount ?? 0;
      }
      const response = NextResponse.json({ message: "Interaction removed", state: false, likesCount });
      return visitorId ? setVisitorCookie(response, visitorId) : response;
    }

    try {
      await Interaction.create({ ...identity, shopId: shop._id, targetType: body.targetType });
    } catch (error: unknown) {
      if (!isDuplicateKeyError(error)) throw error;
      const response = NextResponse.json({ message: "Interaction already exists", state: true });
      return visitorId ? setVisitorCookie(response, visitorId) : response;
    }

    let likesCount: number | undefined;
    if (body.interactionType === "LIKE") {
      const model = body.targetType === "PRODUCT" ? Product : Post;
      await model.updateOne({ _id: body.targetId }, { $inc: { likesCount: 1 } });
      const target = await model.findById(body.targetId).select("likesCount").lean();
      likesCount = target?.likesCount ?? 0;
    }
    const response = NextResponse.json({ message: "Interaction added", state: true, likesCount });
    return visitorId ? setVisitorCookie(response, visitorId) : response;
  } catch (error: unknown) {
    console.error("Interaction error:", error);
    return NextResponse.json({ error: "Unable to update interaction" }, { status: 500 });
  }
}
