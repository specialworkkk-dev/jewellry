"use server";

import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { cleanString, safeExternalUrl } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { scheduleShopPushNotification } from "@/lib/push-notifications";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";
import { requireOwnerTenant } from "@/lib/tenant";

export async function updateShopSettings(formData: FormData) {
  const { shopId, shop } = await requireOwnerTenant();

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
  invalidatePublicStoreCache();
  scheduleShopEvent(shopId, "shop.settings.updated", "both");
  const customerVisibleMediaChanged = shop?.logoUrl !== updates.logoUrl || shop?.coverUrl !== updates.coverUrl;
  if (customerVisibleMediaChanged) {
    scheduleShopPushNotification(shopId, "shop.updated");
  }
}
