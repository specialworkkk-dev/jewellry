"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";

export function ProductCardFavorite({ productId, shopId, initialSaved }: { productId: string; shopId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    const previous = saved;
    setSaved(!previous);
    setLoading(true);
    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: productId, targetType: "PRODUCT", interactionType: "LIKE", shopId }),
      });
      const data = await response.json() as { state?: boolean };
      if (!response.ok) throw new Error("Save failed");
      if (typeof data.state === "boolean") setSaved(data.state);
    } catch {
      setSaved(previous);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from saved products" : "Save product"}
      aria-pressed={saved}
      className={`absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition sm:right-3 sm:top-3 ${saved ? "border-rose-200 bg-rose-50 text-rose-600" : "border-white/60 bg-white/90 text-stone-700 hover:text-rose-600"}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />}
    </button>
  );
}
