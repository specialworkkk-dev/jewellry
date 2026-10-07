import "server-only";

import { revalidateTag } from "next/cache";

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
