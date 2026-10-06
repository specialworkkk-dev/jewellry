"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

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
  const storageKey = `luxestore-shop-notifications:${shopId}`;

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

  const subscribe = async () => {
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });
      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("Subscription failed");
      window.localStorage.setItem(storageKey, "true");
      setStatus("on");
    } catch {
      setStatus("off");
    }
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
    }
  };

  if (status === "unsupported") return null;
  if (status === "blocked") {
    return (
      <span title="Enable notifications in your browser settings" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-3 text-xs font-semibold text-stone-500">
        <BellOff className="h-4 w-4" /> Notifications blocked
      </span>
    );
  }
  if (status === "loading") {
    return <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white"><Loader2 className="h-4 w-4 animate-spin" /></span>;
  }
  return (
    <button
      type="button"
      onClick={() => void (status === "on" ? unsubscribe() : subscribe())}
      aria-pressed={status === "on"}
      title={status === "on" ? `Stop ${shopName} updates` : `Get ${shopName} updates`}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${status === "on" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"}`}
    >
      {status === "on" ? <Bell className="h-4 w-4 fill-current" /> : <Bell className="h-4 w-4" />}
      {status === "on" ? "Updates on" : "Get updates"}
    </button>
  );
}
