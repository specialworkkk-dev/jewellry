import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, Heart, MessageSquare } from "lucide-react";
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

export default async function DashboardOverviewPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shopId = (session?.user as any).shopId;
  const shop = await Shop.findById(shopId).lean();

  async function updateGoldRate(arg1: any, arg2: any) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) throw new Error("Unauthorized");
    
    let final22K = null;
    let final24K = null;

    // Handle Next.js HMR bug where old client code sends FormData
    if (arg1 && typeof arg1.get === 'function') {
      const r22 = arg1.get("rate22k")?.toString();
      const r24 = arg1.get("rate24k")?.toString();
      final22K = r22 ? parseInt(r22) : null;
      final24K = r24 ? parseInt(r24) : null;
    } else {
      final22K = arg1 ? parseInt(arg1.toString()) : null;
      final24K = arg2 ? parseInt(arg2.toString()) : null;
    }

    await connectToDatabase();
    await Shop.findByIdAndUpdate(session.user.shopId, {
      $set: {
        goldRate22K: final22K,
        goldRate24K: final24K,
      }
    }, { strict: false });
    
    // Revalidate public storefront to instantly show the new banner
    const currentShop = await Shop.findById(session.user.shopId).lean();
    revalidatePath(`/shop/${currentShop.slug}`, "layout");
    revalidatePath("/dashboard");
  }

  // Real Database Metrics
  const totalProducts = await Product.countDocuments({ shopId });
  const profileViews = await AnalyticsEvent.countDocuments({ shopId, eventType: 'SHOP_VIEW' });
  const productLikes = await Interaction.countDocuments({ shopId, interactionType: 'LIKE' });
  const newEnquiries = await Enquiry.countDocuments({ shopId, status: 'NEW' });
  
  const recentEnquiries = await Enquiry.find({ shopId })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('productId', 'name');

  const topProducts = await Product.find({ shopId })
    .sort({ viewsCount: -1, likesCount: -1 })
    .limit(3);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
      </div>
      
      <GoldRateUpdater 
        initial22K={shop?.goldRate22K} 
        initial24K={shop?.goldRate24K} 
        onSave={updateGoldRate} 
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Live catalog items</p>
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
              Total lifetime views
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
            <p className="text-xs text-gray-500 mt-1">Across all products</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">New Enquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{newEnquiries}</div>
            <p className="text-xs text-gray-500 mt-1">Require response</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-4 shadow-sm">
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
        <Card className="col-span-3 shadow-sm">
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
                      {prod.images?.[0] && <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />}
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
