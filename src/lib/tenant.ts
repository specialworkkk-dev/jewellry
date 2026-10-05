import { Types } from 'mongoose';

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
