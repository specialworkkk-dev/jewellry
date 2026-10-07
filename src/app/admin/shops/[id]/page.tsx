import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateShopLimits } from "./actions";
import { isObjectId } from "@/lib/validation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ShopPlanFields } from "@/components/admin/ShopPlanFields";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export default async function AdminShopEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  await connectToDatabase();
  const resolvedParams = await params;
  if (!isObjectId(resolvedParams.id)) notFound();
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
                  min={1}
                  max={20}
                  defaultValue={shop.maxVideosPerDay ?? 2}
                  className="w-full px-3 py-2 border rounded-md" 
                />
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-4">
                <div>
                  <h4 className="font-semibold text-violet-950">Product video access</h4>
                  <p className="mt-1 text-xs text-violet-700">Control whether this shop can upload product reels and how long each reel may be.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Video uploads</label>
                  <select
                    name="videoUploadsEnabled"
                    defaultValue={shop.videoUploadsEnabled === true ? "true" : "false"}
                    className="w-full rounded-md border bg-white px-3 py-2"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Maximum duration (seconds)</label>
                  <input
                    type="number"
                    name="maxVideoDurationSeconds"
                    min={5}
                    max={120}
                    step={1}
                    defaultValue={shop.maxVideoDurationSeconds ?? 30}
                    className="w-full rounded-md border bg-white px-3 py-2"
                  />
                  <p className="text-xs text-violet-700">Recommended: 15–30 seconds. Allowed admin range: 5–120 seconds.</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-dashed">
                <label className="text-sm font-bold text-gray-900">Maximum Unique Visitor IPs</label>
                <input 
                  type="number" 
                  name="maxLinkOpens" 
                  min={1}
                  step={1}
                  defaultValue={shop.maxLinkOpens || 500} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-medium text-blue-600 bg-blue-50" 
                />
                <p className="text-xs text-gray-500">The storefront accepts this many unique IP addresses. Refreshes and return visits from an admitted IP do not consume another slot.</p>
                <p className="text-xs text-amber-600 font-medium">Currently admitted: {shop.currentLinkOpens || 0} unique IPs.</p>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Access Control</h3>

              <ShopPlanFields
                initialPrice={Number(shop.planPrice ?? 0)}
                initialEndDate={shop.planEndsAt ? new Date(shop.planEndsAt).toISOString().slice(0, 10) : ""}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Status</label>
                <select name="isActive" defaultValue={shop.isActive ? "true" : "false"} className="w-full px-3 py-2 border rounded-md bg-white">
                  <option value="true">Active (Live)</option>
                  <option value="false">Suspended (Disabled)</option>
                </select>
                <p className="text-xs text-gray-500">Suspending the account will immediately hide their public storefront.</p>
              </div>
              
              <div className="pt-6">
                <ActionSubmitButton pendingLabel="Saving configuration…" className="h-auto w-full bg-gray-900 px-4 py-3 text-white hover:bg-black">
                  Save Tenant Configuration
                </ActionSubmitButton>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
