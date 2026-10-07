import "server-only";

import { revalidateTag } from "next/cache";
import { scheduleShopEvent } from "@/lib/realtime";

export const PUBLIC_STORE_TAG = "public-store";

export function publicStoreShopTag(shopId: string) {
  return `public-store:shop:${shopId}`;
}

export function publicStoreSlugTag(slug: string) {
  return `public-store:slug:${slug.toLowerCase()}`;
}

export function invalidatePublicStoreCache(scope?: { shopId?: string; slug?: string }) {
  if (scope?.shopId) revalidateTag(publicStoreShopTag(scope.shopId), { expire: 0 });
  if (scope?.slug) revalidateTag(publicStoreSlugTag(scope.slug), { expire: 0 });
  if (!scope?.shopId && !scope?.slug) revalidateTag(PUBLIC_STORE_TAG, { expire: 0 });
}

/**
 * Called after an owner creates/changes/deletes a post, story or ad. Expires the
 * shop's public cache and nudges open storefronts (realtime) to refresh.
 * `shop.settings.updated` is the existing public "refresh now" event; the client
 * refreshes on any shop-update message regardless of type.
 */
export function publishShopContentChange(shop: { shopId: string; slug?: string }, entityId?: string) {
  invalidatePublicStoreCache({ shopId: shop.shopId, slug: shop.slug });
  scheduleShopEvent(shop.shopId, "shop.settings.updated", "both", entityId);
}
