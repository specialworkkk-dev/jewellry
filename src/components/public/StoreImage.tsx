"use client";

import { useState } from "react";
import Image from "next/image";
import { isVariantUrl, thumbUrlFor } from "@/lib/media-url";

const defaultFallback =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200' viewBox='0 0 1200 1200'%3E%3Crect width='1200' height='1200' fill='%23f5f5f4'/%3E%3Ccircle cx='600' cy='460' r='280' fill='%23e7d9c4' opacity='0.55'/%3E%3Cpath d='M420 430c30-120 150-190 250-190 160 0 270 120 270 260 0 150-120 270-270 270-130 0-250-100-270-220l70-20c20 70 90 140 200 140 120 0 200-90 200-200 0-100-80-180-180-180-80 0-150 50-170 110l-100 40z' fill='%23d9b98d'/%3E%3C/svg%3E";

const R2_BASE = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "");

/**
 * Product, post and story photos are re-encoded in the browser (<=1600px WebP) and get a
 * server-made 640px thumbnail, so they are served straight from R2 (free downloads) instead of
 * through Vercel image optimization. Everything else (covers, logos, older uploads, other hosts)
 * still goes through next/image, which sizes it for the visitor's device.
 */
function isPreparedR2Photo(url: string) {
  return Boolean(R2_BASE) && url.startsWith(`${R2_BASE}/`) && isVariantUrl(url);
}

export function StoreImage({
  src,
  alt,
  className,
  fallback = defaultFallback,
  sizes = "100vw",
  preload = false,
  thumb = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
  sizes?: string;
  preload?: boolean;
  /** Use the small thumbnail when one exists (grids, circles, strips); falls back to the full image, then the placeholder. */
  thumb?: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState((thumb && src ? thumbUrlFor(src) : null) || src || fallback);
  const isInlineFallback = currentSrc.startsWith("data:");

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={1200}
      height={1200}
      sizes={sizes}
      preload={preload}
      fetchPriority={preload ? "high" : "auto"}
      unoptimized={isInlineFallback || isPreparedR2Photo(currentSrc)}
      onError={() => setCurrentSrc(src && currentSrc !== src ? src : fallback)}
      className={className}
    />
  );
}
