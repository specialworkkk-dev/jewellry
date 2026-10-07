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
    // Dedupe refreshes/back-navigation: one event per target per 30 minutes per tab session.
    const dedupeKey = `luxestore-analytics:${eventType}:${shopId}:${targetId ?? ""}`;
    try {
      const last = Number(window.sessionStorage.getItem(dedupeKey));
      if (last && Date.now() - last < 30 * 60 * 1000) return;
      window.sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch {
      // Storage can be blocked; fall through and send.
    }
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, eventType, ...(targetId ? { targetId } : {}) }),
      keepalive: true,
    });
  }, [eventType, shopId, targetId]);

  return null;
}
