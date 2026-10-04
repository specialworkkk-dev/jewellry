"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCategoriesAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/ui/media-uploader";
import Link from "next/link";
import { ArrowLeft, Loader2, X } from "lucide-react";

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
  
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState(""); 

  useEffect(() => {
    getCategoriesAction().then(data => {
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0]._id);
    });
  }, []);

  const handleUploadSuccess = (publicUrl: string) => {
    setImages((prev) => [...prev, publicUrl]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
          isPublished: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add Product</h1>
            <p className="text-gray-500 mt-1">Create a new jewellery piece for your catalog.</p>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save & Publish Product
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-2 gap-2">
                {images.map((url, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden border aspect-square">
                    <img src={url} alt="Product" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <MediaUploader folder="products" onUploadSuccess={handleUploadSuccess} />
              
            </CardContent>
          </Card>
          
        </div>
      </div>
    </form>
  );
}
