import { notFound } from "next/navigation";
import { CinematicHero } from "@/components/public/CinematicHero";
import { StoreImage } from "@/components/public/StoreImage";

// Optional: Optimize Next.js dynamic rendering
// export const revalidate = 60; // revalidate every 60 seconds

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Gem, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { StorefrontAnalytics } from "@/components/public/StorefrontAnalytics";
import { getPublicCatalogue, getPublicShopBySlug } from "@/lib/public-store";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import Interaction from "@/models/Interaction";
import { calculateDiscountedAmount, discountLabel } from "@/lib/product-pricing";
import { getPublicActorId } from "@/lib/public-actor";
import connectToDatabase from "@/lib/mongoose";

const normalizeWhatsAppNumber = (value?: string) => (value || "").replace(/\D/g, "");

export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params;
  const { category: activeCategory } = await searchParams;
  const shop = await getPublicShopBySlug(slug);
  if (!shop || shop.isActive === false) notFound();

  const { categories, products } = await getPublicCatalogue(shop._id.toString(), activeCategory);
  const ownerWhatsApp = normalizeWhatsAppNumber(shop.whatsappNumber);
  const actorId = await getPublicActorId();
  const savedProductIds = new Set<string>();
  if (actorId && products.length > 0) {
    await connectToDatabase();
    const ids = await Interaction.find({
      userId: actorId,
      targetId: { $in: products.map((product) => product._id) },
      interactionType: "LIKE",
    }).distinct("targetId");
    ids.forEach((id) => savedProductIds.add(id.toString()));
  }

  return (
    <div className="bg-[#fbf8f3] text-stone-900">
      <StorefrontAnalytics shopId={shop._id.toString()} eventType="SHOP_VIEW" />
      <CinematicHero 
        coverUrl={shop.coverUrl} 
        shopName={shop.name} 
        shortDescription={shop.shortDescription} 
      />

      <section className="relative z-10 -mt-5 px-4 sm:-mt-8 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-3 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl shadow-stone-900/5">
          <div className="flex flex-col items-center justify-center gap-1 border-r border-amber-100 px-2 py-4 text-center sm:flex-row sm:gap-2 sm:py-5">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            <span className="text-[11px] font-semibold sm:text-sm">Trusted quality</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 border-r border-amber-100 px-2 py-4 text-center sm:flex-row sm:gap-2 sm:py-5">
            <Gem className="h-5 w-5 text-amber-600" />
            <span className="text-[11px] font-semibold sm:text-sm">Fine craftsmanship</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 text-center sm:flex-row sm:gap-2 sm:py-5">
            <MessageCircle className="h-5 w-5 text-amber-600" />
            <span className="text-[11px] font-semibold sm:text-sm">Direct assistance</span>
          </div>
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" /> Handpicked for you
            </p>
            <h2 className="mt-2 text-3xl font-serif font-semibold tracking-tight text-stone-900 sm:text-4xl">Latest collection</h2>
            <p className="mt-2 text-sm text-stone-500">Explore {products.length} design{products.length === 1 ? "" : "s"} from our showroom.</p>
          </div>
          
          <div className="flex w-full gap-2 overflow-x-auto pb-2 sm:w-auto sm:pb-0 scrollbar-hide">
            <Link 
              href={`/shop/${shop.slug}#collection`}
              className={`min-h-10 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${!activeCategory || activeCategory === "all" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"}`}
            >
              All Items
            </Link>
            {categories.map(cat => (
              <Link 
                key={cat._id.toString()}
                href={`/shop/${shop.slug}?category=${cat.slug}#collection`}
                className={`min-h-10 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${activeCategory === cat.slug ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-200 bg-white py-20 text-center text-stone-500">
            <Gem className="mx-auto mb-4 h-10 w-10 text-amber-400" />
            New designs are being prepared. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const message = encodeURIComponent(`Hi! I'm interested in ${product.name}. Please share more details.`);
              const enquiryUrl = ownerWhatsApp ? `https://wa.me/${ownerWhatsApp}?text=${message}` : "#";
              const makingChargeAfterDiscount = calculateDiscountedAmount(
                product.makingCharges || 0,
                product.makingChargesDiscountType,
                product.makingChargesDiscountValue,
              );

              return (
                <article key={product._id.toString()} className="group relative min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-900/10">
                  <ProductCardFavorite productId={product._id.toString()} shopId={shop._id.toString()} initialSaved={savedProductIds.has(product._id.toString())} />
                  <Link href={`/shop/${shop.slug}/product/${product._id}`} className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  <div className="aspect-[4/5] w-full overflow-hidden bg-stone-100">
                    {product.images?.[0] ? (
                      <StoreImage
                        src={product.images[0]}
                        alt={product.name}
                        sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent opacity-70" />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
                    {product.isNewArrival && <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-800 backdrop-blur-sm">New</span>}
                    {product.isBestseller && <span className="rounded-full bg-amber-400/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-900">Bestseller</span>}
                    {product.isBridalCollection && <span className="rounded-full bg-rose-100/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800">Bridal</span>}
                  </div>
                  <span className="absolute bottom-3 right-3 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-stone-900 shadow-md transition sm:group-hover:flex">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                  </Link>
                  <div className="flex flex-col p-3 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 sm:text-xs">{product.goldPurity ? `${product.goldPurity} gold` : "Fine jewellery"}</p>
                    <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-stone-900 sm:text-base">
                      <Link href={`/shop/${shop.slug}/product/${product._id}`} className="hover:text-amber-700">{product.name}</Link>
                    </h3>
                    <p className="mt-2 text-sm font-bold text-stone-900 sm:text-base">
                      {product.priceType === "FIXED_PRICE" && product.price !== undefined
                        ? `₹${product.price.toLocaleString("en-IN")}`
                        : product.priceType === "STARTING_FROM" && product.price !== undefined
                          ? `From ₹${product.price.toLocaleString("en-IN")}`
                          : "Price on request"}
                    </p>
                    {product.originalPrice !== undefined && product.price !== undefined && product.originalPrice > product.price && (
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-stone-400">
                        <span className="line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                        <span className="font-semibold text-emerald-700">
                          {discountLabel(product.discountType, product.discountValue) || `${product.discountPercentage}% off`}
                        </span>
                      </p>
                    )}
                    {product.makingCharges && product.makingChargesDiscountValue ? (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        Making charges: <span className="text-stone-400 line-through">₹{product.makingCharges.toLocaleString("en-IN")}</span>{" "}
                        ₹{makingChargeAfterDiscount.toLocaleString("en-IN")} · {discountLabel(product.makingChargesDiscountType, product.makingChargesDiscountValue)}
                      </p>
                    ) : null}
                    <div className={`mt-3 grid gap-2 ${ownerWhatsApp ? "grid-cols-[1fr_42px]" : "grid-cols-1"}`}>
                      <Link href={`/shop/${shop.slug}/product/${product._id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800">
                        View design
                      </Link>
                      {ownerWhatsApp && (
                        <a href={enquiryUrl} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#168c48] text-white hover:bg-[#11763c]">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {ownerWhatsApp && (
          <div className="mt-14 overflow-hidden rounded-3xl bg-stone-900 px-5 py-8 text-white shadow-xl sm:px-10 sm:py-10">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300"><BadgeCheck className="h-4 w-4" /> Personal assistance</p>
                <h3 className="mt-2 text-2xl font-serif font-semibold sm:text-3xl">Need help choosing the right piece?</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Speak directly with {shop.name} for price, availability and product details.</p>
              </div>
              <a href={`https://wa.me/${ownerWhatsApp}?text=${encodeURIComponent(`Hi ${shop.name}, I would like help choosing jewellery.`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-300">
                <MessageCircle className="h-4 w-4" /> Chat now
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
