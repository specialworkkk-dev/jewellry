"use server";

import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { cleanString, safeExternalUrl } from "@/lib/validation";

export async function updateShopSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SHOP_OWNER" || !session.user.shopId) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();
  const shopId = session.user.shopId;
  const shop = await Shop.findById(shopId).lean();

  const updates = {
    shortDescription: cleanString(formData.get("shortDescription"), 500),
    whatsappNumber: cleanString(formData.get("whatsappNumber"), 24).replace(/[^\d+]/g, ""),
    instagramUrl: safeExternalUrl(formData.get("instagramUrl")),
    facebookUrl: safeExternalUrl(formData.get("facebookUrl")),
    websiteUrl: safeExternalUrl(formData.get("websiteUrl")),
    logoUrl: safeExternalUrl(formData.get("logoUrl")),
    coverUrl: safeExternalUrl(formData.get("coverUrl")),
    address: cleanString(formData.get("address"), 300),
    city: cleanString(formData.get("city"), 100),
    state: cleanString(formData.get("state"), 100),
    pincode: cleanString(formData.get("pincode"), 20),
  };

  await Shop.findByIdAndUpdate(shopId, { $set: updates });

  revalidatePath("/dashboard/settings");
  if (shop?.slug) {
    revalidatePath(`/shop/${shop.slug}`);
  }
  revalidatePath("/shop/[slug]", "page");
}
