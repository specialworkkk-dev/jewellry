export const STOREFRONT_TEMPLATE_COUNT = 5;

export type StorefrontTemplateId = 1 | 2 | 3 | 4 | 5;

/** Picks one of the five customer storefront templates uniformly at random. */
export function pickRandomStorefrontTemplate(): StorefrontTemplateId {
  // Rejection sampling over a byte avoids modulo bias; Web Crypto works in node, edge and browser.
  const limit = 256 - (256 % STOREFRONT_TEMPLATE_COUNT);
  const buffer = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return ((buffer[0] % STOREFRONT_TEMPLATE_COUNT) + 1) as StorefrontTemplateId;
}

function isTemplateId(value: unknown): value is StorefrontTemplateId {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= STOREFRONT_TEMPLATE_COUNT;
}

/**
 * Shops created before templates existed have no stored value. Derive a stable
 * one from the slug so their storefront never flips between visits.
 */
export function resolveStorefrontTemplate(shop: { slug: string; storefrontTemplate?: number | null }): StorefrontTemplateId {
  if (isTemplateId(shop.storefrontTemplate)) return shop.storefrontTemplate;
  let hash = 0;
  for (let index = 0; index < shop.slug.length; index += 1) {
    hash = (hash * 31 + shop.slug.charCodeAt(index)) >>> 0;
  }
  return ((hash % STOREFRONT_TEMPLATE_COUNT) + 1) as StorefrontTemplateId;
}
