import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { LayoutDashboard, Store, Users, Settings } from "lucide-react";
import UserProfileDropdown from "@/components/admin/UserProfileDropdown";
import MobileSidebar from "@/components/admin/MobileSidebar";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import type { Metadata } from "next";
import { connection } from "next/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return {
    applicationName: "LuxeStore Admin",
    manifest: "/api/pwa/admin/manifest.json",
    appleWebApp: {
      capable: true,
      title: "LuxeStore Admin",
      statusBarStyle: "default",
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const allowedAdminRoles = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);
  const activeRole = session?.user?.role ?? "";

  if (!session || !allowedAdminRoles.has(activeRole)) {
    redirect("/login");
  }

  const displayName = session.user.name ?? "Admin";
  const displayEmail = session.user.email ?? "";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <PwaInstallPrompt
        appId="admin"
        appName="LuxeStore Admin"
        description="Install the admin app for direct access to platform management."
      />
      <MobileSidebar mode="admin" />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 font-bold text-xl text-gray-800">
          Admin Panel
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/shops" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Store className="w-5 h-5" />
            Shops
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-100 hidden md:flex items-center px-6 justify-between">
          <h2 className="font-medium text-gray-600">Jewellery SaaS Platform</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <UserProfileDropdown name={displayName} email={displayEmail} />
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
