import connectToDatabase from "@/lib/mongoose";
import Advertisement from "@/models/Advertisement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";
import { CreateAdForm } from "./create-ad-form";
import { RowActions } from "../media/row-actions";
import Image from "next/image";
import { requireOwnerTenant } from "@/lib/tenant";
import { OwnerPagination } from "@/components/ui/owner-pagination";
import { clampOwnerPage, getOwnerPagination, type OwnerListSearchParams } from "@/lib/owner-pagination";

const currentTimeMs = () => Date.now();

export default async function MarketingDashboardPage({ searchParams }: { searchParams: OwnerListSearchParams }) {
  const { shopId } = await requireOwnerTenant();
  await connectToDatabase();
  const nowMs = currentTimeMs();

  const { page: requestedPage, perPage } = await getOwnerPagination(searchParams);
  const loadAds = (pageNumber: number) => Advertisement.find({ shopId })
    .select("title type message imageUrl isActive validUntil createdAt")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * perPage)
    .limit(perPage)
    .lean();
  const [totalAds, requestedAds] = await Promise.all([
    Advertisement.countDocuments({ shopId }),
    loadAds(requestedPage),
  ]);
  const page = clampOwnerPage(requestedPage, totalAds, perPage);
  const ads = page === requestedPage ? requestedAds : await loadAds(page);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Marketing & Offers</h1>
          <p className="text-gray-500 mt-2">Manage live gold rates and promotional banners on your storefront.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Actions / Types */}
        <div className="min-w-0 lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create Promotion</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateAdForm />
            </CardContent>
          </Card>
        </div>

        {/* Active Ads List */}
        <div className="min-w-0 lg:col-span-2 space-y-4">
          {ads.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <Tag className="w-10 h-10 text-gray-300 mb-3" />
                <h3 className="font-medium text-gray-900">No active promotions</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">You don&apos;t have any banners running on your store.</p>
              </CardContent>
            </Card>
          ) : (
            <>
            {ads.map((ad) => (
              <Card key={ad._id.toString()} className={!ad.isActive ? "opacity-60" : ""}>
                <CardContent className="!p-0 flex flex-col sm:flex-row">
                  {ad.imageUrl && (
                    <div className="relative aspect-video w-full bg-gray-100 sm:aspect-auto sm:w-1/3 sm:min-h-32">
                      <Image src={ad.imageUrl} alt={ad.title} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                          {ad.type.replace('_', ' ')}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ad.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="text-xs font-medium text-gray-600">{ad.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-1 break-words [overflow-wrap:anywhere]">{ad.title}</h3>
                      <p className="text-sm text-gray-600 mt-2 break-words [overflow-wrap:anywhere]">{ad.message}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <span className="text-xs text-gray-500">
                        {ad.validUntil && new Date(ad.validUntil).getTime() < nowMs ? "Expired" : ad.validUntil ? `Valid till ${new Date(ad.validUntil).toLocaleDateString()}` : 'Runs continuously'}
                      </span>
                      <RowActions
                        endpoint={`/api/advertisements/${ad._id.toString()}`}
                        noun="advertisement"
                        toggle={{ field: "isActive", value: ad.isActive, onLabel: "Activate", offLabel: "Deactivate" }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <OwnerPagination basePath="/dashboard/marketing" page={page} perPage={perPage} totalItems={totalAds} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
