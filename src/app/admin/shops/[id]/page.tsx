import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateShopLimits } from "./actions";

export default async function AdminShopEditPage({ params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const resolvedParams = await params;
  const shop = await Shop.findById(resolvedParams.id).lean();
  
  if (!shop) {
    notFound();
  }

  // Next.js Server Actions don't support binding string arguments directly in the form tag in TS without bind.
  const updateWithId = updateShopLimits.bind(null, shop._id.toString());

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/shops" className="text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Tenant: {shop.name}</h1>
          <p className="text-gray-500 mt-1">Configure subscription limits and access control for this shop.</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        <form action={updateWithId} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Platform Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Plan Limits</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Products in Catalog</label>
                <input 
                  type="number" 
                  name="maxProducts" 
                  defaultValue={shop.maxProducts || 50} 
                  className="w-full px-3 py-2 border rounded-md" 
                />
                <p className="text-xs text-gray-500">How many total products they can list on their store.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Photos Per Day</label>
                <input 
                  type="number" 
                  name="maxPhotosPerDay" 
                  defaultValue={shop.maxPhotosPerDay || 30} 
                  className="w-full px-3 py-2 border rounded-md" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Videos Per Day</label>
                <input 
                  type="number" 
                  name="maxVideosPerDay" 
                  defaultValue={shop.maxVideosPerDay || 2} 
                  className="w-full px-3 py-2 border rounded-md" 
                />
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Access Control</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Status</label>
                <select name="isActive" defaultValue={shop.isActive ? "true" : "false"} className="w-full px-3 py-2 border rounded-md bg-white">
                  <option value="true">Active (Live)</option>
                  <option value="false">Suspended (Disabled)</option>
                </select>
                <p className="text-xs text-gray-500">Suspending the account will immediately hide their public storefront.</p>
              </div>
              
              <div className="pt-6">
                <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-medium py-3 px-4 rounded-md transition-colors">
                  Save Tenant Configuration
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
