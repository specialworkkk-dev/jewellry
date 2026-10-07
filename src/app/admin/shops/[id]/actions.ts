"use server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isObjectId } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";
import { requirePlatformAdmin } from "@/lib/admin-auth";

const parsePositiveInt = (value: FormDataEntryValue | null | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};

const parseBoundedInt = (value: FormDataEntryValue | null | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const parsePlanPrice = (value: FormDataEntryValue | null | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
    throw new Error("Plan price must be between ₹0 and ₹1,00,00,000");
  }
  return Math.round(parsed * 100) / 100;
};

const parsePlanEndDate = (value: FormDataEntryValue | null | undefined) => {
  const dateText = value?.toString().trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error("Premium plan end date is required");

  const [year, month, day] = dateText.split("-").map(Number);
  // Store the selected date at 11:59:59 PM India time (UTC+05:30).
  const date = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Premium plan end date is invalid");
  }
  return date;
};

export async function updateShopLimits(shopId: string, formData: FormData) {
  await requirePlatformAdmin();
  if (!isObjectId(shopId)) throw new Error("Invalid shop");
  
  await connectToDatabase();
  
  const planPrice = parsePlanPrice(formData.get("planPrice"));
  const updates = {
    maxProducts: parsePositiveInt(formData.get("maxProducts"), 50),
    maxPhotosPerDay: parsePositiveInt(formData.get("maxPhotosPerDay"), 30),
    maxVideosPerDay: parseBoundedInt(formData.get("maxVideosPerDay"), 2, 1, 20),
    videoUploadsEnabled: formData.get("videoUploadsEnabled") === "true",
    maxVideoDurationSeconds: parseBoundedInt(formData.get("maxVideoDurationSeconds"), 30, 5, 120),
    maxLinkOpens: parsePositiveInt(formData.get("maxLinkOpens"), 500),
    isActive: formData.get("isActive") === "true",
    planPrice,
  };

  const result = await Shop.updateOne(
    { _id: shopId },
    planPrice === 0
      ? { $set: updates, $unset: { planEndsAt: "" } }
      : { $set: { ...updates, planEndsAt: parsePlanEndDate(formData.get("planEndsAt")) } },
  );
  if (result.matchedCount === 0) throw new Error("Shop not found");
  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${shopId}`);
  revalidatePath("/dashboard/products/create");
  revalidatePath("/dashboard", "layout");
  invalidatePublicStoreCache();
  scheduleShopEvent(shopId, "shop.status.updated", "both");
  redirect("/admin/shops");
}
