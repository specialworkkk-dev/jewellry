"use server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isObjectId } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";
import { requirePlatformAdmin } from "@/lib/admin-auth";

function parseIntField(formData: FormData, name: string, label: string, min: number, max: number, errors: string[]) {
  const raw = formData.get(name)?.toString().trim() ?? "";
  const parsed = Number(raw);
  if (raw === "" || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push(`${label} must be a whole number between ${min.toLocaleString("en-IN")} and ${max.toLocaleString("en-IN")}.`);
    return min;
  }
  return parsed;
}

function parsePlanPrice(value: FormDataEntryValue | null | undefined, errors: string[]) {
  const raw = value?.toString().trim() ?? "";
  const parsed = Number(raw);
  if (raw === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
    errors.push("Plan price must be between ₹0 and ₹1,00,00,000.");
    return 0;
  }
  return Math.round(parsed * 100) / 100;
}

function parsePlanEndDate(value: FormDataEntryValue | null | undefined, errors: string[]) {
  const dateText = value?.toString().trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    errors.push("Premium plan end date is required.");
    return null;
  }
  const [year, month, day] = dateText.split("-").map(Number);
  // Store the selected date at 11:59:59 PM India time (UTC+05:30).
  const date = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    errors.push("Premium plan end date is invalid.");
    return null;
  }
  if (date.getTime() <= Date.now()) {
    errors.push("Premium plan end date must be in the future.");
    return null;
  }
  return date;
}

export type ShopLimitsFormState = {
  error: string | null;
  // Raw submitted values, echoed back so a failed validation never loses input.
  values: Record<string, string> | null;
  attempt: number;
};

const FORM_FIELDS = [
  "maxProducts", "maxPhotosPerDay", "maxVideosPerDay", "videoUploadsEnabled",
  "maxVideoDurationSeconds", "maxLinkOpens", "isActive", "isApproved", "planPrice", "planEndsAt",
] as const;

export async function updateShopLimits(
  shopId: string,
  previous: ShopLimitsFormState,
  formData: FormData,
): Promise<ShopLimitsFormState> {
  await requirePlatformAdmin();
  if (!isObjectId(shopId)) throw new Error("Invalid shop");

  const errors: string[] = [];
  const planPrice = parsePlanPrice(formData.get("planPrice"), errors);
  const updates = {
    maxProducts: parseIntField(formData, "maxProducts", "Max products", 1, 1_000_000, errors),
    maxPhotosPerDay: parseIntField(formData, "maxPhotosPerDay", "Max photos per day", 1, 100_000, errors),
    maxVideosPerDay: parseIntField(formData, "maxVideosPerDay", "Max videos per day", 1, 20, errors),
    videoUploadsEnabled: formData.get("videoUploadsEnabled") === "true",
    maxVideoDurationSeconds: parseIntField(formData, "maxVideoDurationSeconds", "Video duration", 5, 120, errors),
    maxLinkOpens: parseIntField(formData, "maxLinkOpens", "Maximum unique visitor IPs", 1, 1_000_000_000, errors),
    isActive: formData.get("isActive") === "true",
    isApproved: formData.get("isApproved") === "true",
    planPrice,
  };
  const planEndsAt = planPrice > 0 ? parsePlanEndDate(formData.get("planEndsAt"), errors) : null;
  if (errors.length > 0) {
    return {
      error: errors.join(" "),
      values: Object.fromEntries(FORM_FIELDS.map((name) => [name, formData.get(name)?.toString() ?? ""])),
      attempt: previous.attempt + 1,
    };
  }

  await connectToDatabase();

  const updatedShop = await Shop.findOneAndUpdate(
    { _id: shopId },
    planPrice === 0
      ? { $set: updates, $unset: { planEndsAt: "" } }
      : { $set: { ...updates, planEndsAt } },
    { returnDocument: "after", runValidators: true },
  ).select("slug").lean();
  if (!updatedShop) throw new Error("Shop not found");
  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${shopId}`);
  revalidatePath("/dashboard/products/create");
  revalidatePath("/dashboard", "layout");
  invalidatePublicStoreCache({ shopId, slug: updatedShop.slug });
  scheduleShopEvent(shopId, "shop.status.updated", "both");
  redirect("/admin/shops");
}
