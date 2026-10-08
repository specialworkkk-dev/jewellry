"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Loader2, Video, X } from "lucide-react";
import { calculateDiscountedAmount, type DiscountType } from "@/lib/product-pricing";

const MediaUploader = dynamic(
  () => import("@/components/ui/media-uploader").then((module) => module.MediaUploader),
  {
    ssr: false,
    loading: () => <div className="h-11 animate-pulse rounded-md border bg-gray-50" aria-label="Loading uploader" />,
  },
);

interface CategoryOption {
  _id: string;
  name: string;
}

interface MediaPolicy {
  videoUploadsEnabled: boolean;
  maxVideoDurationSeconds: number;
  maxVideosPerDay: number;
}

interface InitialProduct {
  id: string; name: string; sku: string; description: string; categoryId: string;
  goldPurity: string; goldWeight: string; diamondWeight: string; stoneType: string;
  priceType: string; price: string; discountType: DiscountType; discountValue: string;
  makingCharges: string; makingChargesDiscountType: DiscountType; makingChargesDiscountValue: string;
  images: string[]; videos: string[]; isPublished: boolean;
}

export function ProductEditForm({ initial, categories, mediaPolicy }: {
  initial: InitialProduct; categories: CategoryOption[]; mediaPolicy: MediaPolicy;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(initial.name);
  const [sku, setSku] = useState(initial.sku);
  const [description, setDescription] = useState(initial.description);
  const [goldPurity, setGoldPurity] = useState(initial.goldPurity);
  const [goldWeight, setGoldWeight] = useState(initial.goldWeight);
  const [diamondWeight, setDiamondWeight] = useState(initial.diamondWeight);
  const [stoneType, setStoneType] = useState(initial.stoneType);
  const [priceType, setPriceType] = useState(initial.priceType);
  const [price, setPrice] = useState(initial.price);
  const [discountType, setDiscountType] = useState<DiscountType>(initial.discountType);
  const [discountValue, setDiscountValue] = useState(initial.discountValue);
  const [makingCharges, setMakingCharges] = useState(initial.makingCharges);
  const [makingChargesDiscountType, setMakingChargesDiscountType] = useState<DiscountType>(initial.makingChargesDiscountType);
  const [makingChargesDiscountValue, setMakingChargesDiscountValue] = useState(initial.makingChargesDiscountValue);
  const [images, setImages] = useState<string[]>(initial.images);
  const [videos, setVideos] = useState<string[]>(initial.videos);
  const [categoryId, setCategoryId] = useState(initial.categoryId);

  const handleUploadSuccess = (publicUrl: string) => {
    setImages((prev) => [...prev, publicUrl]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoUploadSuccess = (publicUrl: string) => {
    setVideos((prev) => prev.length >= 4 ? prev : [...prev, publicUrl]);
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const onRequest = priceType === "PRICE_ON_REQUEST" || priceType === "CONTACT_FOR_PRICE";
    if (!name || !sku) {
      setError("Name and SKU are required.");
      return;
    }
    const numericPrice = price ? Number(price) : 0;
    const numericDiscount = discountValue ? Number(discountValue) : 0;
    const numericMakingCharges = makingCharges ? Number(makingCharges) : 0;
    const numericMakingDiscount = makingChargesDiscountValue ? Number(makingChargesDiscountValue) : 0;
    if (!onRequest && numericPrice <= 0) {
      setError("Enter a price for fixed or starting-from pricing.");
      return;
    }
    if (numericDiscount > 0 && numericPrice <= 0) {
      setError("Enter a product price before adding a main discount.");
      return;
    }
    if (numericMakingDiscount > 0 && numericMakingCharges <= 0) {
      setError("Enter making charges before adding a making-charge discount.");
      return;
    }
    if (discountType === "PERCENTAGE" && numericDiscount > 100) {
      setError("Main percentage discount cannot exceed 100%.");
      return;
    }
    if (discountType === "FIXED_AMOUNT" && numericDiscount > numericPrice) {
      setError("Main fixed discount cannot exceed the product price.");
      return;
    }
    if (makingChargesDiscountType === "PERCENTAGE" && numericMakingDiscount > 100) {
      setError("Making-charge percentage discount cannot exceed 100%.");
      return;
    }
    if (makingChargesDiscountType === "FIXED_AMOUNT" && numericMakingDiscount > numericMakingCharges) {
      setError("Making-charge fixed discount cannot exceed making charges.");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku,
          description,
          categoryId,
          priceType,
          price: !onRequest && price ? numericPrice : undefined,
          discountType,
          discountValue: numericDiscount,
          makingCharges: makingCharges ? numericMakingCharges : undefined,
          makingChargesDiscountType,
          makingChargesDiscountValue: numericMakingDiscount,
          goldPurity,
          goldWeight: goldWeight ? parseFloat(goldWeight) : 0,
          diamondWeight: diamondWeight ? parseFloat(diamondWeight) : 0,
          stoneType,
          images,
          videos,
          isPublished: initial.isPublished,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update product");
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product");
      setIsSubmitting(false);
    }
  };

  const pricePreview = calculateDiscountedAmount(Number(price) || 0, discountType, Number(discountValue) || 0);
  const makingChargesPreview = calculateDiscountedAmount(
    Number(makingCharges) || 0,
    makingChargesDiscountType,
    Number(makingChargesDiscountValue) || 0,
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link prefetch={true} href="/dashboard/products">
            <Button variant="ghost" size="icon" type="button" aria-label="Back to products" className="size-10 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 break-words">Edit Product</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Update this jewellery piece. Changes go live immediately if published.</p>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full sm:w-auto text-sm sm:text-base">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
        <div className="xl:col-span-2 space-y-5 sm:space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bridal Diamond Necklace" 
                  className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU *</label>
                  <input 
                    type="text" 
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. BDN-001" 
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md bg-white"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  rows={4} 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the jewellery..." 
                  className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Jewellery Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Jewellery Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gold Purity</label>
                  <select 
                    value={goldPurity}
                    onChange={(e) => setGoldPurity(e.target.value)}
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md bg-white"
                  >
                    <option value="">Select Purity</option>
                    <option value="14K">14K</option>
                    <option value="18K">18K</option>
                    <option value="22K">22K</option>
                    <option value="24K">24K</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gold Weight (grams)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={goldWeight}
                    onChange={(e) => setGoldWeight(e.target.value)}
                    placeholder="0.00" 
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Diamond Weight (carats)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={diamondWeight}
                    onChange={(e) => setDiamondWeight(e.target.value)}
                    placeholder="0.00" 
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stone Type</label>
                  <input 
                    type="text" 
                    value={stoneType}
                    onChange={(e) => setStoneType(e.target.value)}
                    placeholder="e.g. Ruby, Emerald" 
                    className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Type</label>
                <select 
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                  className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md bg-white"
                >
                  <option value="FIXED_PRICE">Fixed Price</option>
                  <option value="STARTING_FROM">Starting From</option>
                  <option value="PRICE_ON_REQUEST">Price on Request</option>
                  <option value="CONTACT_FOR_PRICE">Contact for Price</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (₹)</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" 
                  className="w-full min-h-11 min-w-0 px-3 py-2 text-base sm:text-sm border rounded-md" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Main Discount</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <select
                    value={discountType}
                    onChange={(event) => setDiscountType(event.target.value as DiscountType)}
                    className="min-h-11 w-full min-w-0 rounded-md border bg-white px-3 text-base sm:text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed amount (₹)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max={discountType === "PERCENTAGE" ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 1000"}
                    aria-label="Main discount value"
                    className="min-h-11 w-full min-w-0 rounded-md border px-3 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Making Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={makingCharges}
                  onChange={(event) => setMakingCharges(event.target.value)}
                  placeholder="0.00"
                  className="min-h-11 w-full min-w-0 rounded-md border px-3 text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Making Charges Discount</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <select
                    value={makingChargesDiscountType}
                    onChange={(event) => setMakingChargesDiscountType(event.target.value as DiscountType)}
                    className="min-h-11 w-full min-w-0 rounded-md border bg-white px-3 text-base sm:text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed amount (₹)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max={makingChargesDiscountType === "PERCENTAGE" ? 100 : undefined}
                    step="0.01"
                    value={makingChargesDiscountValue}
                    onChange={(event) => setMakingChargesDiscountValue(event.target.value)}
                    placeholder={makingChargesDiscountType === "PERCENTAGE" ? "e.g. 25" : "e.g. 500"}
                    aria-label="Making charges discount value"
                    className="min-h-11 w-full min-w-0 rounded-md border px-3 text-base sm:text-sm"
                  />
                </div>
              </div>
              {(Number(price) > 0 || Number(makingCharges) > 0) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                  <p className="font-bold">Discount preview</p>
                  {Number(price) > 0 && <p className="mt-1">Product price after discount: ₹{pricePreview.toLocaleString("en-IN")}</p>}
                  {Number(makingCharges) > 0 && <p>Making charges after discount: ₹{makingChargesPreview.toLocaleString("en-IN")}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Upload high quality images.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {images.map((url, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden border aspect-square">
                    <Image src={url} alt="Product" fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                      className="absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center opacity-100 transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <span className="rounded-full bg-red-500 p-1.5 text-white shadow"><X className="w-4 h-4" /></span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="w-full">
                <MediaUploader folder="products" onUploadSuccess={handleUploadSuccess} />
              </div>
              
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-violet-600" /> Product Videos</CardTitle>
              <CardDescription>
                {!mediaPolicy
                  ? "Loading video permissions…"
                  : mediaPolicy.videoUploadsEnabled
                  ? `Add short product reels up to ${mediaPolicy.maxVideoDurationSeconds} seconds. Daily allowance: ${mediaPolicy.maxVideosPerDay}.`
                  : "Video uploads are disabled for this shop. Contact the platform admin to enable them."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {videos.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border bg-black">
                  <video src={url} controls playsInline preload="metadata" className="aspect-video w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    aria-label={`Remove video ${index + 1}`}
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center"
                  >
                    <span className="rounded-full bg-red-600 p-1.5 text-white shadow"><X className="h-4 w-4" /></span>
                  </button>
                </div>
              ))}
              {mediaPolicy?.videoUploadsEnabled && videos.length < 4 && (
                <MediaUploader
                  folder="products"
                  mediaType="video"
                  maxVideoDurationSeconds={mediaPolicy.maxVideoDurationSeconds}
                  onUploadSuccess={handleVideoUploadSuccess}
                />
              )}
              {videos.length >= 4 && <p className="text-sm text-gray-500">Maximum four videos per product.</p>}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </form>
  );
}
