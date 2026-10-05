import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, LayoutDashboard, Store, Users, Settings } from "lucide-react";
import UserProfileDropdown from "@/components/admin/UserProfileDropdown";
import MobileSidebar from "@/components/admin/MobileSidebar";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import type { Metadata } from "next";
import { connection } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import InfrastructureSnapshot from "@/models/InfrastructureSnapshot";
import type { InfrastructureAlert } from "@/lib/infrastructure-monitor";
import { getCurrentSession } from "@/lib/session";

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
  const session = await getCurrentSession();
  const allowedAdminRoles = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);
  const activeRole = session?.user?.role ?? "";

  if (!session || !allowedAdminRoles.has(activeRole)) {
    redirect("/login");
  }

  const displayName = session.user.name ?? "Admin";
  const displayEmail = session.user.email ?? "";
  let infrastructureAlerts: InfrastructureAlert[] = [];
  try {
    await connectToDatabase();
    const latest = await InfrastructureSnapshot.findOne().sort({ checkedAt: -1 }).select("alerts").lean();
    infrastructureAlerts = (latest?.alerts ?? []) as InfrastructureAlert[];
  } catch (error) {
    console.error("Unable to load infrastructure alerts", error);
  }
  const criticalAlerts = infrastructureAlerts.filter((alert) => alert.severity === "critical");

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
          <Link prefetch={true} href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link prefetch={true} href="/admin/shops" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Store className="w-5 h-5" />
            Shops
          </Link>
          <Link prefetch={true} href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link prefetch={true} href="/admin/infrastructure" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Activity className="w-5 h-5" />
            Infrastructure
            {infrastructureAlerts.length > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${criticalAlerts.length > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {infrastructureAlerts.length}
              </span>
            )}
          </Link>
          <Link prefetch={true} href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
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
        <div className="p-4 md:p-8">
          {infrastructureAlerts.length > 0 && (
            <Link
              prefetch={true}
              href="/admin/infrastructure"
              className={`mb-5 flex items-center justify-between gap-4 rounded-lg border p-3 text-sm ${criticalAlerts.length > 0 ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {criticalAlerts.length > 0
                  ? `${criticalAlerts.length} critical infrastructure alert${criticalAlerts.length === 1 ? "" : "s"} require action.`
                  : `${infrastructureAlerts.length} infrastructure warning${infrastructureAlerts.length === 1 ? "" : "s"} require review.`}
              </span>
              <span className="shrink-0 font-semibold">Review</span>
            </Link>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
