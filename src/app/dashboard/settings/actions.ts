"use server";

import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function updateShopSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await connectToDatabase();
  const shopId = (session.user as any).shopId;
  const shop = await Shop.findById(shopId).lean();

  const updates = {
    shortDescription: formData.get("shortDescription")?.toString() || "",
    whatsappNumber: formData.get("whatsappNumber")?.toString() || "",
    instagramUrl: formData.get("instagramUrl")?.toString() || "",
    facebookUrl: formData.get("facebookUrl")?.toString() || "",
    websiteUrl: formData.get("websiteUrl")?.toString() || "",
    logoUrl: formData.get("logoUrl")?.toString() || "",
    coverUrl: formData.get("coverUrl")?.toString() || "",
    address: formData.get("address")?.toString() || "",
    city: formData.get("city")?.toString() || "",
    state: formData.get("state")?.toString() || "",
    pincode: formData.get("pincode")?.toString() || "",
  };

  await Shop.findByIdAndUpdate(shopId, { $set: updates });

  revalidatePath("/dashboard/settings");
  if (shop?.slug) {
    revalidatePath(`/shop/${shop.slug}`);
  }
  revalidatePath("/shop/[slug]", "page");
}
