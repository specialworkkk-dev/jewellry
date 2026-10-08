import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import {
  CataloguePager, CategoryNav, DEFAULT_TAGLINE, EMPTY_COPY, chatHref, enquiryHref, makingChargeText,
  priceText, productHref, productTags, purityText, savingsText, type TemplateProps,
} from "./shared";
import { STOREFRONT_THEMES } from "./themes";

const font = { fontFamily: STOREFRONT_THEMES[3].display };

/** Template 3 — blush and rose-gold editorial with an arched hero and staggered cards. */
export function TemplateRose(props: TemplateProps) {
  const { shop, products, savedProductIds, ownerWhatsApp } = props;
  const saved = new Set(savedProductIds);

  return (
    <div className="bg-[#fff6f3] text-[#5a2433]" style={font}>
      <section className="relative isolate overflow-hidden">
        <div className="sf-float pointer-events-none absolute -left-24 top-10 -z-10 h-80 w-80 rounded-full bg-rose-200/60 blur-3xl" />
        <div className="sf-float pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl [animation-delay:-4s]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-14 sm:px-8 lg:min-h-[740px] lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="storefront-hero-reveal inline-flex items-center gap-2 rounded-full border border-rose-300/60 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-700 backdrop-blur [animation-delay:60ms]">
              <Sparkles className="h-3.5 w-3.5" /> Fine jewellery atelier
            </p>
            <h1 className="storefront-hero-reveal mt-6 [overflow-wrap:anywhere] text-5xl font-medium italic leading-[1.02] tracking-tight sm:text-7xl [animation-delay:200ms]">
              {shop.name}
            </h1>
            <p className="storefront-hero-reveal mt-6 max-w-md text-lg leading-8 text-[#8a5461] [animation-delay:360ms]">
              {shop.shortDescription || DEFAULT_TAGLINE}
            </p>
            <div className="storefront-hero-reveal mt-9 flex flex-wrap gap-3 [animation-delay:520ms]">
              <a href="#collection" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-gradient-to-r from-[#b4536a] to-[#d08397] px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-rose-400/40 transition hover:-translate-y-0.5">
                Discover pieces <ArrowUpRight className="h-4 w-4" />
              </a>
              {ownerWhatsApp && (
                <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center gap-2 rounded-full border border-rose-300 bg-white/70 px-7 py-3.5 text-sm font-semibold text-rose-800 backdrop-blur transition hover:bg-white">
                  <MessageCircle className="h-4 w-4" /> Talk to us
                </a>
              )}
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-md">
            <div className="relative">
              <div className="absolute -inset-3 rounded-t-[999px] rounded-b-[3rem] border border-rose-300/60" />
              <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] bg-gradient-to-b from-rose-200 to-rose-300 shadow-2xl shadow-rose-900/25">
                {shop.coverUrl ? (
                  <StoreImage src={shop.coverUrl} alt={shop.name} sizes="(max-width: 1023px) 80vw, 40vw" preload className="storefront-hero-cover h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,#fde2e4_0%,#d08397_60%,#8c3a52_100%)]" />
                )}
              </div>
              <div className="absolute left-2 bottom-12 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-xl backdrop-blur-md sm:-left-10">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Heart className="h-5 w-5 fill-current" /></span>
                <span className="text-sm font-semibold leading-tight">Loved by<br /><span className="text-rose-600">our families</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-6xl scroll-mt-24 px-5 pb-28 pt-12 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-500">Curated for you</p>
          <h2 className="mt-3 text-4xl font-medium italic sm:text-6xl">New in the atelier</h2>
        </div>
        <CategoryNav
          props={props}
          wrap="mt-9 flex flex-wrap justify-center gap-2.5"
          item="rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          active="border-transparent bg-gradient-to-r from-[#b4536a] to-[#d08397] text-white shadow-lg shadow-rose-300/60"
          idle="border-rose-200 bg-white/70 text-[#8a5461] hover:border-rose-400"
        />

        {products.length === 0 ? (
          <div className="mt-14 rounded-[2.5rem] border border-dashed border-rose-300 bg-white/70 py-24 text-center text-[#8a5461]">{EMPTY_COPY}</div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2">
            {products.map((product, index) => {
              const id = product._id.toString();
              const savings = savingsText(product);
              const making = makingChargeText(product);
              return (
                <article key={id} className={`group relative min-w-0 ${index % 2 === 1 ? "sm:mt-16" : ""}`}>
                  <div className="relative">
                    <Link href={productHref(shop, product)} className="relative block aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-rose-100 shadow-[0_25px_60px_-25px_rgba(140,58,82,.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                      {product.images?.[0] ? (
                        <StoreImage src={product.images[0]} alt={product.name} sizes="(max-width: 639px) 92vw, 45vw" className="h-full w-full object-cover transition duration-[900ms] group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-rose-500">No image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#4a1b29]/55 via-transparent to-transparent" />
                      <div className="absolute left-5 top-5 flex flex-wrap gap-1.5">
                        {productTags(product).map((tag) => (
                          <span key={tag} className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 backdrop-blur">{tag}</span>
                        ))}
                      </div>
                      <div className="absolute inset-x-5 bottom-10 text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-100/90">{purityText(product)}</p>
                        <h3 className="[overflow-wrap:anywhere] mt-1 line-clamp-2 text-2xl font-medium italic leading-tight drop-shadow">{product.name}</h3>
                      </div>
                    </Link>
                    <ProductCardFavorite productId={id} shopId={shop._id.toString()} initialSaved={saved.has(id)} />
                  </div>
                  <div className="mx-3 -mt-6 rounded-3xl border border-white bg-white/90 p-4 shadow-xl shadow-rose-900/10 backdrop-blur sm:mx-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-[11rem] flex-1">
                        <p className="[overflow-wrap:anywhere] text-xl font-semibold text-[#b4536a]">{priceText(product)}</p>
                        {savings && <p className="text-xs text-[#a1707c]"><span className="line-through">{savings.original}</span> <span className="font-semibold text-emerald-700">{savings.label}</span></p>}
                        {making && <p className="text-[11px] font-semibold text-emerald-700">Making: <span className="text-[#a1707c] line-through">{making.original}</span> {making.discounted}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {ownerWhatsApp && (
                          <a href={enquiryHref(ownerWhatsApp, product)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#168c48] text-white shadow-md transition hover:scale-105">
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}
                        <Link href={productHref(shop, product)} aria-label={`View ${product.name}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5a2433] text-white shadow-md transition hover:scale-105">
                          <ArrowUpRight className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <CataloguePager
          props={props}
          wrap="mt-16 flex flex-wrap items-center justify-center gap-3"
          back="inline-flex min-h-12 items-center rounded-full border border-rose-300 bg-white px-6 text-sm font-semibold text-rose-800 hover:bg-rose-50"
          more="inline-flex min-h-12 items-center rounded-full bg-[#5a2433] px-8 text-sm font-semibold text-white shadow-lg hover:bg-[#7a3347]"
        />

        {ownerWhatsApp && (
          <div className="relative mt-24 overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#b4536a] via-[#c96b7f] to-[#e3a1ad] px-7 py-14 text-center text-white shadow-2xl shadow-rose-500/30 sm:px-16">
            <div className="sf-float absolute -left-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <Heart className="mx-auto h-8 w-8 fill-white/90" />
            <h3 className="[overflow-wrap:anywhere] mt-4 text-3xl font-medium italic sm:text-5xl">Find something made for you</h3>
            <p className="mx-auto mt-3 max-w-md text-white/85">Share the occasion — we’ll curate designs, prices and availability on WhatsApp.</p>
            <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#b4536a] shadow-xl transition hover:scale-105">
              <MessageCircle className="h-4 w-4" /> Chat with us
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
