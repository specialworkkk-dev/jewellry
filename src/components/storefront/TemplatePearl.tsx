import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import {
  CataloguePager, CategoryNav, DEFAULT_TAGLINE, EMPTY_COPY, chatHref, enquiryHref, makingChargeText,
  priceText, productHref, productTags, purityText, savingsText, type TemplateProps,
} from "./shared";
import { STOREFRONT_THEMES } from "./themes";

const font = { fontFamily: STOREFRONT_THEMES[5].display };

/** Template 5 — minimalist gallery: white space, light type and numbered portrait cards. */
export function TemplatePearl(props: TemplateProps) {
  const { shop, products, savedProductIds, ownerWhatsApp } = props;
  const saved = new Set(savedProductIds);

  return (
    <div className="bg-white text-neutral-950" style={font}>
      <section className="mx-auto max-w-7xl px-5 pb-6 pt-16 sm:px-8 sm:pt-24">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.35em] text-neutral-500">
          <span className="storefront-hero-reveal [animation-delay:40ms]">Collection {new Date().getFullYear()}</span>
          <span className="storefront-hero-reveal [animation-delay:120ms]">{[shop.city, shop.state].filter(Boolean).join(", ") || "Fine jewellery"}</span>
        </div>
        <h1 className="storefront-hero-reveal mt-8 [overflow-wrap:anywhere] text-[clamp(2.75rem,10vw,8.5rem)] font-extralight uppercase leading-[0.92] tracking-[-0.03em] [animation-delay:180ms]">
          {shop.name}
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <p className="storefront-hero-reveal max-w-md text-base font-light leading-8 text-neutral-600 [animation-delay:320ms]">{shop.shortDescription || DEFAULT_TAGLINE}</p>
          <div className="storefront-hero-reveal flex flex-wrap gap-x-10 gap-y-3 text-sm font-medium [animation-delay:440ms] lg:justify-end">
            <a href="#collection" className="group inline-flex min-h-11 items-center gap-3 border-b border-neutral-950 pb-1">Shop the collection <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></a>
            {ownerWhatsApp && <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="group inline-flex min-h-11 items-center gap-3 border-b border-neutral-300 pb-1 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"><MessageCircle className="h-4 w-4" /> Speak to a specialist</a>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="storefront-hero-reveal relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 [animation-delay:520ms] sm:aspect-[21/9]">
          {shop.coverUrl ? (
            <StoreImage src={shop.coverUrl} alt={shop.name} sizes="100vw" preload className="storefront-hero-cover h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,#f5f5f4_0%,#d6d3d1_60%,#a8a29e_100%)]" />
          )}
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 pt-24 sm:px-8 sm:pt-32">
        <div className="flex flex-col justify-between gap-6 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
          <h2 className="text-3xl font-extralight uppercase tracking-[0.04em] sm:text-5xl">All designs <span className="align-top text-sm font-normal tracking-normal text-neutral-500" aria-label={`${products.length} designs`}>({products.length})</span></h2>
          <CategoryNav
            props={props}
            wrap="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm"
            item="px-2 py-2.5 transition"
            active="font-semibold text-neutral-950 underline underline-offset-8"
            idle="text-neutral-500 hover:text-neutral-950"
            separator={<span className="text-neutral-300" aria-hidden="true">/</span>}
          />
        </div>

        {products.length === 0 ? (
          <p className="py-28 text-center font-light text-neutral-500">{EMPTY_COPY}</p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-6 lg:grid-cols-4">
            {products.map((product, index) => {
              const id = product._id.toString();
              const savings = savingsText(product);
              const making = makingChargeText(product);
              return (
                <article key={id} className="group relative min-w-0">
                  <div className="relative">
                    <Link href={productHref(shop, product)} className="relative block aspect-[4/5] overflow-hidden bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950">
                      {product.images?.[0] ? (
                        <StoreImage src={product.images[0]} alt={product.name} sizes="(max-width: 1023px) 48vw, 24vw" className="h-full w-full object-cover transition duration-[1100ms] group-hover:scale-[1.06]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-500">No image</div>
                      )}
                      <span className="absolute bottom-3 left-3 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-0 transition duration-300 group-hover:opacity-100">View</span>
                    </Link>
                    <ProductCardFavorite productId={id} shopId={shop._id.toString()} initialSaved={saved.has(id)} />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span className="truncate pl-2">{productTags(product)[0] || purityText(product)}</span>
                    </div>
                    <h3 className="[overflow-wrap:anywhere] mt-2 line-clamp-2 min-h-10 text-sm font-medium leading-5 sm:text-base sm:leading-6">
                      <Link href={productHref(shop, product)} className="hover:underline hover:underline-offset-4">{product.name}</Link>
                    </h3>
                    <p className="[overflow-wrap:anywhere] mt-1 text-sm font-semibold sm:text-base">{priceText(product)}</p>
                    {savings && <p className="text-[11px] text-neutral-500"><span className="line-through">{savings.original}</span> <span className="font-semibold text-emerald-700">{savings.label}</span></p>}
                    {making && <p className="text-[11px] font-medium text-emerald-700">Making: <span className="text-neutral-500 line-through">{making.original}</span> {making.discounted}</p>}
                    {ownerWhatsApp && (
                      <a href={enquiryHref(ownerWhatsApp, product)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="mt-2 inline-flex min-h-11 items-center gap-2 border-b border-neutral-300 text-xs font-medium text-neutral-600 hover:border-neutral-950 hover:text-neutral-950">
                        <MessageCircle className="h-4 w-4" /> Enquire
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <CataloguePager
          props={props}
          wrap="mt-20 flex flex-wrap items-center justify-center gap-4"
          back="inline-flex min-h-12 items-center border border-neutral-300 px-8 text-xs font-semibold uppercase tracking-[0.25em] hover:border-neutral-950"
          more="inline-flex min-h-12 items-center bg-neutral-950 px-10 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-neutral-700"
        />

        {ownerWhatsApp && (
          <div className="mt-28 grid gap-8 border-t border-neutral-950 pt-10 sm:grid-cols-[1fr_auto] sm:items-end">
            <h3 className="[overflow-wrap:anywhere] max-w-2xl text-3xl font-extralight leading-tight tracking-tight sm:text-5xl">Questions about a piece? <span className="text-neutral-500">We reply in minutes.</span></h3>
            <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="group inline-flex min-h-12 items-center gap-3 bg-neutral-950 px-8 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-neutral-700">
              WhatsApp us <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
