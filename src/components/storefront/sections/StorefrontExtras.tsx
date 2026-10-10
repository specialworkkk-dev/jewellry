import Link from "next/link";
import { StoreImage } from "@/components/public/StoreImage";
import type { PublicAd, PublicPost, PublicStory } from "@/lib/public-store";
import type { StorefrontTemplateId } from "@/lib/storefront-template";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";
import { StoriesRow } from "./StoriesRow";

interface ExtrasShop {
  _id: { toString(): string };
  name: string;
  slug: string;
  logoUrl?: string;
}

const glass = "rounded-2xl border border-black/10 bg-white/75 shadow-sm backdrop-blur-md";

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function AdLink({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return isExternal(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>;
}

/**
 * Owner-published content (promotions, stories, posts) that renders the same way
 * on every template. `placement="top"` = promotions + stories, `"bottom"` = posts.
 * Renders nothing when there is nothing to show. Pass stories/ads through
 * selectLiveContent() first (cached data can outlive a story or ad).
 */
export function StorefrontExtras({
  placement,
  template,
  shop,
  stories,
  posts,
  ads,
}: {
  placement: "top" | "bottom";
  template: StorefrontTemplateId;
  shop: ExtrasShop;
  stories: PublicStory[];
  posts: PublicPost[];
  ads: PublicAd[];
}) {
  const theme = STOREFRONT_THEMES[template];
  // `stories` and `ads` must already be filtered with selectLiveContent().
  const liveStories = stories;
  const liveAds = ads;
  const goldRate = liveAds.find((ad) => ad.type === "GOLD_RATE");
  const promos = liveAds.filter((ad) => ad.type !== "GOLD_RATE").slice(0, 3);
  const shopId = shop._id.toString();

  if (placement === "top") {
    if (!goldRate && promos.length === 0 && liveStories.length === 0) return null;
    return (
      <section aria-label="Offers and stories" className={`${theme.pageBg} px-4 pt-4`}>
        <div className="mx-auto max-w-6xl space-y-3">
          {goldRate && (
            <div className={`${glass} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5`}>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${theme.detail.subtle}`}>{goldRate.title}</span>
              <span className={`min-w-0 [overflow-wrap:anywhere] text-sm font-semibold ${theme.detail.heading}`}>{goldRate.message}</span>
            </div>
          )}
          {promos.map((ad) => (
            <AdLink key={ad._id} href={ad.linkUrl} className={`${glass} flex overflow-hidden ${ad.linkUrl ? "transition hover:shadow-md" : ""}`}>
              {ad.imageUrl && (
                <div className={`relative shrink-0 ${ad.type === "HERO_BANNER" ? "w-2/5 min-h-32" : "w-20"}`}>
                  <StoreImage src={ad.imageUrl} alt={ad.title} sizes="(min-width: 768px) 30vw, 40vw" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1 px-4 py-3">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${theme.detail.subtle}`}>Offer</p>
                <h3 className={`mt-0.5 [overflow-wrap:anywhere] text-lg font-semibold leading-snug ${theme.detail.heading}`} style={{ fontFamily: theme.display }}>{ad.title}</h3>
                <p className={`mt-1 [overflow-wrap:anywhere] text-sm ${theme.detail.subtle}`}>{ad.message}</p>
              </div>
            </AdLink>
          ))}
          {liveStories.length > 0 && (
            <div className={`${glass} px-4 py-3`}>
              <StoriesRow
                stories={liveStories}
                shopId={shopId}
                shopName={shop.name}
                shopLogo={shop.logoUrl || ""}
                ringClass="border-amber-500"
                labelClass={theme.detail.subtle}
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;
  return (
    <section aria-label="Latest posts" className={`${theme.pageBg} px-4 py-10`}>
      <div className="mx-auto max-w-6xl">
        <h2 className={`mb-5 [overflow-wrap:anywhere] text-xl sm:text-2xl ${theme.detail.heading}`} style={{ fontFamily: theme.display }}>Latest from {shop.name}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const first = post.mediaUrls[0];
            const isVideo = post.mediaType === "VIDEO";
            return (
              <article key={post._id} className={`${glass} overflow-hidden`}>
                <div className="relative aspect-square bg-black/5">
                  {isVideo ? (
                    <video src={first} controls playsInline preload="none" className="h-full w-full object-cover" />
                  ) : (
                    <StoreImage src={first} alt={post.caption.slice(0, 80) || `Post by ${shop.name}`} thumb sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-full w-full object-cover" />
                  )}
                  {post.mediaType === "CAROUSEL" && (
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">+{post.mediaUrls.length - 1}</span>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  {post.caption && <p className={`line-clamp-4 whitespace-pre-line [overflow-wrap:anywhere] text-sm ${theme.detail.heading}`}>{post.caption}</p>}
                  {post.tags.length > 0 && (
                    <p className={`[overflow-wrap:anywhere] text-xs ${theme.detail.subtle}`}>{post.tags.slice(0, 5).map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <time dateTime={post.createdAt} className={`text-xs ${theme.detail.subtle}`}>
                      {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                    {post.linkedProductId && (
                      <Link href={`/shop/${shop.slug}/product/${post.linkedProductId}`} className={`text-xs font-semibold underline-offset-4 hover:underline ${theme.detail.accent}`}>
                        View product
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
