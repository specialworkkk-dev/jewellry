import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Link from "next/link";
import { MapPin, Phone, AtSign, Users, Globe } from "lucide-react";
import { ShareButton } from "@/components/public/ShareButton";

export const dynamic = 'force-dynamic'; // Ensure we track every view accurately

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
  const shop = await Shop.findOne({ slug, isApproved: true }).lean();
  
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

  // Increment Link Opens
  await Shop.updateOne({ _id: shop._id }, { $inc: { currentLinkOpens: 1 } });
  
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
          <a href="/" className="inline-block bg-gray-900 text-white font-medium px-6 py-3 rounded-full hover:bg-black transition-colors">
            Back to Platform
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Inject dynamic manifest for this specific shop */}
      <link rel="manifest" href={`/api/shop/${shop.slug}/manifest.json`} />
      
      {/* Daily Gold Rate Banner */}
      {(shop.goldRate22K || shop.goldRate24K) && (
        <div className="bg-amber-100 border-b border-amber-200 py-2 px-4 text-center">
          <p className="text-sm font-medium text-amber-900 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Live Gold Rates:
            </span>
            {shop.goldRate22K && <span>22K: ₹{shop.goldRate22K.toLocaleString('en-IN')}/g</span>}
            {shop.goldRate22K && shop.goldRate24K && <span className="hidden sm:inline text-amber-300">|</span>}
            {shop.goldRate24K && <span>24K: ₹{shop.goldRate24K.toLocaleString('en-IN')}/g</span>}
          </p>
        </div>
      )}
      
      {/* Public Shop Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Logo & Name */}
            <div className="flex items-center gap-4 self-start sm:self-auto w-full sm:w-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-serif text-gray-400">{shop.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-semibold text-gray-900 line-clamp-1">{shop.name}</h1>
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
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {shop.businessPhone || shop.whatsappNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Socials */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <a href={`https://wa.me/${shop.whatsappNumber}`} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-sm">
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
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
      <footer className="bg-white border-t py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {shop.name}. All rights reserved.</p>
        <p className="mt-1 text-xs">Powered by Digital Storefront SaaS</p>
      </footer>

    </div>
  );
}
