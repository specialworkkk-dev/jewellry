import { Types } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper to ensure a given query is strictly bound to a tenant (Shop).
 * Prevents accidental data leakage between shops.
 */
export function withTenant(shopId: string | Types.ObjectId, query: any = {}) {
  return {
    ...query,
    shopId: typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId,
  };
}

/**
 * Example utility to verify tenant access in API routes.
 * (Will be integrated with actual Authentication in Part 3)
 */
export function verifyTenantAccess(req: NextRequest, targetShopId: string) {
  // Extract user session/token from request
  // (Placeholder for Part 3)
  const userShopId = req.headers.get('x-shop-id'); 
  
  if (!userShopId || userShopId !== targetShopId) {
    return false;
  }
  
  return true;
}
