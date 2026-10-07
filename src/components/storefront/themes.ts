import type { StorefrontTemplateId } from "@/lib/storefront-template";

/** Chrome (page background, gold banner, header, footer) for each template. */
export interface StorefrontTheme {
  name: string;
  display: string;
  pageBg: string;
  banner: string;
  header: string;
  logoRing: string;
  title: string;
  muted: string;
  iconHover: string;
  footer: string;
  footerTitle: string;
  footerMuted: string;
}

export const STOREFRONT_THEMES: Record<StorefrontTemplateId, StorefrontTheme> = {
  1: {
    name: "Royal Heritage",
    display: '"Cormorant Garamond","Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
    pageBg: "bg-[#fbf6ec]",
    banner: "border-b border-[#c9a24b]/40 bg-[#3a0f16] text-[#f3dfa8]",
    header: "border-b border-[#c9a24b]/30 bg-[#fffaf0]/95 backdrop-blur-md",
    logoRing: "border-[#c9a24b] bg-[#fff4d9]",
    title: "text-[#3a0f16]",
    muted: "text-[#7a5b4a]",
    iconHover: "hover:text-[#7b1e2b]",
    footer: "bg-[#2a0a10] text-[#f3dfa8]/70",
    footerTitle: "text-[#f3dfa8]",
    footerMuted: "text-[#f3dfa8]/40",
  },
  2: {
    name: "Noir Couture",
    display: '"Didot","Bodoni MT","Bodoni 72","Playfair Display",Georgia,serif',
    pageBg: "bg-[#f6f3ee]",
    banner: "border-b border-amber-300/20 bg-black text-amber-200",
    header: "border-b border-amber-300/15 bg-[#0b0b0b]/95 backdrop-blur-md",
    logoRing: "border-amber-300/50 bg-black",
    title: "text-white",
    muted: "text-white/55",
    iconHover: "hover:text-amber-300",
    footer: "bg-black text-white/55",
    footerTitle: "text-amber-200",
    footerMuted: "text-white/30",
  },
  3: {
    name: "Rosé Atelier",
    display: '"Playfair Display","Iowan Old Style",Palatino,Georgia,serif',
    pageBg: "bg-[#fff6f3]",
    banner: "bg-gradient-to-r from-[#b4536a] via-[#c96b7f] to-[#b4536a] text-rose-50",
    header: "border-b border-rose-200/60 bg-white/85 backdrop-blur-xl",
    logoRing: "border-rose-200 bg-rose-50",
    title: "text-[#5a2433]",
    muted: "text-[#a1707c]",
    iconHover: "hover:text-rose-600",
    footer: "bg-[#4a1b29] text-rose-100/70",
    footerTitle: "text-rose-50",
    footerMuted: "text-rose-100/35",
  },
  4: {
    name: "Emerald Court",
    display: '"Cinzel","Trajan Pro","Iowan Old Style",Palatino,Georgia,serif',
    pageBg: "bg-[#f4f1e8]",
    banner: "border-b border-[#d8c288]/25 bg-[#031a14] text-[#e6d49b]",
    header: "border-b border-[#d8c288]/20 bg-[#05261d]/95 backdrop-blur-md",
    logoRing: "border-[#d8c288]/60 bg-[#031a14]",
    title: "text-[#f1e6c0]",
    muted: "text-[#f1e6c0]/55",
    iconHover: "hover:text-[#e6d49b]",
    footer: "bg-[#031a14] text-[#e6d49b]/60",
    footerTitle: "text-[#f1e6c0]",
    footerMuted: "text-[#e6d49b]/30",
  },
  5: {
    name: "Pearl Gallery",
    display: '"Helvetica Neue",Inter,ui-sans-serif,system-ui,sans-serif',
    pageBg: "bg-white",
    banner: "bg-neutral-950 text-neutral-200",
    header: "border-b border-neutral-200 bg-white/90 backdrop-blur-xl",
    logoRing: "border-neutral-300 bg-neutral-50",
    title: "text-neutral-950",
    muted: "text-neutral-500",
    iconHover: "hover:text-neutral-950",
    footer: "bg-neutral-950 text-neutral-400",
    footerTitle: "text-white",
    footerMuted: "text-neutral-600",
  },
};
