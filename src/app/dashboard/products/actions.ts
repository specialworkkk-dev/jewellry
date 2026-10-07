"use server";

import connectToDatabase from "@/lib/mongoose";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { isObjectId } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { scheduleShopPushNotification } from "@/lib/push-notifications";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";
import { requireOwnerTenant } from "@/lib/tenant";
import { deleteShopObjects } from "@/lib/r2";

export async function getCategoriesAction() {
  const { shopId } = await requireOwnerTenant();
  await connectToDatabase();
  const categories = await Category.find({
    $or: [{ isSystemDefault: true }, { shopId }],
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
  const tenant = await requireOwnerTenant();
  return tenant.shopId;
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
  invalidatePublicStoreCache({ shopId });
  scheduleShopEvent(shopId, "product.updated", "both", productId);
  if (isPublished) {
    await scheduleShopPushNotification(shopId, "product.published", {
      entityId: productId,
      productName: product.name,
    });
  }
}

export async function deleteProductAction(productId: string) {
  const shopId = await ownerShopId();
  if (!isObjectId(productId)) throw new Error("Invalid product");
  await connectToDatabase();
  const existing = await Product.findOne({ _id: productId, shopId }).select("images videos").lean();
  const deleted = await Product.deleteOne({ _id: productId, shopId });
  if (deleted.deletedCount === 0) throw new Error("Product not found");
  if (existing) await deleteShopObjects(shopId, [...(existing.images ?? []), ...(existing.videos ?? [])]);
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard", "page");
  revalidatePath("/shop/[slug]", "page");
  invalidatePublicStoreCache({ shopId });
  scheduleShopEvent(shopId, "product.deleted", "both", productId);
}
