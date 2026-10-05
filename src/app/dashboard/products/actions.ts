"use server";

import connectToDatabase from "@/lib/mongoose";
import Category from "@/models/Category";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Product from "@/models/Product";
import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { isObjectId } from "@/lib/validation";

export async function getCategoriesAction() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SHOP_OWNER" || !session.user.shopId) {
    throw new Error("Unauthorized");
  }
  await connectToDatabase();
  const categories = await Category.find({
    $or: [{ isSystemDefault: true }, { shopId: session.user.shopId }],
  }).sort({ name: 1 }).lean();
  return JSON.parse(JSON.stringify(categories));
}

export async function getProductMediaPolicyAction() {
  const shopId = await ownerShopId();
  await connectToDatabase();
  const shop = await Shop.findById(shopId)
    .select("videoUploadsEnabled maxVideoDurationSeconds maxVideosPerDay")
    .lean();
  if (!shop) throw new Error("Shop not found");
  return {
    videoUploadsEnabled: shop.videoUploadsEnabled === true,
    maxVideoDurationSeconds: Math.min(120, Math.max(5, Number(shop.maxVideoDurationSeconds ?? 30))),
    maxVideosPerDay: Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2))),
  };
}

async function ownerShopId() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SHOP_OWNER" || !session.user.shopId) throw new Error("Unauthorized");
  return session.user.shopId;
}

export async function toggleProductPublishedAction(productId: string) {
  const shopId = await ownerShopId();
  if (!isObjectId(productId)) throw new Error("Invalid product");
  await connectToDatabase();
  const product = await Product.findOne({ _id: productId, shopId }).select("isPublished");
  if (!product) throw new Error("Product not found");
  product.isPublished = !product.isPublished;
  await product.save();
  revalidatePath("/dashboard/products");
  revalidatePath("/shop/[slug]", "page");
}

export async function deleteProductAction(productId: string) {
  const shopId = await ownerShopId();
  if (!isObjectId(productId)) throw new Error("Invalid product");
  await connectToDatabase();
  await Product.deleteOne({ _id: productId, shopId });
  revalidatePath("/dashboard/products");
  revalidatePath("/shop/[slug]", "page");
}
