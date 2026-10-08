import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, AtSign, Users, Globe } from "lucide-react";
import { ShareButton } from "@/components/public/ShareButton";
import { LanguageSwitcher } from "@/i18n/useLocale";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { StoreImage } from "@/components/public/StoreImage";
import { getPublicShopBySlug } from "@/lib/public-store";
import { headers } from "next/headers";
import { admitUniqueShopVisitor } from "@/lib/unique-shop-visitors";
import { ShopRealtimeSync } from "@/components/realtime/ShopRealtimeSync";
import { ShopNotificationButton } from "@/components/public/ShopNotificationButton";
import { getCurrentSession } from "@/lib/session";
import { resolveStorefrontTemplate } from "@/lib/storefront-template";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";

export const dynamic = 'force-dynamic'; // Ensure we track every view accurately

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [shop, requestHeaders] = await Promise.all([
    getPublicShopBySlug(slug),
    headers(),
  ]);

  if (!shop || shop.isActive === false) {
    return {
      title: 'Shop not found',
      description: 'This shop could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const origin = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const storefrontUrl = `${origin}/shop/${shop.slug}`;
  const shareImageUrl = `${storefrontUrl}/opengraph-image`;

  return {
    metadataBase: new URL(origin),
    title: `${shop.name} — Premium Jewellery Collection`,
    description: shop.shortDescription || `Discover the latest premium jewellery collection from ${shop.name}.`,
    applicationName: shop.name,
    manifest: `/api/shop/${shop.slug}/manifest.json`,
    icons: {
      apple: [{
        url: `/api/shop/${shop.slug}/icon/180`,
        sizes: "180x180",
        type: "image/png",
      }],
    },
    appleWebApp: {
      capable: true,
      title: shop.name,
      statusBarStyle: 'default',
    },
    alternates: { canonical: storefrontUrl },
    openGraph: {
      type: "website",
      url: storefrontUrl,
      title: `${shop.name} — Premium Jewellery Collection`,
      description: shop.shortDescription || `Discover the latest premium jewellery collection from ${shop.name}.`,
      siteName: shop.name,
      images: [{
        url: shareImageUrl,
        width: 1200,
        height: 630,
        alt: `${shop.name} premium jewellery collection`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${shop.name} — Premium Jewellery Collection`,
      description: shop.shortDescription || `Discover the latest premium jewellery collection from ${shop.name}.`,
      images: [shareImageUrl],
    },
  };
}

export default async function PublicShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [shop, session] = await Promise.all([
    getPublicShopBySlug(slug),
    getCurrentSession(),
  ]);
  
  if (!shop) {
    notFound();
  }

  if (shop.isActive === false) {
    // Suspended storefront: respond 403 (not a streamed 200) before any body is
    // sent. Next injects noindex; UI lives in src/app/shop/forbidden.tsx.
    forbidden();
  }

  const templateId = resolveStorefrontTemplate(shop);
  const theme = STOREFRONT_THEMES[templateId];
  const whatsappNumber = (shop.whatsappNumber || "").replace(/\D/g, "");
  const isOwnerPreview = session?.user.role === "SHOP_OWNER"
    && session.user.shopId === shop._id.toString();
  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const maximumUniqueVisitors = shop.maxLinkOpens || 500;
  // The owner previewing their own store must never be locked out or consume a visitor slot.
  const admission = isOwnerPreview
    ? { allowed: true, returning: true }
    : await admitUniqueShopVisitor(
      shop._id.toString(),
      maximumUniqueVisitors,
      await headers(),
      shop.uniqueVisitorTrackingVersion,
    );

  if (!admission.allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-orange-100">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Link Limit Reached</h1>
          <p className="text-gray-500 mb-6">
            This shop has reached its maximum allowed unique visitors ({maximumUniqueVisitors}).
            If you are the shop owner, please contact admin to upgrade your limit.
          </p>
          <Link href="/" className="inline-block bg-gray-900 text-white font-medium px-6 py-3 rounded-full hover:bg-black transition-colors">
            Back to Platform
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = [
    { href: shop.instagramUrl, label: "Instagram", Icon: AtSign },
    { href: shop.facebookUrl, label: "Facebook", Icon: Users },
    { href: shop.websiteUrl, label: "Website", Icon: Globe },
  ].filter((link) => Boolean(link.href));
  const socials = (visibility: string, size = "h-10 w-10") => socialLinks.length > 0 && (
    <div className={`${visibility} shrink-0 items-center gap-1 ${theme.muted}`}>
      {socialLinks.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className={`${theme.iconHover} inline-flex ${size} items-center justify-center rounded-full transition-colors`}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );

  return (
    <div data-storefront-template={templateId} className={`min-h-screen ${theme.pageBg}`}>
      {process.env.ABLY_API_KEY?.trim() && (
        <ShopRealtimeSync shopId={shop._id.toString()} audience="customer" />
      )}
      <PwaInstallPrompt
        appId={`shop-${shop.slug}`}
        appName={shop.name}
        description={`Keep ${shop.name} on your Home Screen for one-tap access to new designs, live gold rates and WhatsApp enquiries.`}
        dismissDurationMs={24 * 60 * 60 * 1000}
        showDelayMs={1800}
      />
      {isOwnerPreview && (
        <div className="sticky top-0 z-[70] flex h-12 items-center border-b border-amber-300/20 bg-stone-950 px-4 text-white shadow-lg">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <span className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-amber-300 sm:text-sm">
              Owner preview · {shop.name}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-300 sm:px-4 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      )}
      
      {/* Daily Gold Rate Banner */}
      {(shop.goldRate22K || shop.goldRate24K) && (
        <div className={`${theme.banner} px-4 py-2 text-center`}>
          <p className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold sm:gap-4 sm:text-sm">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              Today&apos;s Gold Rates
            </span>
            {shop.goldRate22K && <span>22K: ₹{shop.goldRate22K.toLocaleString('en-IN')}/g</span>}
            {shop.goldRate22K && shop.goldRate24K && <span className="hidden sm:inline opacity-60">|</span>}
            {shop.goldRate24K && <span>24K: ₹{shop.goldRate24K.toLocaleString('en-IN')}/g</span>}
          </p>
        </div>
      )}
      
      {/* Public Shop Header: identity row, then ONE compact action row on phones. */}
      <header className={`relative z-50 ${theme.header} lg:sticky ${isOwnerPreview ? "lg:top-12" : "lg:top-0"}`}>
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center lg:gap-4">

            {/* Logo & Name */}
            <div className="flex w-full min-w-0 items-center gap-3 sm:gap-4 lg:w-auto lg:flex-1">
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border ${theme.logoRing} shadow-sm sm:h-14 sm:w-14`}>
                {shop.logoUrl ? (
                  <StoreImage src={shop.logoUrl} alt={shop.name} sizes="56px" className="h-full w-full object-cover" />
                ) : (
                  <span className={`text-xl font-serif ${theme.muted}`}>{shop.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 style={{ fontFamily: theme.display }} className={`line-clamp-2 [overflow-wrap:anywhere] text-base font-semibold leading-tight sm:text-xl ${theme.title}`}>{shop.name}</h1>
                <div className="mt-1 flex flex-col gap-0.5">
                  {(shop.address || shop.city || shop.state) && (
                    <p className={`flex items-start gap-1 text-xs sm:text-sm ${theme.muted}`}>
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1 [overflow-wrap:anywhere] leading-tight sm:line-clamp-2">
                        {[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                  {(shop.businessPhone || shop.whatsappNumber) && (
                    <a href={`tel:${(shop.businessPhone || shop.whatsappNumber || "").replace(/[^\d+]/g, "")}`} className={`-my-2 flex min-w-0 items-center gap-1 py-2.5 text-xs sm:my-0 sm:py-0 sm:text-sm ${theme.muted} ${theme.iconHover}`}>
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{shop.businessPhone || shop.whatsappNumber}</span>
                    </a>
                  )}
                </div>
              </div>
              {/* Phones 400px and wider keep socials beside the name; narrower ones get them in the footer. */}
              {socials("hidden min-[400px]:flex lg:hidden", "h-10 w-10")}
            </div>

            {/* Quick actions: icon-only secondary buttons on phones so everything fits one row. */}
            <div className="flex w-full shrink-0 items-center justify-between gap-3 lg:w-auto">
              <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto">
                <LanguageSwitcher responsive />
                {publicVapidKey && (
                  <ShopNotificationButton
                    shopId={shop._id.toString()}
                    shopName={shop.name}
                    publicVapidKey={publicVapidKey}
                  />
                )}
                {whatsappNumber && (
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-green-700 px-3 sm:px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800 sm:flex-none">
                    <Phone className="h-4 w-4 shrink-0" /> <span className="truncate max-[359px]:hidden">WhatsApp</span><span className="min-[360px]:hidden">Chat</span>
                  </a>
                )}
                <ShareButton
                  title={`${shop.name} — Premium Jewellery Collection`}
                  text={`You are invited to explore ${shop.name}'s latest jewellery collection. Discover beautiful designs, live gold rates and enquire directly on WhatsApp.`}
                />
              </div>

              {socials("hidden lg:flex")}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area (Dynamic based on route) */}
      <main>
        {children}
      </main>
      
      {/* Footer */}
      <footer className={`border-t border-white/10 px-4 py-10 text-center text-sm ${theme.footer}`}>
        <p style={{ fontFamily: theme.display }} className={`text-lg [overflow-wrap:anywhere] ${theme.footerTitle}`}>{shop.name}</p>
        {socials("mt-4 flex justify-center min-[400px]:hidden", "h-11 w-11")}
        <p className="mt-2">&copy; {new Date().getFullYear()} All rights reserved.</p>
        <p className={`mt-1 text-xs ${theme.footerMuted}`}>Powered by LuxeStore</p>
      </footer>

    </div>
  );
}
