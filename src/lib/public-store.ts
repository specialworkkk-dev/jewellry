import { cache } from "react";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import "@/models/Category";

export const getPublicShopBySlug = cache(async (slug: string) => {
  await connectToDatabase();
  return Shop.findOne({ slug, isApproved: true })
    .select("name slug logoUrl coverUrl shortDescription address city state pincode whatsappNumber businessPhone instagramUrl facebookUrl websiteUrl goldRate22K goldRate24K maxLinkOpens currentLinkOpens isActive")
    .lean();
});

export const getPublicProductById = cache(async (shopId: string, productId: string) => {
  if (!isObjectId(shopId) || !isObjectId(productId)) return null;
  await connectToDatabase();
  return Product.findOne({ _id: productId, shopId, isPublished: true })
    .populate("categoryId")
    .lean();
});
