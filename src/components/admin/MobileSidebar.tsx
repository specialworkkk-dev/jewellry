"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ExternalLink, LayoutDashboard, LogOut, Package, Settings, HelpCircle, Menu, X, Store, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NavPendingIndicator } from "@/components/ui/nav-pending-indicator";
import { LanguageSwitcher } from "@/i18n/useLocale";

export default function MobileSidebar({ mode = "shop", shopSlug }: { mode?: "shop" | "admin"; shopSlug?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const shopLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { href: "/dashboard/products", icon: Package, label: "Products" },
    { href: "/dashboard/enquiries", icon: HelpCircle, label: "Enquiries" },
    { href: "/dashboard/settings", icon: Settings, label: "Shop Settings" },
  ];
  const adminLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/shops", icon: Store, label: "Shops" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/infrastructure", icon: Activity, label: "Infrastructure" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];
  const links = mode === "admin" ? adminLinks : shopLinks;

  return (
    <div className="md:hidden">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
        <span className="font-bold text-lg text-gray-900">{mode === "admin" ? "Admin Panel" : "Shop Owner Panel"}</span>
        <div className="flex items-center gap-2">
          {mode === "shop" && <LanguageSwitcher compact className="min-h-11 px-3" />}
          <button type="button" aria-label="Open navigation" onClick={() => setIsOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-black">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                aria-label="Close navigation"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 font-bold text-xl text-gray-900 mb-5">
                LuxeStore SaaS
              </div>
              {mode === "shop" && (
                <div className="px-4 pb-3">
                  <LanguageSwitcher className="w-full justify-center rounded-xl" />
                </div>
              )}
              <nav className="mt-5 px-2 space-y-1">
                {links.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center px-2 py-3 text-base font-medium rounded-md ${
                        isActive ? "bg-amber-50 text-amber-600" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`mr-4 flex-shrink-0 h-6 w-6 ${isActive ? "text-amber-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                      {item.label}
                      <NavPendingIndicator />
                    </Link>
                  );
                })}
                {mode === "shop" && shopSlug && (
                  <Link
                    href={`/shop/${shopSlug}`}
                    target="_blank"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center rounded-md px-2 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <ExternalLink className="mr-4 h-6 w-6 shrink-0 text-gray-400" />
                    View My Shop
                  </Link>
                )}
              </nav>
            </div>
            <div className="border-t p-3">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center rounded-md px-2 py-3 text-base font-medium text-red-700 hover:bg-red-50"
              >
                <LogOut className="mr-4 h-6 w-6" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
