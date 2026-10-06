"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function ShopRealtimeSync({
  shopId,
  audience,
}: {
  shopId: string;
  audience: "customer" | "owner";
}) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;
    let closeRealtime: (() => void) | undefined;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;
    let idleHandle: number | undefined;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 350);
    };

    const stopFallback = () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    };

    const startFallback = () => {
      if (fallbackTimer) return;
      // Owners need quick operational updates. Customer fallback stays slower to
      // protect Vercel and MongoDB when the realtime provider is unavailable.
      const intervalMs = audience === "owner" ? 60_000 : 5 * 60_000;
      fallbackTimer = setInterval(refresh, intervalMs);
    };

    const connect = async () => {
      try {
        const { Realtime } = await import("ably");
        if (disposed) return;

        const realtime = new Realtime({
          authUrl: `/api/realtime/auth?shopId=${encodeURIComponent(shopId)}&audience=${audience}`,
          autoConnect: true,
          echoMessages: false,
          disconnectedRetryTimeout: 5_000,
          suspendedRetryTimeout: 15_000,
        });
        const channelAudience = audience === "owner" ? "owner" : "public";
        const channel = realtime.channels.get(`shop:${shopId}:${channelAudience}`);

        realtime.connection.on("connected", stopFallback);
        realtime.connection.on("disconnected", startFallback);
        realtime.connection.on("suspended", startFallback);
        realtime.connection.on("failed", startFallback);
        await channel.subscribe("shop-update", refresh);

        closeRealtime = () => {
          void channel.unsubscribe("shop-update", refresh);
          realtime.close();
        };
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Realtime unavailable; using refresh fallback", error);
        }
        startFallback();
      }
    };

    const startWhenInteractive = () => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(() => void connect(), { timeout: 2_000 });
      } else {
        startupTimer = setTimeout(() => void connect(), 250);
      }
    };

    startWhenInteractive();

    return () => {
      disposed = true;
      if (idleHandle !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (startupTimer) clearTimeout(startupTimer);
      closeRealtime?.();
      stopFallback();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [audience, router, shopId]);

  return null;
}
