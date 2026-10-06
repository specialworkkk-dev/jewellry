"use server";

import connectToDatabase from "@/lib/mongoose";
import Category from "@/models/Category";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Product from "@/models/Product";
import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { isObjectId } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { scheduleShopPushNotification } from "@/lib/push-notifications";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";

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

export async function setProductPublishedAction(productId: string, isPublished: boolean) {
  const shopId = await ownerShopId();
  if (!isObjectId(productId)) throw new Error("Invalid product");
  await connectToDatabase();
  const [product, shop] = await Promise.all([
    Product.findOneAndUpdate(
      { _id: productId, shopId },
      { $set: { isPublished } },
      { returnDocument: "after", runValidators: true },
    ).select("isPublished name"),
    Shop.findById(shopId).select("slug").lean(),
  ]);
  if (!product) throw new Error("Product not found");
  revalidatePath("/dashboard/products", "page");
  revalidatePath("/dashboard", "page");
  if (shop?.slug) revalidatePath(`/shop/${shop.slug}`, "layout");
  invalidatePublicStoreCache();
  scheduleShopEvent(shopId, "product.updated", "both", productId);
  if (isPublished) {
    scheduleShopPushNotification(shopId, "product.published", {
      entityId: productId,
      productName: product.name,
    });
  }
}

export async function deleteProductAction(productId: string) {
  const shopId = await ownerShopId();
  if (!isObjectId(productId)) throw new Error("Invalid product");
  await connectToDatabase();
  const deleted = await Product.deleteOne({ _id: productId, shopId });
  if (deleted.deletedCount === 0) throw new Error("Product not found");
  revalidatePath("/dashboard/products");
  revalidatePath("/shop/[slug]", "page");
  invalidatePublicStoreCache();
  scheduleShopEvent(shopId, "product.deleted", "both", productId);
}
