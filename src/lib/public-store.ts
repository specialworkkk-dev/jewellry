import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { Types } from "mongoose";

const PUBLIC_STORE_TAG = "public-store";
// Data Cache files can survive local test/database switches. Namespace entries
// by a one-way database fingerprint so records can never cross environments.
const PUBLIC_STORE_CACHE_NAMESPACE = createHash("sha256")
  .update(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jewellery-saas")
  .digest("hex")
  .slice(0, 12);

export const getPublicShopBySlug = cache(async (slug: string) => unstable_cache(
  async () => {
    await connectToDatabase();
    return Shop.findOne({ slug, isApproved: true })
      .select("name slug logoUrl coverUrl shortDescription address city state pincode whatsappNumber businessPhone instagramUrl facebookUrl websiteUrl goldRate22K goldRate24K maxLinkOpens currentLinkOpens uniqueVisitorTrackingVersion isActive")
      .lean();
  },
  ["public-shop-by-slug", PUBLIC_STORE_CACHE_NAMESPACE, slug],
  // Owner/admin mutations invalidate this tag immediately. The longer fallback
  // TTL keeps ordinary traffic on the fast cache path if no data has changed.
  { revalidate: 3600, tags: [PUBLIC_STORE_TAG] },
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
    ["public-product-by-id", PUBLIC_STORE_CACHE_NAMESPACE, shopId, productId],
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG] },
  )();
});

export const getPublicCatalogue = cache(async (shopId: string, activeCategory?: string) => {
  if (!isObjectId(shopId)) return { categories: [], products: [] };
  const categorySlug = activeCategory && activeCategory !== "all" ? activeCategory : "all";
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const objectShopId = new Types.ObjectId(shopId);
      const categoriesPromise = Category.find({
        $or: [{ shopId: objectShopId }, { isSystemDefault: true }],
      }).select("name slug").lean();

      // The default catalogue is the hot path. It does not depend on the
      // category result, so fetch both collections concurrently.
      const query: { shopId: Types.ObjectId; isPublished: boolean; categoryId?: Types.ObjectId } = {
        shopId: objectShopId,
        isPublished: true,
      };

      const findProducts = () => Product.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .select("name sku images goldPurity priceType price originalPrice discountPercentage discountType discountValue makingCharges makingChargesDiscountType makingChargesDiscountValue isNewArrival isBestseller isBridalCollection")
        .lean();

      if (categorySlug === "all") {
        const [categories, products] = await Promise.all([categoriesPromise, findProducts()]);
        return { categories, products };
      }

      const categories = await categoriesPromise;
      const selectedCategory = categories.find((category) => category.slug === categorySlug)?._id;
      if (selectedCategory) query.categoryId = selectedCategory;
      const products = await findProducts();
      return { categories, products };
    },
    ["public-catalogue", PUBLIC_STORE_CACHE_NAMESPACE, shopId, categorySlug],
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG] },
  )();
});
