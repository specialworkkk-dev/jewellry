import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/ui/media-uploader";
import { updateShopSettings } from "./actions";

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();
  
  const shop = await Shop.findById((session?.user as any).shopId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop Settings</h1>
        <p className="text-gray-500 mt-2">Manage your public storefront profile, visuals, and contact information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual Assets</CardTitle>
          <CardDescription>Upload your brand logo and a beautiful cover image for the hero section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">Shop Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full border flex items-center justify-center overflow-hidden">
                  {shop?.logoUrl ? (
                    <img src={shop.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Logo</span>
                  )}
                </div>
                {/* Note: This is a Server Component, so we would normally pass the publicUrl up via a client-side form submission. We are rendering the Uploader just to show the layout. */}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">Cover Banner</label>
              <div className="w-full h-24 bg-gray-100 rounded-md border flex items-center justify-center overflow-hidden">
                  {shop?.coverUrl ? (
                    <img src={shop.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Cover Image</span>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Update your public contact details and description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateShopSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Shop Name</label>
                <input type="text" defaultValue={shop?.name} className="w-full px-3 py-2 border rounded-md" disabled />
                <p className="text-xs text-gray-500">Contact admin to change shop name.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Short Description</label>
                <input name="shortDescription" type="text" defaultValue={shop?.shortDescription} placeholder="e.g. Premium Gold & Diamond Jewellery" className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">WhatsApp Number</label>
                <input name="whatsappNumber" type="text" defaultValue={shop?.whatsappNumber} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Instagram URL</label>
                <input name="instagramUrl" type="url" defaultValue={shop?.instagramUrl} placeholder="https://instagram.com/..." className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Physical Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Street Address</label>
                  <input name="address" type="text" defaultValue={shop?.address} placeholder="123 Gold Market, Main Street" className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">City</label>
                  <input name="city" type="text" defaultValue={shop?.city} placeholder="Mumbai" className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="space-y-2 flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input name="state" type="text" defaultValue={shop?.state} placeholder="MH" className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                    <input name="pincode" type="text" defaultValue={shop?.pincode} placeholder="400001" className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
