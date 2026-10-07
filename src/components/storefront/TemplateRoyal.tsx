import Link from "next/link";
import { ArrowUpRight, Crown, Gem, MessageCircle, ShieldCheck } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import {
  CataloguePager, CategoryNav, DEFAULT_TAGLINE, EMPTY_COPY, chatHref, enquiryHref, makingChargeText,
  priceText, productHref, productTags, purityText, savingsText, type TemplateProps,
} from "./shared";
import { STOREFRONT_THEMES } from "./themes";

const font = { fontFamily: STOREFRONT_THEMES[1].display };

function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-[#c9a24b] ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a24b] sm:w-28" />
      <Gem className="h-4 w-4" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a24b] sm:w-28" />
    </div>
  );
}

/** Template 1 — ivory, burgundy and antique gold with arched portraits. */
export function TemplateRoyal(props: TemplateProps) {
  const { shop, products, savedProductIds, ownerWhatsApp } = props;
  const saved = new Set(savedProductIds);

  return (
    <div className="bg-[#fbf6ec] text-[#3a0f16]" style={font}>
      <section className="relative isolate flex min-h-[600px] items-center justify-center overflow-hidden bg-[#2a0a10] sm:min-h-[720px]">
        {shop.coverUrl ? (
          <StoreImage src={shop.coverUrl} alt={shop.name} sizes="100vw" preload className="storefront-hero-cover absolute inset-0 -z-10 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,#8a2a3a_0%,#3a0f16_55%,#1c0509_100%)]" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#2a0a10]/70 via-[#2a0a10]/45 to-[#2a0a10]/90" />
        <div className="pointer-events-none absolute inset-4 border border-[#c9a24b]/60 sm:inset-8" />
        <div className="pointer-events-none absolute inset-6 border border-[#c9a24b]/25 sm:inset-11" />

        <div className="mx-auto max-w-3xl px-8 py-24 text-center">
          <p className="storefront-hero-reveal inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.42em] text-[#e9cf88] [animation-delay:80ms]">
            <Crown className="h-4 w-4" /> Since generations
          </p>
          <h1 className="storefront-hero-reveal mt-6 text-5xl font-medium leading-[1.02] tracking-[0.04em] text-[#fff4d9] drop-shadow-[0_4px_24px_rgba(0,0,0,.5)] [animation-delay:220ms] sm:text-7xl lg:text-8xl">
            {shop.name}
          </h1>
          <Ornament className="storefront-hero-reveal mt-7 [animation-delay:380ms]" />
          <p className="storefront-hero-reveal mx-auto mt-7 max-w-xl text-lg italic leading-8 text-[#f6e7c1]/90 [animation-delay:520ms] sm:text-2xl sm:leading-10">
            {shop.shortDescription || DEFAULT_TAGLINE}
          </p>
          <a href="#collection" className="storefront-hero-reveal mt-10 inline-flex min-h-12 items-center gap-3 border border-[#e9cf88] bg-[#e9cf88]/10 px-9 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#fff4d9] backdrop-blur-sm transition hover:bg-[#e9cf88] hover:text-[#3a0f16] [animation-delay:680ms]">
            Enter the collection
          </a>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-px max-w-5xl px-4">
        <div className="grid grid-cols-3 divide-x divide-[#c9a24b]/40 border-x border-b border-[#c9a24b]/40 bg-[#fffaf0] text-center shadow-xl shadow-[#3a0f16]/10">
          {[[ShieldCheck, "Hallmarked purity"], [Gem, "Master craftsmanship"], [MessageCircle, "Personal concierge"]].map(([Icon, label], index) => {
            const I = Icon as typeof Gem;
            return (
              <div key={index} className="flex flex-col items-center gap-2 px-2 py-5 sm:flex-row sm:justify-center sm:gap-3">
                <I className="h-5 w-5 text-[#9a7420]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs">{label as string}</span>
              </div>
            );
          })}
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <div className="text-center">
          <Ornament />
          <h2 className="mt-5 text-4xl font-medium tracking-[0.08em] sm:text-6xl">The Collection</h2>
          <p className="mt-3 text-sm italic text-[#7a5b4a] sm:text-base">{products.length} heirloom design{products.length === 1 ? "" : "s"}, curated by {shop.name}</p>
        </div>

        <CategoryNav
          props={props}
          wrap="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          item="border-b-2 pb-1 text-xs font-semibold uppercase tracking-[0.25em] transition"
          active="border-[#9a7420] text-[#7b1e2b]"
          idle="border-transparent text-[#7a5b4a] hover:text-[#7b1e2b]"
        />

        {products.length === 0 ? (
          <div className="mt-16 border border-dashed border-[#c9a24b]/60 bg-[#fffaf0] py-24 text-center italic text-[#7a5b4a]">
            <Gem className="mx-auto mb-4 h-9 w-9 text-[#c9a24b]" />{EMPTY_COPY}
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const id = product._id.toString();
              const savings = savingsText(product);
              const making = makingChargeText(product);
              return (
                <article key={id} className="group relative flex min-w-0 flex-col text-center">
                  <div className="relative mx-auto w-full max-w-[22rem]">
                    <div className="rounded-t-[999px] border border-[#c9a24b]/70 p-2 transition duration-500 group-hover:border-[#9a7420] group-hover:shadow-[0_24px_60px_-20px_rgba(122,30,43,.45)]">
                      <Link href={productHref(shop, product)} className="relative block aspect-[4/5] overflow-hidden rounded-t-[999px] bg-[#f0e4c8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7420]">
                        {product.images?.[0] ? (
                          <StoreImage src={product.images[0]} alt={product.name} sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 30vw" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#c9a24b]"><Gem className="h-10 w-10" /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2a0a10]/55 to-transparent" />
                      </Link>
                    </div>
                    <div className="absolute right-4 top-[28%] h-10 w-10">
                      <ProductCardFavorite productId={id} shopId={shop._id.toString()} initialSaved={saved.has(id)} />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col items-center px-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a7420]">{purityText(product)}</p>
                    <h3 className="mt-2 line-clamp-2 min-h-[3.25rem] break-words text-2xl font-medium leading-[1.2]">
                      <Link href={productHref(shop, product)} className="hover:text-[#7b1e2b]">{product.name}</Link>
                    </h3>
                    {productTags(product).length > 0 && (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b1e2b]">{productTags(product).join(" · ")}</p>
                    )}
                    <p className="mt-3 text-2xl font-semibold text-[#7b1e2b]">{priceText(product)}</p>
                    {savings && <p className="mt-1 text-xs text-[#7a5b4a]"><span className="line-through">{savings.original}</span> <span className="font-semibold text-emerald-800">{savings.label}</span></p>}
                    {making && <p className="mt-1 text-[11px] font-semibold text-emerald-800">Making: <span className="text-[#7a5b4a] line-through">{making.original}</span> {making.discounted} · {making.label}</p>}
                    <div className="mt-5 flex w-full max-w-[22rem] gap-2">
                      <Link href={productHref(shop, product)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-[#3a0f16] bg-[#3a0f16] px-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f6e7c1] transition hover:bg-[#7b1e2b]">
                        Discover <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      {ownerWhatsApp && (
                        <a href={enquiryHref(ownerWhatsApp, product)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="inline-flex min-h-12 w-12 items-center justify-center border border-[#c9a24b] text-[#9a7420] transition hover:bg-[#c9a24b] hover:text-white">
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
          wrap="mt-16 flex flex-wrap items-center justify-center gap-3"
          back="inline-flex min-h-11 items-center border border-[#c9a24b] px-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#7b1e2b] hover:bg-[#fff4d9]"
          more="inline-flex min-h-11 items-center bg-[#3a0f16] px-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#f6e7c1] hover:bg-[#7b1e2b]"
        />

        {ownerWhatsApp && (
          <div className="relative mt-24 overflow-hidden bg-[#3a0f16] px-6 py-14 text-center text-[#f6e7c1] sm:px-16">
            <div className="pointer-events-none absolute inset-3 border border-[#c9a24b]/50" />
            <Crown className="mx-auto h-7 w-7 text-[#e9cf88]" />
            <h3 className="mt-4 text-3xl font-medium tracking-[0.06em] sm:text-5xl">An audience with {shop.name}</h3>
            <p className="mx-auto mt-4 max-w-lg text-base italic leading-7 text-[#f6e7c1]/75">Private consultations for bridal sets, heirlooms and bespoke commissions — a message away.</p>
            <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-[#e9cf88] px-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#3a0f16] transition hover:bg-white">
              <MessageCircle className="h-4 w-4" /> Request a consultation
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
