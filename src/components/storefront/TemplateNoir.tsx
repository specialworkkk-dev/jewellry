import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import {
  CataloguePager, CategoryNav, DEFAULT_TAGLINE, EMPTY_COPY, chatHref, enquiryHref, makingChargeText,
  priceText, productHref, productTags, purityText, savingsText, type TemplateProps,
} from "./shared";
import { STOREFRONT_THEMES } from "./themes";

const font = { fontFamily: STOREFRONT_THEMES[2].display };
const MARQUEE = ["Gold", "Diamonds", "Bridal", "Heritage", "Bespoke", "Polki", "Kundan", "Platinum"];

/** Template 2 — black and gold luxury house with a split editorial hero. */
export function TemplateNoir(props: TemplateProps) {
  const { shop, products, savedProductIds, ownerWhatsApp } = props;
  const saved = new Set(savedProductIds);

  return (
    <div className="bg-[#0a0a0a] text-white" style={font}>
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-amber-300/10 blur-[120px]" />
        <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:min-h-[760px] lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:py-20">
          <div>
            <p className="storefront-hero-reveal flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.5em] text-amber-300 [animation-delay:60ms]">
              <span className="h-px w-12 bg-amber-300" /> Maison de joaillerie
            </p>
            <h1 className="[overflow-wrap:anywhere] storefront-hero-reveal mt-7 text-5xl font-normal leading-[0.98] tracking-tight sm:text-7xl xl:text-8xl [animation-delay:200ms]">
              <span className="bg-gradient-to-br from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">{shop.name}</span>
            </h1>
            <p className="storefront-hero-reveal mt-7 max-w-lg text-base leading-8 text-white/60 sm:text-lg [animation-delay:380ms]">
              {shop.shortDescription || DEFAULT_TAGLINE}
            </p>
            <div className="storefront-hero-reveal mt-10 flex flex-wrap items-center gap-4 [animation-delay:540ms]">
              <a href="#collection" className="sf-shimmer inline-flex min-h-13 items-center gap-3 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 px-8 py-4 text-xs font-bold uppercase tracking-[0.28em] text-black shadow-[0_0_50px_-10px_rgba(251,191,36,.6)]">
                View the collection <ArrowUpRight className="h-4 w-4" />
              </a>
              {ownerWhatsApp && (
                <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center gap-2 border border-white/25 px-7 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/85 transition hover:border-amber-300 hover:text-amber-200">
                  <MessageCircle className="h-4 w-4" /> Private chat
                </a>
              )}
            </div>
            <dl className="storefront-hero-reveal mt-14 grid max-w-md grid-cols-3 gap-3 sm:gap-6 border-t border-white/10 pt-8 [animation-delay:700ms]">
              {[["22K·24K", "Hallmarked"], [products.length > 0 ? `${products.length}+` : "New", "New designs"], ["1:1", "Concierge"]].map(([value, label]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-2xl text-amber-200 sm:text-3xl">{value}</dt>
                  <dd className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:tracking-[0.25em]">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -bottom-3 -right-3 h-full w-full border sm:-bottom-5 sm:-right-5 border-amber-300/50" />
            <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-amber-900/40 to-black">
              {shop.coverUrl ? (
                <StoreImage src={shop.coverUrl} alt={shop.name} sizes="(max-width: 1023px) 90vw, 45vw" preload className="storefront-hero-cover h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_60%_30%,#fbbf24_0%,#78350f_38%,#0a0a0a_80%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-200">Signature edit</p>
                <span className="text-xs text-white/60">{shop.city || "Est. fine jewellery"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-y border-amber-300/20 bg-black py-4" aria-hidden="true">
          <div className="sf-marquee flex w-max gap-12 whitespace-nowrap text-sm uppercase tracking-[0.5em] text-amber-200/70">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((word, index) => (
              <span key={index} className="flex items-center gap-12">{word}<span className="text-amber-400">✦</span></span>
            ))}
          </div>
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 pt-20 sm:px-8 sm:pt-28">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-amber-300">Chapter I</p>
            <h2 className="mt-3 text-4xl tracking-tight sm:text-6xl">The Collection</h2>
          </div>
          <CategoryNav
            props={props}
            wrap="flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto"
            item="whitespace-nowrap border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition"
            active="border-amber-300 bg-amber-300 text-black"
            idle="border-white/15 text-white/60 hover:border-amber-300/60 hover:text-amber-200"
          />
        </div>

        {products.length === 0 ? (
          <div className="mt-14 border border-dashed border-amber-300/30 py-24 text-center text-white/50">{EMPTY_COPY}</div>
        ) : (
          <div className="mt-14 grid grid-cols-1 border-b border-r border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => {
              const id = product._id.toString();
              const savings = savingsText(product);
              const making = makingChargeText(product);
              return (
                <article key={id} className="group relative flex min-w-0 flex-col border-l border-t border-white/10 bg-[#0a0a0a] p-4 transition duration-500 hover:bg-[#121008] sm:p-6">
                  <div className="relative">
                    <Link href={productHref(shop, product)} className="relative block aspect-square overflow-hidden bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                      {product.images?.[0] ? (
                        <StoreImage src={product.images[0]} alt={product.name} sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 30vw" className="h-full w-full object-cover transition duration-[900ms] group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/50">No image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                      <span className="absolute left-3 top-3 bg-black/60 px-1.5 py-0.5 text-xs tabular-nums tracking-[0.3em] text-white">{String(index + 1).padStart(2, "0")}</span>
                    </Link>
                    <ProductCardFavorite productId={id} shopId={shop._id.toString()} initialSaved={saved.has(id)} />
                  </div>
                  <div className="mt-6 flex flex-1 flex-col">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.3em]">
                      <span className="text-amber-300">{purityText(product)}</span>
                      <span className="truncate text-white/60">{productTags(product).join(" · ")}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 min-h-[3.4rem] [overflow-wrap:anywhere] text-2xl font-normal leading-[1.15]">
                      <Link href={productHref(shop, product)} className="transition hover:text-amber-200">{product.name}</Link>
                    </h3>
                    <p className="[overflow-wrap:anywhere] mt-3 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-2xl font-semibold text-transparent">{priceText(product)}</p>
                    {savings && <p className="mt-1 text-xs text-white/60"><span className="line-through">{savings.original}</span> <span className="font-semibold text-emerald-400">{savings.label}</span></p>}
                    {making && <p className="mt-1 text-[11px] font-semibold text-emerald-400">Making: <span className="text-white/55 line-through">{making.original}</span> {making.discounted} · {making.label}</p>}
                    <div className="mt-auto flex gap-2 pt-6">
                      <Link href={productHref(shop, product)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-amber-300/60 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-200 transition hover:bg-amber-300 hover:text-black">
                        View piece <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      {ownerWhatsApp && (
                        <a href={enquiryHref(ownerWhatsApp, product)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="inline-flex min-h-12 w-12 items-center justify-center border border-white/20 text-white/70 transition hover:border-emerald-400 hover:text-emerald-400">
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <CataloguePager
          props={props}
          wrap="mt-14 flex flex-wrap items-center justify-center gap-3"
          back="inline-flex min-h-12 items-center border border-white/20 px-7 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 hover:border-amber-300 hover:text-amber-200"
          more="inline-flex min-h-12 items-center bg-amber-300 px-9 text-[11px] font-bold uppercase tracking-[0.24em] text-black hover:bg-amber-200"
        />

        {ownerWhatsApp && (
          <div className="relative mt-24 overflow-hidden border border-amber-300/25 bg-gradient-to-br from-[#17120a] to-black px-6 py-14 sm:px-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-amber-300">By appointment</p>
            <h3 className="[overflow-wrap:anywhere] mt-4 max-w-2xl text-3xl leading-tight sm:text-5xl">Let our jewellers guide you to <em className="text-amber-200">the one.</em></h3>
            <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-amber-300 px-8 text-[11px] font-bold uppercase tracking-[0.26em] text-black hover:bg-amber-200">
              <MessageCircle className="h-4 w-4" /> Begin on WhatsApp
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
