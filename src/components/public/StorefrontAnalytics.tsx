"use client";

import { useEffect, useRef } from "react";

export function StorefrontAnalytics({
  shopId,
  eventType,
  targetId,
}: {
  shopId: string;
  eventType: "SHOP_VIEW" | "PRODUCT_VIEW";
  targetId?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, eventType, ...(targetId ? { targetId } : {}) }),
      keepalive: true,
    });
  }, [eventType, shopId, targetId]);

  return null;
}
