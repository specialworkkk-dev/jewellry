"use client";

import { useActionState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ShopPlanFields } from "@/components/admin/ShopPlanFields";
import { updateShopLimits, type ShopLimitsFormState } from "./actions";

export type ShopFormValues = {
  id: string;
  maxProducts: number;
  maxPhotosPerDay: number;
  maxVideosPerDay: number;
  videoUploadsEnabled: boolean;
  maxVideoDurationSeconds: number;
  maxLinkOpens: number;
  currentLinkOpens: number;
  isActive: boolean;
  isApproved: boolean;
  planPrice: number;
  planEndsAt: string;
};

export function ShopLimitsForm({ shop }: { shop: ShopFormValues }) {
  const [state, formAction] = useActionState<ShopLimitsFormState, FormData>(
    updateShopLimits.bind(null, shop.id),
    { error: null, values: null, attempt: 0 },
  );
  // After a failed validation the submitted values win over the saved ones.
  const v = (name: string, saved: string | number | boolean) => state.values?.[name] ?? String(saved);

  return (
      <div className="bg-white border rounded-lg shadow-sm">
        <form action={formAction} className="p-6 space-y-6">
          {state.error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Changes were not saved.</p>
              <p>{state.error}</p>
            </div>
          )}
          <div key={state.attempt} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Platform Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Plan Limits</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Products in Catalog</label>
                <input 
                  type="number" 
                  name="maxProducts" 
                  defaultValue={v("maxProducts", shop.maxProducts)}
                  required min={1} step={1} 
                  className="w-full px-3 py-2 border rounded-md" 
                />
                <p className="text-xs text-gray-500">How many total products they can list on their store.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Photos Per Day</label>
                <input 
                  type="number" 
                  name="maxPhotosPerDay" 
                  defaultValue={v("maxPhotosPerDay", shop.maxPhotosPerDay)}
                  required min={1} step={1} 
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
                  defaultValue={v("maxVideosPerDay", shop.maxVideosPerDay)}
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
                    defaultValue={v("videoUploadsEnabled", shop.videoUploadsEnabled ? "true" : "false")}
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
                    defaultValue={v("maxVideoDurationSeconds", shop.maxVideoDurationSeconds)}
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
                  defaultValue={v("maxLinkOpens", shop.maxLinkOpens)}
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-medium text-blue-600 bg-blue-50" 
                />
                <p className="text-xs text-gray-500">The storefront accepts this many unique IP addresses. Refreshes and return visits from an admitted IP do not consume another slot.</p>
                <p className="text-xs text-amber-600 font-medium">Currently admitted: {shop.currentLinkOpens} unique IPs.</p>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Access Control</h3>

              <ShopPlanFields
                initialPrice={Number(v("planPrice", shop.planPrice))}
                initialEndDate={v("planEndsAt", shop.planEndsAt)}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Status</label>
                <select name="isActive" defaultValue={v("isActive", shop.isActive ? "true" : "false")} className="w-full px-3 py-2 border rounded-md bg-white">
                  <option value="true">Active (Live)</option>
                  <option value="false">Suspended (Disabled)</option>
                </select>
                <p className="text-xs text-gray-500">Suspending the account will immediately hide their public storefront.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Approval</label>
                <select name="isApproved" defaultValue={v("isApproved", shop.isApproved ? "true" : "false")} className="w-full px-3 py-2 border rounded-md bg-white">
                  <option value="true">Approved</option>
                  <option value="false">Pending / Rejected</option>
                </select>
                <p className="text-xs text-gray-500">Unapproved shops are not visible on the public storefront.</p>
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
  );
}
