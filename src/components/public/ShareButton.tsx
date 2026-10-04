"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title?: string;
  text?: string;
}

export function ShareButton({ title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          text: text || "Check out this amazing jewellery store!",
          url: url,
        });
      } catch (err) {
        // User cancelled share or it failed
        console.log("Share cancelled or failed", err);
      }
    } else {
      // Fallback for desktop: Copy to clipboard
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
    <button 
      onClick={handleShare}
      className="flex-1 sm:flex-none justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-full transition-colors flex items-center gap-2"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />} 
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
