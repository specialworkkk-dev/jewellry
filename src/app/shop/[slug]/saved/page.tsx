import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gem, Heart } from "lucide-react";
import connectToDatabase from "@/lib/mongoose";
import { getPublicShopBySlug } from "@/lib/public-store";
import { getPublicActorId } from "@/lib/public-actor";
import { resolveStorefrontTemplate } from "@/lib/storefront-template";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";
import { isSoldOut, priceText, savingsText, soldOutImageClass } from "@/components/storefront/shared";
import { StoreImage } from "@/components/public/StoreImage";
import { SavedItem } from "@/components/public/SavedItem";
import { SavedAlertsPrompt } from "@/components/public/SavedAlertsPrompt";
import { isPriceLowerThanSaved, formatInr } from "@/lib/wishlist-alerts";
import Interaction from "@/models/Interaction";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

const MAX_SAVED = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getPublicShopBySlug(slug);
  return {
    title: shop ? `Saved designs | ${shop.name}` : "Saved designs",
    // Personal to one visitor: never indexed or followed.
    robots: { index: false, follow: false },
  };
}

type SavedRow = { targetId: { toString(): string }; priceAtSave?: number | null };

export default async function SavedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getPublicShopBySlug(slug);
  if (!shop || shop.isActive === false) notFound();

  const theme = STOREFRONT_THEMES[resolveStorefrontTemplate(shop)];
  const d = theme.detail;
  const shopId = shop._id.toString();

  let items: {
    id: string;
    name: string;
    image?: string;
    priceLabel: string;
    savings: ReturnType<typeof savingsText>;
    dropped: boolean;
    was: string;
    soldOut: boolean;
    imageClass: string;
  }[] = [];
  let hitCap = false;

  const actorId = await getPublicActorId();
  if (actorId) {
    await connectToDatabase();
    // Newest saves first. One extra row tells us whether more than the cap exist.
    const saved = await Interaction.find({
      userId: actorId,
      shopId: shop._id,
      targetType: "PRODUCT",
      interactionType: "LIKE",
    })
      .sort({ createdAt: -1 })
      .limit(MAX_SAVED + 1)
      .select("targetId priceAtSave")
      .lean<SavedRow[]>();
    hitCap = saved.length > MAX_SAVED;
    const rows = saved.slice(0, MAX_SAVED);
    const products = rows.length === 0 ? [] : await Product.find({
      _id: { $in: rows.map((row) => row.targetId) },
      shopId: shop._id,
      isPublished: true,
    })
      .select("name images priceType price originalPrice discountType discountValue discountPercentage stockStatus")
      .lean();
    const byId = new Map(products.map((product) => [product._id.toString(), product]));
    items = rows.flatMap((row) => {
      const product = byId.get(row.targetId.toString());
      if (!product) return []; // unpublished or deleted: not shown
      const dropped = isPriceLowerThanSaved(product, row.priceAtSave);
      return [{
        id: product._id.toString(),
        name: String(product.name || "Jewellery design"),
        image: product.images?.[0],
        priceLabel: priceText(product),
        savings: savingsText(product),
        dropped,
        was: dropped ? formatInr(row.priceAtSave) : "",
        soldOut: isSoldOut(product),
        imageClass: soldOutImageClass(product),
      }];
    });
  }

  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <h1 style={{ fontFamily: theme.display }} className={`flex items-center gap-2 text-2xl sm:text-4xl ${d.heading}`}>
        <Heart className={`h-6 w-6 shrink-0 ${d.accent}`} /> Saved designs
      </h1>
      <p className={`mb-6 mt-2 text-sm ${d.subtle}`}>Designs you have hearted at {shop.name}. They stay on this device.</p>

      {items.length > 0 && (
        <SavedAlertsPrompt
          shopId={shopId}
          shopName={shop.name}
          publicVapidKey={publicVapidKey}
          panelClass={d.panel}
          headingClass={d.heading}
          subtleClass={d.subtle}
          buttonClass={d.primaryButton}
        />
      )}

      {items.length === 0 ? (
        <div className={`flex flex-col items-center rounded-lg px-6 py-14 text-center ${d.panel}`}>
          <Heart className={`mb-4 h-10 w-10 ${d.accent}`} />
          <h2 style={{ fontFamily: theme.display }} className={`text-xl ${d.heading}`}>No saved designs yet</h2>
          <p className={`mt-2 max-w-sm text-sm ${d.subtle}`}>Tap the heart on any design to keep it here. We can alert you when its price drops.</p>
          <Link href={`/shop/${shop.slug}#collection`} className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold ${d.primaryButton}`}>
            Browse the collection
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <SavedItem productId={item.id} shopId={shopId} productName={item.name} className={`overflow-hidden rounded-lg ${d.panel}`}>
                <Link href={`/shop/${shop.slug}/product/${item.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-current">
                  <div className="relative aspect-square overflow-hidden bg-black/5">
                    {item.image ? (
                      <StoreImage src={item.image} alt={item.name} thumb sizes="(max-width: 1023px) 48vw, 24vw" className={`h-full w-full object-cover ${item.imageClass}`} />
                    ) : (
                      <div className={`flex h-full items-center justify-center ${d.subtle}`}><Gem className="h-8 w-8" /></div>
                    )}
                    <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                      {item.dropped && <span className="rounded-full bg-green-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">Price dropped</span>}
                      {item.soldOut && <span className="rounded-full bg-stone-900/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">Sold out</span>}
                    </div>
                  </div>
                  <div className="p-3">
                    <h2 className={`line-clamp-2 min-h-10 text-sm font-medium leading-5 [overflow-wrap:anywhere] ${d.heading}`}>{item.name}</h2>
                    <p className={`mt-1 text-base font-semibold [overflow-wrap:anywhere] ${d.heading}`}>{item.priceLabel}</p>
                    {item.dropped && item.was && (
                      <p className={`text-xs ${d.subtle}`}>Was <span className="line-through">{item.was}</span> when you saved it</p>
                    )}
                    {!item.dropped && item.savings && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                        <span className={`line-through opacity-70 ${d.subtle}`}>{item.savings.original}</span>
                        <span className={`rounded-full px-1.5 py-0.5 font-semibold ${d.badge}`}>{item.savings.label}</span>
                      </p>
                    )}
                  </div>
                </Link>
              </SavedItem>
            </li>
          ))}
        </ul>
      )}
      {hitCap && <p className={`mt-6 text-center text-xs ${d.subtle}`}>Showing your {MAX_SAVED} most recent saves.</p>}
    </div>
  );
}
