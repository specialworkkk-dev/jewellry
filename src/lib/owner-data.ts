import "server-only";

import { cache } from "react";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import PlatformSettings from "@/models/PlatformSettings";

// Shared by the owner layout and its pages, so one render fetches the shop once.
export const getOwnerShop = cache(async (shopId: string) => {
  await connectToDatabase();
  return Shop.findById(shopId).lean();
});

export const getPlatformSupport = cache(async () => {
  await connectToDatabase();
  return PlatformSettings.findOne({ key: "default" })
    .select("supportPhone supportEmail")
    .lean();
});
