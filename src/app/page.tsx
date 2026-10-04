import Link from "next/link";
import { ArrowRight, Sparkles, Store, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-serif font-bold text-gray-900">
            <Sparkles className="w-5 h-5 text-amber-500" />
            LuxeStore SaaS
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black">
              Login
            </Link>
            <Link href="/register" className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
              Open Your Store
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 tracking-tight mb-8">
              The Digital Storefront for <br />
              <span className="text-amber-600 italic">Premium Jewellers</span>
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Transform your physical jewellery shop into a world-class digital experience. Launch an Instagram-style catalog, track live gold rates, and close sales directly on WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="bg-amber-500 text-white px-8 py-4 rounded-full font-medium hover:bg-amber-600 transition-colors flex items-center gap-2 text-lg shadow-lg shadow-amber-500/25">
                Launch Your Digital Store <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/shop/demo" className="text-gray-600 hover:text-black font-medium px-8 py-4 flex items-center gap-2">
                View Demo Store
              </Link>
            </div>
          </div>
          
          {/* Decorative Background */}
          <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-amber-50/50 to-white -z-10" />
        </div>

        {/* Features Section */}
        <div className="py-24 bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <Store className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">Premium Catalog</h3>
                <p className="text-gray-600">Showcase your gold and diamond collections with high-resolution imagery and dynamic pricing.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <Sparkles className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">Social Feed & Stories</h3>
                <p className="text-gray-600">Keep customers engaged with an Instagram-style feed and 24-hour expiring stories.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <TrendingUp className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">WhatsApp Integration</h3>
                <p className="text-gray-600">Customers can enquire about specific products directly to your WhatsApp with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
