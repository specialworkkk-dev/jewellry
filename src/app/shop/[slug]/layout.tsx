import type { Metadata } from "next";
import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Link from "next/link";
import { MapPin, Phone, AtSign, Users, Globe } from "lucide-react";
import { ShareButton } from "@/components/public/ShareButton";
import { LanguageSwitcher } from "@/i18n/useLocale";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { StoreImage } from "@/components/public/StoreImage";

export const dynamic = 'force-dynamic'; // Ensure we track every view accurately

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const shop = await Shop.findOne({ slug, isApproved: true, isActive: true }).lean();

  if (!shop) {
    return {
      title: 'Shop not found',
      description: 'This shop could not be found.',
    };
  }

  return {
    title: shop.name,
    description: shop.shortDescription || `Visit ${shop.name} and explore our latest collection.`,
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
    alternates: { canonical: `/shop/${shop.slug}` },
    openGraph: {
      title: shop.name,
      description: shop.shortDescription || `Shop by ${shop.name}`,
      siteName: shop.name,
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
  await connectToDatabase();
  
  // Fetch the shop by slug
  const { slug } = await params;
  const shop = await Shop.findOne({ slug, isApproved: true })
    .select("name slug logoUrl shortDescription address city state pincode whatsappNumber businessPhone instagramUrl facebookUrl websiteUrl goldRate22K goldRate24K maxLinkOpens currentLinkOpens isActive")
    .lean();
  
  if (!shop) {
    notFound();
  }

  if (shop.isActive === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-500 mb-6">
            The digital storefront for <strong>{shop.name}</strong> is currently unavailable.
          </p>
          <a href="mailto:support@luxestore.com" className="inline-block bg-gray-900 text-white font-medium px-6 py-3 rounded-full hover:bg-black transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  const whatsappNumber = (shop.whatsappNumber || "").replace(/\D/g, "");
  
  if (shop.currentLinkOpens >= (shop.maxLinkOpens || 500)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-orange-100">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Link Limit Reached</h1>
          <p className="text-gray-500 mb-6">
            This shop has reached its maximum allowed visitors ({shop.maxLinkOpens}). 
            If you are the shop owner, please contact admin to upgrade your limit.
          </p>
          <Link href="/" className="inline-block bg-gray-900 text-white font-medium px-6 py-3 rounded-full hover:bg-black transition-colors">
            Back to Platform
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f3]">
      <PwaInstallPrompt
        appId={`shop-${shop.slug}`}
        appName={shop.name}
        description={`Install ${shop.name} for quick access to this jewellery collection.`}
      />
      
      {/* Daily Gold Rate Banner */}
      {(shop.goldRate22K || shop.goldRate24K) && (
        <div className="border-b border-amber-300/30 bg-stone-950 px-4 py-2 text-center text-amber-100">
          <p className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold sm:gap-4 sm:text-sm">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              Today&apos;s Gold Rates
            </span>
            {shop.goldRate22K && <span>22K: ₹{shop.goldRate22K.toLocaleString('en-IN')}/g</span>}
            {shop.goldRate22K && shop.goldRate24K && <span className="hidden sm:inline text-amber-300">|</span>}
            {shop.goldRate24K && <span>24K: ₹{shop.goldRate24K.toLocaleString('en-IN')}/g</span>}
          </p>
        </div>
      )}
      
      {/* Public Shop Header */}
      <header className="z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-md sm:sticky sm:top-0">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Logo & Name */}
            <div className="flex items-center gap-4 self-start sm:self-auto w-full sm:w-auto">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200 bg-amber-50 shadow-sm sm:h-14 sm:w-14">
                {shop.logoUrl ? (
                  <StoreImage src={shop.logoUrl} alt={shop.name} sizes="56px" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-serif text-gray-400">{shop.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="line-clamp-1 text-lg font-serif font-semibold text-stone-900 sm:text-xl">{shop.name}</h1>
                <div className="flex flex-col gap-1 mt-1">
                  {(shop.address || shop.city || shop.state) && (
                    <p className="text-sm text-gray-500 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight line-clamp-2">
                        {[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                  {(shop.businessPhone || shop.whatsappNumber) && (
                    <a href={`tel:${(shop.businessPhone || shop.whatsappNumber || "").replace(/[^\d+]/g, "")}`} className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-900">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {shop.businessPhone || shop.whatsappNumber}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Socials */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="flex gap-2 w-full sm:w-auto items-center">
                <LanguageSwitcher />
                {whatsappNumber && (
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-sm min-h-11">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                <ShareButton title={shop.name} />
              </div>
              
              <div className="flex items-center gap-3 text-gray-400">
                {shop.instagramUrl && (
                  <a href={shop.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-pink-600 transition-colors">
                    <AtSign className="w-5 h-5" />
                  </a>
                )}
                {shop.facebookUrl && (
                  <a href={shop.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
                    <Users className="w-5 h-5" />
                  </a>
                )}
                {shop.websiteUrl && (
                  <a href={shop.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-gray-800 transition-colors">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area (Dynamic based on route) */}
      <main className="pb-24">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/10 bg-stone-950 px-4 py-10 text-center text-sm text-white/60">
        <p className="font-serif text-lg text-white">{shop.name}</p>
        <p className="mt-2">&copy; {new Date().getFullYear()} All rights reserved.</p>
        <p className="mt-1 text-xs text-white/35">Powered by LuxeStore</p>
      </footer>

    </div>
  );
}
