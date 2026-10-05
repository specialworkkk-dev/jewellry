"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/ui/media-uploader";
import { updateShopSettings } from "@/app/dashboard/settings/actions";
import { AtSign, Check, Copy, MessageCircle, Share2, Users } from "lucide-react";

type ShopSettings = {
  slug?: string;
  logoUrl?: string;
  coverUrl?: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  name?: string;
  shortDescription?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export function ShopSettingsForm({ shop }: { shop?: ShopSettings }) {
  const [logoUrl, setLogoUrl] = useState(shop?.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(shop?.coverUrl ?? "");
  const [copied, setCopied] = useState(false);

  const publicShopUrl = shop?.slug && typeof window !== "undefined"
    ? `${window.location.origin}/shop/${shop.slug}`
    : "";

  const readableShopUrl = publicShopUrl ? publicShopUrl.replace(/^https?:\/\//, "") : "";
  const shopShareText = publicShopUrl ? `Visit my jewellery shop: ${publicShopUrl}` : "Visit my jewellery shop";

  const whatsappShareUrl = shop?.whatsappNumber
    ? `https://wa.me/${shop.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(shopShareText)}`
    : `https://wa.me/?text=${encodeURIComponent(shopShareText)}`;

  const handleCopyLink = async () => {
    if (!publicShopUrl) return;
    try {
      await navigator.clipboard.writeText(publicShopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op: browser may block clipboard access
    }
  };

  const handleShareLink = async () => {
    if (!publicShopUrl) return;

    const sharePayload = {
      title: "My Jewellery Shop",
      text: shopShareText,
      url: publicShopUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }
    } catch {
      // Fall back to WhatsApp when the system share sheet is cancelled or unsupported.
    }

    window.open(whatsappShareUrl, "_blank", "noopener,noreferrer");
  };

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
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-gray-400 text-xs">No Logo</span>
                  )}
                </div>
                <MediaUploader folder="logos" onUploadSuccess={(publicUrl) => setLogoUrl(publicUrl)} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">Cover Banner</label>
              <div className="w-full h-24 bg-gray-100 rounded-md border flex items-center justify-center overflow-hidden">
                {coverUrl ? (
                  <Image src={coverUrl} alt="Cover" width={640} height={96} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span className="text-gray-400 text-xs">No Cover Image</span>
                )}
              </div>
              <MediaUploader folder="covers" onUploadSuccess={(publicUrl) => setCoverUrl(publicUrl)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Store Link</CardTitle>
          <CardDescription>Share this unique storefront URL with customers, and post it across your social channels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Shop URL</p>
                <p className="text-sm sm:text-base text-gray-900 break-all font-medium">{readableShopUrl || "Your shop link will appear here"}</p>
              </div>
              <Button type="button" variant="outline" onClick={handleCopyLink} className="shrink-0 gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={whatsappShareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a href={shop?.instagramUrl || "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700">
              <AtSign className="w-4 h-4" /> Instagram
            </a>
            <a href={shop?.facebookUrl || "https://www.facebook.com/"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Users className="w-4 h-4" /> Facebook
            </a>
            <Button type="button" variant="outline" onClick={handleShareLink} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Share2 className="w-4 h-4" /> Share Link
            </Button>
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
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <input type="hidden" name="coverUrl" value={coverUrl} />

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
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Facebook URL</label>
                <input name="facebookUrl" type="url" defaultValue={shop?.facebookUrl} placeholder="https://facebook.com/..." className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Website URL</label>
                <input name="websiteUrl" type="url" defaultValue={shop?.websiteUrl} placeholder="https://yourwebsite.com" className="w-full px-3 py-2 border rounded-md" />
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
