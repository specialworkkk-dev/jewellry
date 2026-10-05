import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { LayoutDashboard, Package, Settings, HelpCircle, ExternalLink } from "lucide-react";
import MobileSidebar from "@/components/admin/MobileSidebar";
import UserProfileDropdown from "@/components/admin/UserProfileDropdown";
import Shop from "@/models/Shop";
import connectToDatabase from "@/lib/mongoose";
import { LanguageSwitcher } from "@/i18n/useLocale";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import type { Metadata } from "next";
import { connection } from "next/server";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return {
    applicationName: "LuxeStore Owner",
    manifest: "/api/pwa/owner/manifest.json",
    appleWebApp: {
      capable: true,
      title: "LuxeStore Owner",
      statusBarStyle: "default",
    },
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "SUPER_ADMIN" || session.user.role === "PLATFORM_ADMIN") {
    redirect("/admin");
  }

  if (session.user.role !== "SHOP_OWNER") {
    redirect("/login");
  }

  // Fetch shop slug to generate the "View Shop" URL
  await connectToDatabase();
  const shop = await Shop.findById(session.user.shopId);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50/50">
      <PwaInstallPrompt
        appId="owner"
        appName="LuxeStore Owner"
        description="Install your owner dashboard to manage products and enquiries faster."
      />
      {/* Mobile Navigation (Client Component) */}
      <MobileSidebar shopSlug={shop?.slug} />

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 font-bold text-xl text-gray-900 font-serif">
          LuxeStore SaaS
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors group">
            <LayoutDashboard className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
            Overview
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors group">
            <Package className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
            Products
          </Link>
          <Link href="/dashboard/enquiries" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors group">
            <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
            Enquiries
          </Link>
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors group">
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
              Shop Settings
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 justify-between sticky top-0 z-40 hidden md:flex">
          <div className="font-medium text-gray-800 truncate pr-4">
            Welcome back, {session.user.name}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
             <LanguageSwitcher />
             {shop && (
               <Link href={`/shop/${shop.slug}`} target="_blank" className="flex items-center gap-2 text-sm text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                 View Live Shop <ExternalLink className="w-4 h-4" />
               </Link>
             )}
             <UserProfileDropdown name={session.user.name} email={session.user.email} />
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
