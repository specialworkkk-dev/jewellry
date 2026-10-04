"use server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateShopLimits(shopId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  
  await connectToDatabase();
  
  const updates = {
    maxProducts: parseInt(formData.get("maxProducts")?.toString() || "0"),
    maxPhotosPerDay: parseInt(formData.get("maxPhotosPerDay")?.toString() || "0"),
    maxVideosPerDay: parseInt(formData.get("maxVideosPerDay")?.toString() || "0"),
    maxLinkOpens: parseInt(formData.get("maxLinkOpens")?.toString() || "500"),
    isActive: formData.get("isActive") === "true",
  };

  await Shop.findByIdAndUpdate(shopId, { $set: updates });
  revalidatePath("/admin/shops");
  redirect("/admin/shops");
}
