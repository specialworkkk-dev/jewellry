import "server-only";

import { cache } from "react";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";

// Shared by the owner layout and its pages, so one render fetches the shop once.
export const getOwnerShop = cache(async (shopId: string) => {
  await connectToDatabase();
  return Shop.findById(shopId).lean();
});
