"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCategoriesAction, getProductMediaPolicyAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/ui/media-uploader";
import Link from "next/link";
import { ArrowLeft, Loader2, Video, X } from "lucide-react";

interface CategoryOption {
  _id: string;
  name: string;
}

interface MediaPolicy {
  videoUploadsEnabled: boolean;
  maxVideoDurationSeconds: number;
  maxVideosPerDay: number;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  
  const [goldPurity, setGoldPurity] = useState("");
  const [goldWeight, setGoldWeight] = useState("");
  const [diamondWeight, setDiamondWeight] = useState("");
  const [stoneType, setStoneType] = useState("");
  
  const [priceType, setPriceType] = useState("FIXED_PRICE");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [mediaPolicy, setMediaPolicy] = useState<MediaPolicy | null>(null);
  
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const data = await getCategoriesAction() as CategoryOption[];
        const policy = await getProductMediaPolicyAction();
        if (cancelled) return;
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0]._id);
        setMediaPolicy(policy);
      } catch {
        if (!cancelled) setError("Unable to load shop media permissions. Refresh and try again.");
      }
    };
    void loadOptions();
    return () => { cancelled = true; };
  }, []);

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
    if (!name || !sku) {
      setError("Name and SKU are required.");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku,
          description,
          categoryId,
          priceType,
          price: price ? parseFloat(price) : 0,
          ...(goldPurity ? { goldPurity } : {}),
          goldWeight: goldWeight ? parseFloat(goldWeight) : 0,
          diamondWeight: diamondWeight ? parseFloat(diamondWeight) : 0,
          stoneType,
          images,
          videos,
          isPublished: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="icon" type="button" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 break-words">Add Product</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Create a new jewellery piece for your catalog.</p>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-sm sm:text-base">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save & Publish Product
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
                  className="w-full px-3 py-2 border rounded-md" 
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
                    className="w-full px-3 py-2 border rounded-md" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md bg-white"
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
                  className="w-full px-3 py-2 border rounded-md"
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
                    className="w-full px-3 py-2 border rounded-md bg-white"
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
                    className="w-full px-3 py-2 border rounded-md" 
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
                    className="w-full px-3 py-2 border rounded-md" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stone Type</label>
                  <input 
                    type="text" 
                    value={stoneType}
                    onChange={(e) => setStoneType(e.target.value)}
                    placeholder="e.g. Ruby, Emerald" 
                    className="w-full px-3 py-2 border rounded-md" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="FIXED_PRICE">Fixed Price</option>
                  <option value="STARTING_FROM">Starting From</option>
                  <option value="PRICE_ON_REQUEST">Price on Request</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (₹)</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" 
                  className="w-full px-3 py-2 border rounded-md" 
                />
              </div>
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
                    <Image src={url} alt="Product" fill className="object-cover" unoptimized />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-4 h-4" />
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
                    className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow"
                  >
                    <X className="h-4 w-4" />
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
