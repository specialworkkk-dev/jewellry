import { StoreImage } from "@/components/public/StoreImage";
import { ArrowDown, Gem, ShieldCheck, Sparkles } from "lucide-react";

interface CinematicHeroProps {
  coverUrl?: string;
  shopName: string;
  shortDescription?: string;
}

export function CinematicHero({ coverUrl, shopName, shortDescription }: CinematicHeroProps) {
  return (
    <section className="relative flex min-h-[520px] w-full items-end overflow-hidden bg-[#17120d] sm:min-h-[620px] lg:min-h-[720px]">
      {coverUrl ? (
        <StoreImage
          src={coverUrl}
          alt={shopName}
          sizes="100vw"
          preload
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#d7a94b_0%,#72501f_30%,#17120d_72%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,transparent_0%,rgba(0,0,0,.3)_68%)]" />
      <div className="absolute left-4 top-5 h-24 w-24 rounded-full border border-white/15 sm:left-10 sm:top-10 sm:h-36 sm:w-36" />
      <div className="absolute left-10 top-11 h-12 w-12 rounded-full border border-amber-300/30 sm:left-24 sm:top-24 sm:h-16 sm:w-16" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Fine jewellery collection
          </span>
          <h1 className="mt-5 text-4xl font-serif font-semibold leading-[1.04] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
          {shopName}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 drop-shadow-md sm:text-xl">
            {shortDescription || "Timeless designs, trusted craftsmanship and jewellery made for life’s most precious moments."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#collection"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-black/20 transition hover:bg-amber-300"
            >
              Explore collection <ArrowDown className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-3 text-xs font-medium text-white/80 sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-300" /> Trusted quality</span>
              <span className="inline-flex items-center gap-1.5"><Gem className="h-4 w-4 text-amber-300" /> Curated designs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
