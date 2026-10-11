import type { PublicAd } from "@/lib/public-store";
import type { StorefrontTemplateId } from "@/lib/storefront-template";
import { MAX_ACTIVE_FESTIVAL_OFFERS } from "@/lib/festival";
import { FestivalOfferCard } from "./FestivalOfferCard";

const currentTimeMs = () => Date.now();

/** Only absolute http(s) URLs or site-relative paths may become links. */
function safeLink(href?: string) {
  if (!href) return undefined;
  if (/^https?:\/\//i.test(href)) return href;
  return href.startsWith("/") && !href.startsWith("//") ? href : undefined;
}

/**
 * Festival offers with a live countdown (FESTIVAL_OFFER ads). Rendered above the template by StorefrontExtras.
 * `ads` is already filtered by selectLiveContent; we re-check start/end at render time because
 * the ad list is cached for up to 5 minutes. The server clock is passed down so the countdown
 * is correct even when the visitor's phone clock is wrong.
 */
export function FestivalOffers({ ads, template }: { ads: PublicAd[]; template: StorefrontTemplateId; shopSlug: string }) {
  const nowMs = currentTimeMs();
  const serverNow = new Date(nowMs).toISOString();
  const live = ads
    .filter((ad) => ad.type === "FESTIVAL_OFFER" && ad.validUntil)
    .filter((ad) => {
      const end = Date.parse(ad.validUntil as string);
      const start = ad.startsAt ? Date.parse(ad.startsAt) : NaN;
      return Number.isFinite(end) && end > nowMs && (!Number.isFinite(start) || start <= nowMs);
    })
    .slice(0, MAX_ACTIVE_FESTIVAL_OFFERS);
  if (live.length === 0) return null;

  return (
    <div className="space-y-3">
      {live.map((ad) => (
        <FestivalOfferCard
          key={ad._id}
          template={template}
          offer={{
            id: ad._id,
            festival: ad.festival,
            title: ad.title,
            message: ad.message,
            imageUrl: ad.imageUrl,
            linkUrl: safeLink(ad.linkUrl),
            endsAt: ad.validUntil as string,
            serverNow,
          }}
        />
      ))}
    </div>
  );
}
