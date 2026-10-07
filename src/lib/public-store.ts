import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Post from "@/models/Post";
import Story from "@/models/Story";
import Advertisement from "@/models/Advertisement";
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
      .select("name slug storefrontTemplate logoUrl coverUrl shortDescription address city state pincode whatsappNumber businessPhone instagramUrl facebookUrl websiteUrl goldRate22K goldRate24K maxLinkOpens currentLinkOpens uniqueVisitorTrackingVersion isActive")
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
  // Reject junk slugs before they can mint unbounded Data Cache entries.
  if (categorySlug !== "all" && !/^[a-z0-9][a-z0-9-]{0,79}$/i.test(categorySlug)) {
    return { categories: [], products: [], nextCursor: null };
  }
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
      // An unknown category must show nothing, not silently fall back to every product.
      if (!selectedCategory) return pageResult(categories, []);
      query.categoryId = selectedCategory;
      const products = await findProducts();
      return pageResult(categories, products);
    },
    ["public-catalogue", PUBLIC_STORE_CACHE_NAMESPACE, shopId, categorySlug, safeCursor],
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});

export interface PublicStory {
  _id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  linkUrl?: string;
  expiresAt: string;
}

export interface PublicPost {
  _id: string;
  caption: string;
  mediaUrls: string[];
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL";
  linkedProductId?: string;
  tags: string[];
  createdAt: string;
}

export interface PublicAd {
  _id: string;
  title: string;
  message: string;
  type: "HERO_BANNER" | "PROMO_STRIP" | "GOLD_RATE";
  imageUrl?: string;
  linkUrl?: string;
  validUntil?: string;
}

// Short TTLs: stories/ads expire by clock, not by a mutation that could invalidate
// the tag. Callers must still filter on expiresAt/validUntil at render time.
export const getPublicStories = cache(async (shopId: string): Promise<PublicStory[]> => {
  if (!isObjectId(shopId)) return [];
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const stories = await Story.find({ shopId: new Types.ObjectId(shopId), expiresAt: { $gt: new Date() } })
        .sort({ createdAt: 1 })
        .limit(30)
        .select("mediaUrl mediaType linkUrl expiresAt")
        .lean();
      return stories.map((story) => ({
        _id: story._id.toString(),
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType === "VIDEO" ? "VIDEO" as const : "IMAGE" as const,
        linkUrl: story.linkUrl || undefined,
        expiresAt: new Date(story.expiresAt).toISOString(),
      }));
    },
    ["public-stories", PUBLIC_STORE_CACHE_NAMESPACE, shopId],
    { revalidate: 300, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});

export const getPublicPosts = cache(async (shopId: string): Promise<PublicPost[]> => {
  if (!isObjectId(shopId)) return [];
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const posts = await Post.find({ shopId: new Types.ObjectId(shopId), isPublished: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(12)
        .select("caption mediaUrls mediaType linkedProductId tags createdAt")
        .lean();
      return posts.map((post) => ({
        _id: post._id.toString(),
        caption: post.caption || "",
        mediaUrls: (post.mediaUrls ?? []) as string[],
        mediaType: post.mediaType as PublicPost["mediaType"],
        linkedProductId: post.linkedProductId?.toString(),
        tags: (post.tags ?? []) as string[],
        createdAt: new Date(post.createdAt).toISOString(),
      }));
    },
    ["public-posts", PUBLIC_STORE_CACHE_NAMESPACE, shopId],
    { revalidate: 3600, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});

export const getPublicAds = cache(async (shopId: string): Promise<PublicAd[]> => {
  if (!isObjectId(shopId)) return [];
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const now = new Date();
      const ads = await Advertisement.find({
        shopId: new Types.ObjectId(shopId),
        isActive: true,
        $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gt: now } }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title message type imageUrl linkUrl validUntil")
        .lean();
      return ads.map((ad) => ({
        _id: ad._id.toString(),
        title: ad.title,
        message: ad.message,
        type: ad.type as PublicAd["type"],
        imageUrl: ad.imageUrl || undefined,
        linkUrl: ad.linkUrl || undefined,
        validUntil: ad.validUntil ? new Date(ad.validUntil).toISOString() : undefined,
      }));
    },
    ["public-ads", PUBLIC_STORE_CACHE_NAMESPACE, shopId],
    { revalidate: 300, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId)] },
  )();
});

/** Drops stories/ads that expired after the cached read was taken. */
export function selectLiveContent(stories: PublicStory[], ads: PublicAd[], now: number = Date.now()) {
  return {
    stories: stories.filter((story) => new Date(story.expiresAt).getTime() > now),
    ads: ads.filter((ad) => !ad.validUntil || new Date(ad.validUntil).getTime() > now),
  };
}
