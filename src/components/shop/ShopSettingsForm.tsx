"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import dynamic from "next/dynamic";
import { updateShopSettings } from "@/app/dashboard/settings/actions";
import { AtSign, Check, Copy, LoaderCircle, LogOut, MessageCircle, Share2, Users } from "lucide-react";
import { LanguageSwitcher, useLocale } from "@/i18n/useLocale";

const MediaUploader = dynamic(
  () => import("@/components/ui/media-uploader").then((module) => module.MediaUploader),
  {
    ssr: false,
    loading: () => <div className="h-11 animate-pulse rounded-md border bg-gray-50" aria-label="Loading uploader" />,
  },
);

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
  const [publicShopUrl, setPublicShopUrl] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    if (!shop?.slug) return;
    const timeout = window.setTimeout(() => {
      setPublicShopUrl(`${window.location.origin}/shop/${shop.slug}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [shop?.slug]);

  const readableShopUrl = publicShopUrl ? publicShopUrl.replace(/^https?:\/\//, "") : "";
  const invitationTitle = `${shop?.name || "Our Jewellery Store"} — Premium Jewellery Collection`;
  const invitationBody = shop?.shortDescription
    || "Discover our latest jewellery designs, live gold rates and curated collections.";
  const shopShareText = publicShopUrl
    ? `✨ *${invitationTitle}*\n\n${invitationBody}\n\nExplore our collection and enquire directly on WhatsApp.\n\n💛 View the digital showroom:\n${publicShopUrl}`
    : `${invitationTitle}\n\n${invitationBody}`;

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
      title: invitationTitle,
      text: `${invitationBody}\n\nExplore our collection and enquire directly on WhatsApp.`,
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

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await signOut({ callbackUrl: "/login" });
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t("shopSettings")}</h1>
          <p className="text-gray-500 mt-2">{t("shopSettingsDescription")}</p>
        </div>
        <LanguageSwitcher className="min-h-11 shrink-0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual Assets</CardTitle>
          <CardDescription>Upload your brand logo and a beautiful cover image for the hero section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="min-w-0 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Shop Logo</label>
              <div className="flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
                <div className="h-20 w-20 shrink-0 bg-gray-100 rounded-full border flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={80} height={80} sizes="80px" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Logo</span>
                  )}
                </div>
                <div className="min-w-0 w-full flex-1"><MediaUploader folder="logos" onUploadSuccess={(publicUrl) => setLogoUrl(publicUrl)} /></div>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Cover Banner</label>
              <div className="aspect-[16/7] w-full overflow-hidden rounded-xl border bg-gray-100 flex items-center justify-center">
                {coverUrl ? (
                  <Image src={coverUrl} alt="Cover" width={640} height={96} sizes="(max-width: 768px) 100vw, 640px" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs">No Cover Image</span>
                )}
              </div>
              <div>
                <MediaUploader folder="covers" onUploadSuccess={(publicUrl) => setCoverUrl(publicUrl)} />
                <p className="mt-2 text-xs text-gray-500">Recommended: wide landscape photo, at least 1200 × 525 pixels.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("publicStoreLink")}</CardTitle>
          <CardDescription>{t("publicStoreLinkDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative isolate overflow-hidden rounded-2xl bg-stone-950 p-5 text-white shadow-xl sm:p-6">
            {coverUrl && (
              <Image src={coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 800px" className="-z-20 object-cover opacity-30" />
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950 via-stone-950/90 to-amber-950/45" />
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400 bg-stone-900 text-lg font-bold text-amber-300">
                {logoUrl ? (
                  <Image src={logoUrl} alt="" width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                ) : (
                  (shop?.name || "L").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.22em] text-amber-300">Your customer share preview</p>
                <h3 className="mt-1 break-words font-serif text-xl font-semibold sm:text-2xl">{shop?.name || "Your Jewellery Store"}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-300">{invitationBody}</p>
              </div>
            </div>
            <div className="mt-5 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="min-w-0 truncate text-xs text-stone-400">{readableShopUrl || t("shopUrlPlaceholder")}</span>
              <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950">Explore collection</span>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">{t("shopUrl")}</p>
                <p className="text-sm sm:text-base text-gray-900 break-all font-medium">{readableShopUrl || t("shopUrlPlaceholder")}</p>
              </div>
              <Button type="button" variant="outline" onClick={handleCopyLink} className="min-h-11 w-full shrink-0 gap-2 sm:w-auto">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t("copied") : t("copyLink")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <a href={whatsappShareUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <MessageCircle className="w-4 h-4" /> {t("whatsapp")}
            </a>
            <a href={shop?.instagramUrl || "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700">
              <AtSign className="w-4 h-4" /> {t("instagram")}
            </a>
            <a href={shop?.facebookUrl || "https://www.facebook.com/"} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Users className="w-4 h-4" /> {t("facebook")}
            </a>
            <Button type="button" variant="outline" onClick={handleShareLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Share2 className="w-4 h-4" /> {t("shareLink")}
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
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                <input type="text" defaultValue={shop?.name} title={shop?.name} className="block min-h-11 w-full min-w-0 truncate px-3 py-2 border rounded-md text-base sm:text-sm" disabled />
                <p className="text-xs text-gray-500">Contact admin to change shop name.</p>
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Short Description</label>
                <input name="shortDescription" type="text" defaultValue={shop?.shortDescription} placeholder="e.g. Premium Gold & Diamond Jewellery" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                <input name="whatsappNumber" type="text" defaultValue={shop?.whatsappNumber} className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Instagram URL</label>
                <input name="instagramUrl" type="url" defaultValue={shop?.instagramUrl} placeholder="https://instagram.com/..." className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Facebook URL</label>
                <input name="facebookUrl" type="url" defaultValue={shop?.facebookUrl} placeholder="https://facebook.com/..." className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Website URL</label>
                <input name="websiteUrl" type="url" defaultValue={shop?.websiteUrl} placeholder="https://yourwebsite.com" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Physical Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0 space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input name="address" type="text" defaultValue={shop?.address} placeholder="123 Gold Market, Main Street" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input name="city" type="text" defaultValue={shop?.city} placeholder="Mumbai" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input name="state" type="text" defaultValue={shop?.state} placeholder="MH" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <input name="pincode" type="text" defaultValue={shop?.pincode} placeholder="400001" className="block min-h-11 w-full min-w-0 px-3 py-2 border rounded-md text-base sm:text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <ActionSubmitButton pendingLabel="Saving changes…" className="min-h-11 w-full sm:w-auto">Save Changes</ActionSubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-100 bg-red-50/30">
        <CardHeader>
          <CardTitle>Account Access</CardTitle>
          <CardDescription>Sign out securely from the shop owner dashboard on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            onClick={handleSignOut}
            className="min-h-11 w-full justify-center gap-2 border border-red-200 px-5 sm:w-auto"
          >
            {isSigningOut ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
