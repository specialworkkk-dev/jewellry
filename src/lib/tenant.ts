import "server-only";

import { cache } from "react";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongoose";
import { getCurrentSession } from "@/lib/session";
import Shop from "@/models/Shop";

/**
 * Helper to ensure a given query is strictly bound to a tenant (Shop).
 * Prevents accidental data leakage between shops.
 */
export function withTenant(
  shopId: string | Types.ObjectId,
  query: Record<string, unknown> = {},
) {
  return {
    ...query,
    shopId: typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId,
  };
}

/**
 * Resolve the tenant from the signed session and verify the relationship
 * against MongoDB. Route handlers and Server Actions must not trust a shop id
 * supplied by the browser, and a stale seven-day JWT must not retain access if
 * an owner is moved to another shop or the relationship is revoked.
 */
export const getVerifiedOwnerTenant = cache(async () => {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  const sessionShopId = session?.user?.shopId;

  if (session?.user?.role !== "SHOP_OWNER"
    || !userId
    || !sessionShopId
    || !Types.ObjectId.isValid(userId)
    || !Types.ObjectId.isValid(sessionShopId)) {
    return null;
  }

  await connectToDatabase();
  const shop = await Shop.findOne({
    _id: new Types.ObjectId(sessionShopId),
    ownerId: new Types.ObjectId(userId),
  }).lean();

  if (!shop) return null;

  return {
    session,
    shop,
    shopId: shop._id.toString(),
  };
});

export async function requireOwnerTenant() {
  const tenant = await getVerifiedOwnerTenant();
  if (!tenant) throw new Error("Unauthorized");
  return tenant;
}
