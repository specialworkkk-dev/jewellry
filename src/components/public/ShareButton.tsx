"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Check, MessageCircle, Globe, AtSign, Copy } from "lucide-react";

interface ShareButtonProps {
  title?: string;
  text?: string;
}

export function ShareButton({ title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";
  const shareText = text || "Discover this premium jewellery collection, curated especially for you.";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside as unknown as EventListener, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as unknown as EventListener);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch {
      setIsOpen(false);
    }
  };

  const openShare = (target: "whatsapp" | "facebook" | "instagram") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(`✨ ${title || "Premium Jewellery Store"}\n\n${shareText}\n\nView the collection:`);

    const urls = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      instagram: "https://www.instagram.com/",
    };

    const finalUrl = urls[target];
    if (target === "instagram") {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    window.open(finalUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handlePrimaryShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to the explicit share menu when user cancels.
      }
    }

    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handlePrimaryShare}
        aria-label="Share this shop"
        aria-expanded={isOpen}
        className="flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gray-100 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 sm:w-auto sm:px-4"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
        <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50">
          <button type="button" onClick={() => openShare("whatsapp")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button type="button" onClick={() => openShare("facebook")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            <Globe className="w-4 h-4" /> Facebook
          </button>
          <button type="button" onClick={() => openShare("instagram")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700">
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
