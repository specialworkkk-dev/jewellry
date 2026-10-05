"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Enquiry from "@/models/Enquiry";

export async function markEnquiryContactedAction(enquiryId: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SHOP_OWNER" || !session.user.shopId) throw new Error("Unauthorized");
  if (!isObjectId(enquiryId)) throw new Error("Invalid enquiry");

  await connectToDatabase();
  await Enquiry.updateOne(
    { _id: enquiryId, shopId: session.user.shopId, status: "NEW" },
    { $set: { status: "CONTACTED" } },
  );
  revalidatePath("/dashboard/enquiries");
  revalidatePath("/dashboard");
}
