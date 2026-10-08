import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import User from "@/models/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, CheckCircle, Clock } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();
  await connectToDatabase();

  const [totalShops, pendingShops, activeShops, totalUsers, recentShops] = await Promise.all([
    Shop.countDocuments(),
    Shop.countDocuments({ isApproved: false }),
    Shop.countDocuments({ isApproved: true, isActive: true }),
    User.countDocuments(),
    Shop.find()
      .select("name city state isApproved createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShops}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingShops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShops}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="min-w-0 lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentShops.map((shop) => (
                <div key={shop._id.toString()} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 sm:p-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">{shop.name}</h3>
                    <p className="break-words text-sm text-gray-500">{shop.city}, {shop.state}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`whitespace-nowrap px-2 py-1 text-xs rounded-full ${shop.isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {shop.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
