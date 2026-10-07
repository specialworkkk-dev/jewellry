import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { Types, type QueryFilter } from "mongoose";
import type { IProduct } from "@/models/Product";
import {
  PUBLIC_STORE_TAG,
  publicStoreShopTag,
  publicStoreSlugTag,
} from "@/lib/public-store-cache";

// Data Cache files can survive local test/database switches. Namespace entries
// by a one-way database fingerprint so records can never cross environments.
const PUBLIC_STORE_CACHE_NAMESPACE = createHash("sha256")
  .update(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jewellery-saas")
  .digest("hex")
  .slice(0, 12);
const PUBLIC_CATALOGUE_PAGE_SIZE = 18;

function decodeCatalogueCursor(value?: string) {
  if (!value || value.length > 200) return null;
  try {
    const [dateText, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
    const createdAt = new Date(dateText);
    if (!Number.isFinite(createdAt.getTime()) || !isObjectId(id)) return null;
    return { createdAt, id: new Types.ObjectId(id) };
  } catch {
    return null;
  }
}

function encodeCatalogueCursor(product: { createdAt: Date; _id: Types.ObjectId }) {
  return Buffer.from(`${new Date(product.createdAt).toISOString()}|${product._id.toString()}`).toString("base64url");
}

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
  { revalidate: 3600, tags: [PUBLIC_STORE_TAG, publicStoreSlugTag(slug)] },
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
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});

export const getPublicCatalogue = cache(async (shopId: string, activeCategory?: string, after?: string) => {
  if (!isObjectId(shopId)) return { categories: [], products: [], nextCursor: null };
  const categorySlug = activeCategory && activeCategory !== "all" ? activeCategory : "all";
  const decodedCursor = decodeCatalogueCursor(after);
  const safeCursor = decodedCursor
    ? Buffer.from(`${decodedCursor.createdAt.toISOString()}|${decodedCursor.id.toString()}`).toString("base64url")
    : "first";
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const objectShopId = new Types.ObjectId(shopId);
      const categoriesPromise = Category.find({
        $or: [{ shopId: objectShopId }, { isSystemDefault: true }],
      }).select("name slug").lean();

      // The default catalogue is the hot path. It does not depend on the
      // category result, so fetch both collections concurrently.
      const query: QueryFilter<IProduct> = {
        shopId: objectShopId,
        isPublished: true,
      };
      if (decodedCursor) {
        query.$or = [
          { createdAt: { $lt: decodedCursor.createdAt } },
          { createdAt: decodedCursor.createdAt, _id: { $lt: decodedCursor.id } },
        ];
      }

      const findProducts = () => Product.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(PUBLIC_CATALOGUE_PAGE_SIZE + 1)
        .select("name sku images goldPurity priceType price originalPrice discountPercentage discountType discountValue makingCharges makingChargesDiscountType makingChargesDiscountValue isNewArrival isBestseller isBridalCollection createdAt")
        .lean();

      const pageResult = (categories: Awaited<typeof categoriesPromise>, foundProducts: Awaited<ReturnType<typeof findProducts>>) => {
        const hasMore = foundProducts.length > PUBLIC_CATALOGUE_PAGE_SIZE;
        const products = hasMore ? foundProducts.slice(0, PUBLIC_CATALOGUE_PAGE_SIZE) : foundProducts;
        const lastProduct = products.at(-1);
        return {
          categories,
          products,
          nextCursor: hasMore && lastProduct
            ? encodeCatalogueCursor(lastProduct as { createdAt: Date; _id: Types.ObjectId })
            : null,
        };
      };

      if (categorySlug === "all") {
        const [categories, products] = await Promise.all([categoriesPromise, findProducts()]);
        return pageResult(categories, products);
      }

      const categories = await categoriesPromise;
      const selectedCategory = categories.find((category) => category.slug === categorySlug)?._id;
      if (selectedCategory) query.categoryId = selectedCategory;
      const products = await findProducts();
      return pageResult(categories, products);
    },
    ["public-catalogue", PUBLIC_STORE_CACHE_NAMESPACE, shopId, categorySlug, safeCursor],
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});
