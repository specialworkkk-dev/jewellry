"use client";

import { useState } from "react";
import { Heart, Share2, Check, MessageCircle, Globe, AtSign, Copy } from "lucide-react";

interface ProductActionButtonsProps {
  productName: string;
  productId: string;
  shopId: string;
  initialLiked?: boolean;
  initialLikesCount?: number;
}

export function ProductActionButtons({
  productName,
  productId,
  shopId,
  initialLiked = false,
  initialLikesCount = 0,
}: ProductActionButtonsProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [copied, setCopied] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState("");

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} on our store!`,
          url,
        });
        return;
      } catch {
        // Fall through to direct platform options.
      }
    }

    setIsShareMenuOpen((prev) => !prev);
  };

  const openShareTarget = (target: "whatsapp" | "facebook" | "instagram") => {
    const url = window.location.href;
    const encodedUrl = encodeURIComponent(url);
    const text = encodeURIComponent(`Check out ${productName} on our store!`);

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      instagram: "https://www.instagram.com/",
    };

    window.open(shareUrls[target], "_blank", "noopener,noreferrer");
    setIsShareMenuOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsShareMenuOpen(false);
    } catch {
      setIsShareMenuOpen(false);
    }
  };

  const handleLikeToggle = async () => {
    if (isLiking) return;

    const nextLiked = !isLiked;
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(nextLiked);
    setLikesCount((count) => (nextLiked ? count + 1 : Math.max(0, count - 1)));
    setIsLiking(true);
    setLikeError("");

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: productId,
          targetType: "PRODUCT",
          interactionType: "LIKE",
          shopId,
        }),
      });

      const result = await res.json() as { error?: string; state?: boolean; likesCount?: number };
      if (!res.ok) throw new Error(result.error || "Unable to save this product");

      if (typeof result.state === "boolean") setIsLiked(result.state);
      if (typeof result.likesCount === "number") setLikesCount(result.likesCount);
    } catch (error: unknown) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      setLikeError(error instanceof Error ? error.message : "Unable to update like");
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        aria-label={isLiked ? "Remove from saved products" : "Save product"}
        aria-pressed={isLiked}
        onClick={handleLikeToggle}
        disabled={isLiking}
        className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${
          isLiked
            ? 'bg-rose-100 text-rose-500'
            : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-500'
        } ${isLiking ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current stroke-current' : 'stroke-current'}`} />
      </button>
      <span className="text-xs font-medium text-gray-500" aria-label={`${likesCount} saves`}>{likesCount}</span>
      {likeError && <span role="alert" className="absolute right-0 top-12 z-20 w-40 max-w-[calc(100vw-2rem)] rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg">{likeError}</span>}

      <button
        type="button"
        onClick={handleShare}
        title="Share Product"
        aria-label="Share product"
        aria-expanded={isShareMenuOpen}
        className="h-11 w-11 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
      </button>

      {isShareMenuOpen && (
        <div className="absolute right-0 top-12 z-10 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <button type="button" onClick={() => openShareTarget("whatsapp")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button type="button" onClick={() => openShareTarget("facebook")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            <Globe className="w-4 h-4" /> Facebook
          </button>
          <button type="button" onClick={() => openShareTarget("instagram")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700">
            <AtSign className="w-4 h-4" /> Instagram
          </button>
          <button type="button" onClick={copyLink} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Copy className="w-4 h-4" /> Copy Link
          </button>
        </div>
      )}
    </div>
  );
}
