import Link from "next/link";
import { ArrowUpRight, Gem, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { ProductCardFavorite } from "@/components/public/ProductCardFavorite";
import { PwaInstallCard } from "@/components/public/PwaInstallCard";
import {
  CataloguePager, CategoryNav, DEFAULT_TAGLINE, EMPTY_COPY, chatHref, enquiryHref, makingChargeText,
  priceText, productHref, productTags, purityText, savingsText, type StorefrontProduct, type TemplateProps,
} from "./shared";
import { STOREFRONT_THEMES } from "./themes";

const font = { fontFamily: STOREFRONT_THEMES[4].display };

/** Template 4 — deep emerald and champagne with a full-bleed hero and a spotlight piece. */
export function TemplateEmerald(props: TemplateProps) {
  const { shop, products, savedProductIds, ownerWhatsApp } = props;
  const saved = new Set(savedProductIds);
  const [spotlight, ...rest] = products;

  const card = (product: StorefrontProduct) => {
    const id = product._id.toString();
    const savings = savingsText(product);
    return (
      <article key={id} className="group relative flex min-w-0 flex-col overflow-hidden rounded-sm border border-[#d8c288]/25 bg-[#062a20] transition duration-500 hover:-translate-y-1 hover:border-[#d8c288]/70 hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,.7)]">
        <div className="relative">
          <Link href={productHref(shop, product)} className="relative block aspect-square overflow-hidden bg-[#031a14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e6d49b]">
            {product.images?.[0] ? (
              <StoreImage src={product.images[0]} alt={product.name} thumb sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 25vw" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
            ) : (
              <div className="flex h-full items-center justify-center text-[#d8c288]/30"><Gem className="h-9 w-9" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#031a14] via-transparent to-transparent opacity-80" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {productTags(product).map((tag) => <span key={tag} className="bg-[#e6d49b] px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#031a14]">{tag}</span>)}
            </div>
          </Link>
          <ProductCardFavorite productId={id} shopId={shop._id.toString()} initialSaved={saved.has(id)} />
        </div>
        <div className="flex flex-1 flex-col p-4 text-[#f1e6c0]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d8c288]">{purityText(product)}</p>
          <h3 className="[overflow-wrap:anywhere] mt-2 line-clamp-2 min-h-11 text-base font-semibold leading-[1.35] tracking-wide">
            <Link href={productHref(shop, product)} className="hover:text-[#e6d49b]">{product.name}</Link>
          </h3>
          <p className="[overflow-wrap:anywhere] mt-2 text-lg font-bold text-[#e6d49b]">{priceText(product)}</p>
          {savings && <p className="text-[11px] text-[#f1e6c0]/70"><span className="line-through">{savings.original}</span> <span className="font-semibold text-emerald-300">{savings.label}</span></p>}
          <div className="mt-auto flex gap-2 pt-4">
            <Link href={productHref(shop, product)} className="inline-flex min-h-11 flex-1 items-center justify-center border border-[#d8c288]/50 text-[11px] font-bold uppercase tracking-[0.2em] text-[#e6d49b] transition hover:bg-[#e6d49b] hover:text-[#031a14]">View</Link>
            {ownerWhatsApp && (
              <a href={enquiryHref(ownerWhatsApp, product)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`} className="inline-flex min-h-11 w-11 items-center justify-center bg-[#168c48] text-white hover:bg-[#1aa556]">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </article>
    );
  };

  const spotId = spotlight ? spotlight._id.toString() : "";
  const spotSavings = spotlight ? savingsText(spotlight) : null;
  const spotMaking = spotlight ? makingChargeText(spotlight) : null;

  return (
    <div className="bg-[#031a14] text-[#f1e6c0]" style={font}>
      <section className="relative isolate flex min-h-[600px] items-end overflow-hidden sm:min-h-[720px]">
        {shop.coverUrl ? (
          <StoreImage src={shop.coverUrl} alt={shop.name} sizes="100vw" preload className="storefront-hero-cover absolute inset-0 -z-10 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,#0f6b4f_0%,#06382a_40%,#031a14_80%)]" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#031a14] via-[#031a14]/60 to-[#031a14]/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#031a14]/80 via-transparent to-transparent" />

        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 px-5 pb-14 sm:px-8 sm:pb-20 lg:grid-cols-[1.4fr_.6fr]">
          <div>
            <p className="storefront-hero-reveal flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#e6d49b] [animation-delay:80ms]">
              <Sparkles className="h-4 w-4" /> The heritage house
            </p>
            <h1 className="storefront-hero-reveal mt-5 [overflow-wrap:anywhere] text-4xl font-semibold uppercase leading-[1.08] tracking-[0.12em] text-[#fbf1cf] drop-shadow-xl sm:text-6xl lg:text-7xl [animation-delay:220ms]">
              {shop.name}
            </h1>
            <div className="storefront-hero-reveal mt-6 h-px w-32 bg-gradient-to-r from-[#e6d49b] to-transparent [animation-delay:340ms]" />
            <p className="storefront-hero-reveal mt-6 max-w-xl font-sans text-base leading-8 text-[#f1e6c0]/80 sm:text-lg [animation-delay:440ms]">
              {shop.shortDescription || DEFAULT_TAGLINE}
            </p>
            <a href="#collection" className="storefront-hero-reveal mt-9 inline-flex min-h-13 items-center gap-3 bg-[#e6d49b] px-9 py-4 text-xs font-bold uppercase tracking-[0.28em] text-[#031a14] shadow-2xl transition hover:bg-white [animation-delay:600ms]">
              Explore the vault <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="storefront-hero-reveal hidden space-y-3 border border-[#d8c288]/30 bg-[#031a14]/55 p-6 backdrop-blur-md lg:block [animation-delay:760ms]">
            {[[ShieldCheck, "Hallmark certified"], [Gem, "Hand-finished"], [MessageCircle, "Direct concierge"]].map(([Icon, label], index) => {
              const I = Icon as typeof Gem;
              return (
                <div key={index} className="flex items-center gap-4 border-b border-[#d8c288]/15 pb-3 last:border-0 last:pb-0">
                  <I className="h-5 w-5 text-[#e6d49b]" />
                  <span className="font-sans text-sm tracking-wide">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PwaInstallCard appName={shop.name} />

      <section id="collection" className="storefront-content mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 pt-20 sm:px-8 sm:pt-28">
        <div className="flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#d8c288]">Curated vault</p>
            <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.12em] sm:text-5xl">Signature pieces</h2>
          </div>
          <CategoryNav
            props={props}
            wrap="flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto"
            item="whitespace-nowrap border px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] transition"
            active="border-[#e6d49b] bg-[#e6d49b] text-[#031a14]"
            idle="border-[#d8c288]/25 text-[#f1e6c0]/70 hover:border-[#e6d49b]"
          />
        </div>

        {!spotlight ? (
          <div className="mt-14 border border-dashed border-[#d8c288]/30 py-24 text-center font-sans text-[#f1e6c0]/60">{EMPTY_COPY}</div>
        ) : (
          <>
            <article className="relative mt-14 grid overflow-hidden border border-[#d8c288]/30 bg-gradient-to-br from-[#073526] to-[#031a14] lg:grid-cols-2">
              <div className="relative">
                <Link href={productHref(shop, spotlight)} className="relative block aspect-square overflow-hidden lg:h-full lg:aspect-auto lg:min-h-[480px]">
                  {spotlight.images?.[0] ? (
                    <StoreImage src={spotlight.images[0]} alt={spotlight.name} sizes="(max-width: 1023px) 95vw, 50vw" className="h-full w-full object-cover transition duration-1000 hover:scale-105" />
                  ) : (
                    <div className="flex h-full min-h-72 items-center justify-center text-[#d8c288]/30"><Gem className="h-12 w-12" /></div>
                  )}
                </Link>
                <ProductCardFavorite productId={spotId} shopId={shop._id.toString()} initialSaved={saved.has(spotId)} />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[#d8c288]">Spotlight · {purityText(spotlight)}</p>
                <h3 className="[overflow-wrap:anywhere] mt-4 text-3xl font-semibold leading-tight tracking-wide sm:text-4xl">{spotlight.name}</h3>
                {productTags(spotlight).length > 0 && <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{productTags(spotlight).join(" · ")}</p>}
                <p className="[overflow-wrap:anywhere] mt-6 text-3xl font-bold text-[#e6d49b]">{priceText(spotlight)}</p>
                {spotSavings && <p className="mt-1 font-sans text-sm text-[#f1e6c0]/55"><span className="line-through">{spotSavings.original}</span> <span className="font-semibold text-emerald-300">{spotSavings.label}</span></p>}
                {spotMaking && <p className="mt-1 font-sans text-xs font-semibold text-emerald-300">Making: <span className="text-[#f1e6c0]/45 line-through">{spotMaking.original}</span> {spotMaking.discounted} · {spotMaking.label}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={productHref(shop, spotlight)} className="inline-flex min-h-12 items-center gap-2 bg-[#e6d49b] px-8 text-xs font-bold uppercase tracking-[0.24em] text-[#031a14] hover:bg-white">View piece <ArrowUpRight className="h-4 w-4" /></Link>
                  {ownerWhatsApp && (
                    <a href={enquiryHref(ownerWhatsApp, spotlight)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 border border-[#d8c288]/50 px-6 text-xs font-bold uppercase tracking-[0.2em] text-[#e6d49b] hover:bg-[#d8c288]/10"><MessageCircle className="h-4 w-4" /> Enquire</a>
                  )}
                </div>
              </div>
            </article>

            {rest.length > 0 && <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{rest.map(card)}</div>}
          </>
        )}

        <CataloguePager
          props={props}
          wrap="mt-14 flex flex-wrap items-center justify-center gap-3"
          back="inline-flex min-h-12 items-center border border-[#d8c288]/40 px-7 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#e6d49b] hover:bg-[#d8c288]/10"
          more="inline-flex min-h-12 items-center bg-[#e6d49b] px-9 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#031a14] hover:bg-white"
        />

        {ownerWhatsApp && (
          <div className="mt-24 flex flex-col items-start justify-between gap-7 border border-[#d8c288]/30 bg-gradient-to-r from-[#073526] to-[#031a14] px-7 py-12 sm:flex-row sm:items-center sm:px-14">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[#d8c288]">Private viewing</p>
              <h3 className="[overflow-wrap:anywhere] mt-3 max-w-xl text-2xl font-semibold uppercase leading-snug tracking-[0.08em] sm:text-4xl">Speak with {shop.name}</h3>
            </div>
            <a href={chatHref(shop, ownerWhatsApp)} target="_blank" rel="noreferrer" className="inline-flex min-h-13 shrink-0 items-center gap-3 bg-[#e6d49b] px-9 py-4 text-xs font-bold uppercase tracking-[0.26em] text-[#031a14] hover:bg-white"><MessageCircle className="h-4 w-4" /> Chat now</a>
          </div>
        )}
      </section>
    </div>
  );
}
