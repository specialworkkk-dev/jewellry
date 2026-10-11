"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { PUSH_CHANGED_EVENT, announcePushChange, pushStorageKey, subscribeToShop } from "./push-client";

type Status = "loading" | "off" | "on" | "blocked" | "unsupported";

export function ShopNotificationButton({
  shopId,
  shopName,
  publicVapidKey,
}: {
  shopId: string;
  shopName: string;
  publicVapidKey: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const storageKey = pushStorageKey(shopId);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      await Promise.resolve();
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("blocked");
        return;
      }
      if (window.localStorage.getItem(storageKey) !== "true") {
        if (!cancelled) setStatus("off");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          window.localStorage.removeItem(storageKey);
          if (!cancelled) setStatus("off");
          return;
        }
        const response = await fetch("/api/notifications/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, subscription: subscription.toJSON() }),
        });
        if (!cancelled) setStatus(response.ok ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [shopId, storageKey]);

  // Stay in sync when "Notify me" or the Saved page turns alerts on.
  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ shopId: string; subscribed: boolean }>).detail;
      if (detail?.shopId === shopId) setStatus(detail.subscribed ? "on" : "off");
    };
    window.addEventListener(PUSH_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PUSH_CHANGED_EVENT, onChange);
  }, [shopId]);

  const subscribe = async () => {
    setStatus("loading");
    const result = await subscribeToShop(shopId, publicVapidKey);
    if (result.ok) setStatus("on");
    else setStatus(result.reason === "blocked" ? "blocked" : "off");
  };

  const unsubscribe = async () => {
    setStatus("loading");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, endpoint: subscription.endpoint }),
        });
      }
    } finally {
      window.localStorage.removeItem(storageKey);
      setStatus("off");
      announcePushChange(shopId, false);
    }
  };

  if (status === "unsupported") return null;
  if (status === "blocked") {
    return (
      <span role="img" aria-label="Notifications blocked" title="Notifications are blocked. Enable them in your browser settings." className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-stone-200 bg-stone-100 text-xs font-semibold text-stone-500 sm:w-auto sm:px-3">
        <BellOff className="h-4 w-4" /> <span className="hidden sm:inline">Notifications blocked</span>
      </span>
    );
  }
  if (status === "loading") {
    return <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white"><Loader2 className="h-4 w-4 animate-spin" /></span>;
  }
  return (
    <button
      type="button"
      onClick={() => void (status === "on" ? unsubscribe() : subscribe())}
      aria-pressed={status === "on"}
      aria-label={status === "on" ? `Stop ${shopName} updates` : `Get ${shopName} updates`}
      title={status === "on" ? `Stop ${shopName} updates` : `Get ${shopName} updates`}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-full border text-xs font-bold transition sm:w-auto sm:px-3 ${status === "on" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"}`}
    >
      {status === "on" ? <Bell className="h-4 w-4 fill-current" /> : <Bell className="h-4 w-4" />}
      <span className="hidden sm:inline">{status === "on" ? "Updates on" : "Get updates"}</span>
    </button>
  );
}
