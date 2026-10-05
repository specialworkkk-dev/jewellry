"use client";

import { useState } from "react";
import { Heart, Share2, Check, MessageCircle, Globe, AtSign, Copy } from "lucide-react";

interface ProductActionButtonsProps {
  productName: string;
}

export function ProductActionButtons({ productName }: ProductActionButtonsProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

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

  return (
    <div className="flex items-center gap-2 relative">
      <button
        type="button"
        aria-label={isLiked ? "Unlike product" : "Like product"}
        aria-pressed={isLiked}
        onClick={() => setIsLiked((prev) => !prev)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isLiked
            ? 'bg-rose-100 text-rose-500'
            : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-500'
        }`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current stroke-current' : 'stroke-current'}`} />
      </button>

      <button
        onClick={handleShare}
        title="Share Product"
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
      </button>

      {isShareMenuOpen && (
        <div className="absolute right-0 top-12 z-10 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <button type="button" onClick={() => openShareTarget("whatsapp")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button type="button" onClick={() => openShareTarget("facebook")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            <Globe className="w-4 h-4" /> Facebook
          </button>
          <button type="button" onClick={() => openShareTarget("instagram")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700">
            <AtSign className="w-4 h-4" /> Instagram
          </button>
          <button type="button" onClick={copyLink} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Copy className="w-4 h-4" /> Copy Link
          </button>
        </div>
      )}
    </div>
  );
}
