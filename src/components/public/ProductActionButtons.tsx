"use client";

import { useState } from "react";
import { Heart, Share2, Check } from "lucide-react";

interface ProductActionButtonsProps {
  productName: string;
}

export function ProductActionButtons({ productName }: ProductActionButtonsProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} on our store!`,
          url: url,
        });
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setIsLiked(!isLiked)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isLiked 
            ? 'bg-rose-100 text-rose-500' 
            : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-500'
        }`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
      </button>
      
      <button 
        onClick={handleShare}
        title="Share Product"
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
