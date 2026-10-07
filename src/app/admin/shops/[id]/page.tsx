import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShopLimitsForm, type ShopFormValues } from "./ShopLimitsForm";
import { isObjectId } from "@/lib/validation";
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

  const formShop: ShopFormValues = {
    id: shop._id.toString(),
    maxProducts: shop.maxProducts ?? 50,
    maxPhotosPerDay: shop.maxPhotosPerDay ?? 30,
    maxVideosPerDay: shop.maxVideosPerDay ?? 2,
    videoUploadsEnabled: shop.videoUploadsEnabled === true,
    maxVideoDurationSeconds: shop.maxVideoDurationSeconds ?? 30,
    maxLinkOpens: shop.maxLinkOpens ?? 500,
    currentLinkOpens: shop.currentLinkOpens || 0,
    isActive: Boolean(shop.isActive),
    isApproved: Boolean(shop.isApproved),
    planPrice: Number(shop.planPrice ?? 0),
    planEndsAt: shop.planEndsAt ? new Date(shop.planEndsAt).toISOString().slice(0, 10) : "",
  };

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

      <ShopLimitsForm shop={formShop} />
    </div>
  );
}
