"use client";

import { useEffect, useRef } from "react";

/** Phone category row: a single swipeable line that opens scrolled to the active category. */
export function CategoryScroller({ className, label, children }: { className: string; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2);
  }, []);
  return <nav ref={ref} aria-label={label} className={className}>{children}</nav>;
}
