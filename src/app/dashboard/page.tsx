import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Package, Eye, Heart, MessageSquare, Plus } from "lucide-react";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import Enquiry from "@/models/Enquiry";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import Interaction from "@/models/Interaction";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { GoldRateUpdater } from "@/components/admin/GoldRateUpdater";
import Image from "next/image";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getOwnerShop } from "@/lib/owner-data";
import { scheduleShopEvent } from "@/lib/realtime";
import { scheduleShopPushNotification } from "@/lib/push-notifications";
import { invalidatePublicStoreCache } from "@/lib/public-store-cache";

export default async function DashboardOverviewPage() {
  const session = await getCurrentSession();
  const shopId = session?.user.shopId;
  if (!shopId) throw new Error("Shop owner account is missing a shop");

  async function updateGoldRate(rate22k: number | null, rate24k: number | null) {
    "use server";
    const activeSession = await getServerSession(authOptions);
    if (activeSession?.user.role !== "SHOP_OWNER" || !activeSession.user.shopId) throw new Error("Unauthorized");

    const final22K = typeof rate22k === "number" && Number.isFinite(rate22k) && rate22k > 0 ? Math.round(rate22k) : null;
    const final24K = typeof rate24k === "number" && Number.isFinite(rate24k) && rate24k > 0 ? Math.round(rate24k) : null;

    await connectToDatabase();
    await Shop.findByIdAndUpdate(activeSession.user.shopId, {
      $set: {
        goldRate22K: final22K,
        goldRate24K: final24K,
      }
    }, { strict: false });
    
    // Revalidate public storefront to instantly show the new banner
    const currentShop = await Shop.findById(activeSession.user.shopId).select("slug").lean();
    if (currentShop) revalidatePath(`/shop/${currentShop.slug}`, "layout");
    revalidatePath("/dashboard");
    invalidatePublicStoreCache();
    scheduleShopEvent(activeSession.user.shopId, "shop.gold-rate.updated", "both");
    scheduleShopPushNotification(activeSession.user.shopId, "gold-rate.updated");
  }

  await connectToDatabase();
  const [shop, totalProducts, profileViews, productLikes, newEnquiries, recentEnquiries, topProducts] = await Promise.all([
    getOwnerShop(shopId),
    Product.countDocuments({ shopId }),
    AnalyticsEvent.countDocuments({ shopId, eventType: "SHOP_VIEW" }),
    Interaction.countDocuments({ shopId, interactionType: "LIKE" }),
    Enquiry.countDocuments({ shopId, status: "NEW" }),
    Enquiry.find({ shopId })
      .select("customerName message status productId createdAt")
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("productId", "name")
      .lean(),
    Product.find({ shopId })
      .select("name images viewsCount likesCount")
      .sort({ viewsCount: -1, likesCount: -1 })
      .limit(3)
      .lean(),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Your Shop Today</h1>
          <p className="mt-1 text-sm text-gray-500">Update rates, add jewellery and reply to customers.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link prefetch={true} href="/dashboard/products/create" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
          {shop?.slug && (
            <Link href={`/shop/${shop.slug}`} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" /> View Shop
            </Link>
          )}
        </div>
      </div>
      
      <GoldRateUpdater 
        initial22K={shop?.goldRate22K} 
        initial24K={shop?.goldRate24K} 
        onSave={updateGoldRate} 
      />
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Products</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{profileViews}</div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              Shop visits · last 90 days
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Product Likes</CardTitle>
            <Heart className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{productLikes}</div>
            <p className="text-xs text-gray-500 mt-1">Saved products</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">New Enquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{newEnquiries}</div>
            <p className="text-xs text-gray-500 mt-1">Need a reply</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="md:col-span-1 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Recent Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEnquiries.length === 0 ? (
              <div className="text-sm text-gray-500 flex h-32 items-center justify-center border-2 border-dashed rounded-md">
                No recent enquiries to display.
              </div>
            ) : (
              <div className="space-y-4">
                {recentEnquiries.map(enq => (
                  <div key={enq._id.toString()} className="flex justify-between items-center pb-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{enq.customerName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{enq.message}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{enq.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-1 lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-sm text-gray-500 flex h-32 items-center justify-center border-2 border-dashed rounded-md">
                Add products to see performance.
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map(prod => (
                  <div key={prod._id.toString()} className="flex items-center gap-3 pb-2 border-b last:border-0">
                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                      {prod.images?.[0] && <Image src={prod.images[0]} alt={prod.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 line-clamp-1">{prod.name}</p>
                      <p className="text-xs text-gray-500">{prod.viewsCount} views • {prod.likesCount} likes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
