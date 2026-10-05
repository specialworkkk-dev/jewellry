import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Advertisement from "@/models/Advertisement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonButton as Button } from "@/components/ui/coming-soon-button";
import { Tag, TrendingUp, Presentation } from "lucide-react";
import Image from "next/image";

export default async function MarketingDashboardPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shopId = session?.user.shopId;
  const ads = await Advertisement.find({ shopId }).sort({ createdAt: -1 });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Marketing & Offers</h1>
          <p className="text-gray-500 mt-2">Manage live gold rates and promotional banners on your storefront.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Actions / Types */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create New</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
                <TrendingUp className="w-4 h-4" /> Update Gold Rate
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Tag className="w-4 h-4 text-pink-500" /> Promo Strip
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Presentation className="w-4 h-4 text-blue-500" /> Hero Banner Ad
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Ads List */}
        <div className="md:col-span-2 space-y-4">
          {ads.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <Tag className="w-10 h-10 text-gray-300 mb-3" />
                <h3 className="font-medium text-gray-900">No active promotions</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">You don&apos;t have any banners running on your store.</p>
              </CardContent>
            </Card>
          ) : (
            ads.map((ad) => (
              <Card key={ad._id.toString()} className={!ad.isActive ? "opacity-60" : ""}>
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  {ad.imageUrl && (
                    <div className="sm:w-1/3 bg-gray-100 relative">
                      <Image src={ad.imageUrl} alt={ad.title} fill sizes="(min-width: 640px) 33vw, 100vw" unoptimized className="object-cover" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                          {ad.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ad.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="text-xs font-medium text-gray-600">{ad.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{ad.title}</h3>
                      <p className="text-sm text-gray-600 mt-2">{ad.message}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="text-xs text-gray-400">
                        {ad.validUntil ? `Valid till ${new Date(ad.validUntil).toLocaleDateString()}` : 'Runs continuously'}
                      </span>
                      <Button variant="ghost" size="sm" className="h-8 text-gray-500">Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
