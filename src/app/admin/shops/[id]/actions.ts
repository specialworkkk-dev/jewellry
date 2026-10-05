"use server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isObjectId } from "@/lib/validation";

const parsePositiveInt = (value: FormDataEntryValue | null | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};

export async function updateShopLimits(shopId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  const allowedAdminRoles = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);
  const activeRole = session?.user?.role ?? "";
  if (!session || !allowedAdminRoles.has(activeRole)) {
    throw new Error("Unauthorized");
  }
  if (!isObjectId(shopId)) throw new Error("Invalid shop");
  
  await connectToDatabase();
  
  const updates = {
    maxProducts: parsePositiveInt(formData.get("maxProducts"), 50),
    maxPhotosPerDay: parsePositiveInt(formData.get("maxPhotosPerDay"), 30),
    maxVideosPerDay: parsePositiveInt(formData.get("maxVideosPerDay"), 2),
    maxLinkOpens: parsePositiveInt(formData.get("maxLinkOpens"), 500),
    isActive: formData.get("isActive") === "true",
  };

  const result = await Shop.updateOne({ _id: shopId }, { $set: updates });
  if (result.matchedCount === 0) throw new Error("Shop not found");
  revalidatePath("/admin/shops");
  redirect("/admin/shops");
}
