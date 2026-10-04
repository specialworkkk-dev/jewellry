"use server";

import connectToDatabase from "@/lib/mongoose";
import Enquiry from "@/models/Enquiry";

export async function submitEnquiry(shopId: string, productId: string, formData: FormData) {
  await connectToDatabase();
  
  const customerName = formData.get("name")?.toString();
  const customerPhone = formData.get("phone")?.toString();
  const message = formData.get("message")?.toString();

  if (!customerName || !customerPhone || !message) {
    return { error: "Please fill in all fields." };
  }

  try {
    await Enquiry.create({
      shopId,
      productId,
      customerName,
      customerPhone,
      message,
      source: "WEBSITE_FORM",
      status: "NEW"
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to submit enquiry." };
  }
}
