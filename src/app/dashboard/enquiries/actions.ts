"use server";

import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongoose";
import { isObjectId } from "@/lib/validation";
import Enquiry from "@/models/Enquiry";
import { requireOwnerTenant } from "@/lib/tenant";

export async function markEnquiryContactedAction(enquiryId: string) {
  const { shopId } = await requireOwnerTenant();
  if (!isObjectId(enquiryId)) throw new Error("Invalid enquiry");

  await connectToDatabase();
  await Enquiry.updateOne(
    { _id: enquiryId, shopId, status: "NEW" },
    { $set: { status: "CONTACTED" } },
  );
  revalidatePath("/dashboard/enquiries");
  revalidatePath("/dashboard");
}
