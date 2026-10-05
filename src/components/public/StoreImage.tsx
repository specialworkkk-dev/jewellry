"use client";

import { useState } from "react";

const defaultFallback =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200' viewBox='0 0 1200 1200'%3E%3Crect width='1200' height='1200' fill='%23f5f5f4'/%3E%3Ccircle cx='600' cy='460' r='280' fill='%23e7d9c4' opacity='0.55'/%3E%3Cpath d='M420 430c30-120 150-190 250-190 160 0 270 120 270 260 0 150-120 270-270 270-130 0-250-100-270-220l70-20c20 70 90 140 200 140 120 0 200-90 200-200 0-100-80-180-180-180-80 0-150 50-170 110l-100 40z' fill='%23d9b98d'/%3E%3C/svg%3E";

export function StoreImage({
  src,
  alt,
  className,
  fallback = defaultFallback,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  return (
    // This wrapper intentionally uses a native image so it can swap to an inline
    // data-URL fallback when a tenant-provided remote image fails at runtime.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      onError={() => setCurrentSrc(fallback)}
      className={className}
    />
  );
}
