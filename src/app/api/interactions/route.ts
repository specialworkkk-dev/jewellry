import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { isDuplicateKeyError, isObjectId, isRecord } from "@/lib/validation";
import Interaction from "@/models/Interaction";
import Post from "@/models/Post";
import Product from "@/models/Product";
import Shop from "@/models/Shop";

const TARGET_TYPES = new Set(["PRODUCT", "POST", "SHOP"]);
const INTERACTION_TYPES = new Set(["LIKE", "FAVORITE", "FOLLOW"]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to interact" }, { status: 401 });
    }

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
      userId: session.user.id,
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
      return NextResponse.json({ message: "Interaction removed", state: false, likesCount });
    }

    try {
      await Interaction.create({ ...identity, shopId: shop._id, targetType: body.targetType });
    } catch (error: unknown) {
      if (!isDuplicateKeyError(error)) throw error;
      return NextResponse.json({ message: "Interaction already exists", state: true });
    }

    let likesCount: number | undefined;
    if (body.interactionType === "LIKE") {
      const model = body.targetType === "PRODUCT" ? Product : Post;
      await model.updateOne({ _id: body.targetId }, { $inc: { likesCount: 1 } });
      const target = await model.findById(body.targetId).select("likesCount").lean();
      likesCount = target?.likesCount ?? 0;
    }
    return NextResponse.json({ message: "Interaction added", state: true, likesCount });
  } catch (error: unknown) {
    console.error("Interaction error:", error);
    return NextResponse.json({ error: "Unable to update interaction" }, { status: 500 });
  }
}
