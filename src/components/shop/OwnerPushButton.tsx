"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

type Status = "loading" | "off" | "on" | "blocked" | "unsupported" | "error";

async function swRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export function OwnerPushButton({ publicVapidKey }: { publicVapidKey: string }) {
  const [status, setStatus] = useState<Status>("loading");

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
      try {
        const registration = await swRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription && window.localStorage.getItem("luxestore-owner-push") === "true" ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await swRegistration();
      const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "owner", subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("Subscription failed");
      window.localStorage.setItem("luxestore-owner-push", "true");
      setStatus("on");
    } catch {
      setStatus("error");
    }
  };

  const disable = async () => {
    setStatus("loading");
    try {
      const registration = await swRegistration();
      const subscription = await registration.pushManager.getSubscription();
      // Only the server-side owner registration is removed; the browser
      // subscription may still serve storefront updates on this device.
      if (subscription) {
        await fetch("/api/notifications/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "owner", endpoint: subscription.endpoint }),
        });
      }
    } finally {
      window.localStorage.removeItem("luxestore-owner-push");
      setStatus("off");
    }
  };

  if (status === "unsupported") {
    return <p className="text-sm text-gray-500">This browser does not support push notifications. On iPhone, add the app to your Home Screen first.</p>;
  }
  if (status === "blocked") {
    return <p className="flex items-center gap-2 text-sm text-gray-500"><BellOff className="h-4 w-4" /> Notifications are blocked. Allow them in your browser settings, then reload.</p>;
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={status === "loading"}
        onClick={() => void (status === "on" ? disable() : enable())}
        aria-pressed={status === "on"}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition disabled:opacity-60 ${status === "on" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-violet-300 bg-white text-violet-800 hover:bg-violet-50"}`}
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "on" ? <Bell className="h-4 w-4 fill-current" /> : <Smartphone className="h-4 w-4" />}
        {status === "on" ? "Enquiry alerts on for this device" : "Enable enquiry alerts on this device"}
      </button>
      {status === "error" && <p role="alert" className="text-sm text-red-600">Could not enable alerts. Please try again.</p>}
    </div>
  );
}
