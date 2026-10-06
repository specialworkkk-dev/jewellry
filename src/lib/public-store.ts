import { cache } from "react";
import { unstable_cache } from "next/cache";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { Types } from "mongoose";

const PUBLIC_STORE_TAG = "public-store";

export const getPublicShopBySlug = cache(async (slug: string) => unstable_cache(
  async () => {
    await connectToDatabase();
    return Shop.findOne({ slug, isApproved: true })
      .select("name slug logoUrl coverUrl shortDescription address city state pincode whatsappNumber businessPhone instagramUrl facebookUrl websiteUrl goldRate22K goldRate24K maxLinkOpens currentLinkOpens uniqueVisitorTrackingVersion isActive")
      .lean();
  },
  ["public-shop-by-slug", slug],
  { revalidate: 60, tags: [PUBLIC_STORE_TAG] },
)());

export const getPublicProductById = cache(async (shopId: string, productId: string) => {
  if (!isObjectId(shopId) || !isObjectId(productId)) return null;
  return unstable_cache(
    async () => {
      await connectToDatabase();
      return Product.findOne({ _id: productId, shopId, isPublished: true })
        .populate("categoryId")
        .lean();
    },
    ["public-product-by-id", shopId, productId],
    { revalidate: 60, tags: [PUBLIC_STORE_TAG] },
  )();
});

export const getPublicCatalogue = cache(async (shopId: string, activeCategory?: string) => {
  if (!isObjectId(shopId)) return { categories: [], products: [] };
  const categorySlug = activeCategory && activeCategory !== "all" ? activeCategory : "all";
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const objectShopId = new Types.ObjectId(shopId);
      const categories = await Category.find({
        $or: [{ shopId: objectShopId }, { isSystemDefault: true }],
      }).select("name slug").lean();
      const selectedCategory = categorySlug === "all"
        ? undefined
        : categories.find((category) => category.slug === categorySlug)?._id;
      const query: { shopId: Types.ObjectId; isPublished: boolean; categoryId?: Types.ObjectId } = {
        shopId: objectShopId,
        isPublished: true,
      };
      if (selectedCategory) query.categoryId = selectedCategory;
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .select("name sku images goldPurity priceType price originalPrice discountPercentage discountType discountValue makingCharges makingChargesDiscountType makingChargesDiscountValue isNewArrival isBestseller isBridalCollection")
        .lean();
      return { categories, products };
    },
    ["public-catalogue", shopId, categorySlug],
    { revalidate: 60, tags: [PUBLIC_STORE_TAG] },
  )();
});
