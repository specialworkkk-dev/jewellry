"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, Settings, HelpCircle, Menu, X, Store, Users } from "lucide-react";
import { usePathname } from "next/navigation";

export default function MobileSidebar({ mode = "shop" }: { mode?: "shop" | "admin" }) {
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
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];
  const links = mode === "admin" ? adminLinks : shopLinks;

  return (
    <div className="md:hidden">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
        <span className="font-bold text-lg text-gray-900">{mode === "admin" ? "Admin Panel" : "Shop Owner Panel"}</span>
        <button type="button" aria-label="Open navigation" onClick={() => setIsOpen(true)} className="p-2 -mr-2 text-gray-600 hover:text-black">
          <Menu className="w-6 h-6" />
        </button>
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
              <nav className="mt-5 px-2 space-y-1">
                {links.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center px-2 py-3 text-base font-medium rounded-md ${
                        isActive ? "bg-amber-50 text-amber-600" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`mr-4 flex-shrink-0 h-6 w-6 ${isActive ? "text-amber-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
