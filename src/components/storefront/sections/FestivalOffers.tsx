import type { PublicAd } from "@/lib/public-store";
import type { StorefrontTemplateId } from "@/lib/storefront-template";

/**
 * Festival offers with a live countdown (FESTIVAL_OFFER ads). Rendered above the template by StorefrontExtras.
 * `ads` is already filtered to live ads (selectLiveContent) and contains only FESTIVAL_OFFER entries.
 * PLACEHOLDER: replaced by the festival-offers build.
 */
export function FestivalOffers(_props: { ads: PublicAd[]; template: StorefrontTemplateId; shopSlug: string }) {
  return null;
}
