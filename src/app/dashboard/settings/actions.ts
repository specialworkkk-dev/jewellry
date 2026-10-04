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
  
  const updates = {
    shortDescription: formData.get("shortDescription")?.toString() || "",
    whatsappNumber: formData.get("whatsappNumber")?.toString() || "",
    instagramUrl: formData.get("instagramUrl")?.toString() || "",
    address: formData.get("address")?.toString() || "",
    city: formData.get("city")?.toString() || "",
    state: formData.get("state")?.toString() || "",
    pincode: formData.get("pincode")?.toString() || "",
  };

  await Shop.findByIdAndUpdate(shopId, { $set: updates });
  
  // Revalidate the dashboard and public shop paths to instantly reflect changes
  revalidatePath("/dashboard/settings");
  revalidatePath("/shop/[slug]", "page");
}
