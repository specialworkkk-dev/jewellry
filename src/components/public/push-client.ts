"use client";

/** Browser-side web-push helpers shared by the header bell, "Notify me" and the Saved page. */

export type PushFailure = "unsupported" | "blocked" | "dismissed" | "failed";
export type PushResult = { ok: true } | { ok: false; reason: PushFailure };

export const PUSH_CHANGED_EVENT = "luxestore:push-changed";

export const pushStorageKey = (shopId: string) => `luxestore-shop-notifications:${shopId}`;

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

/** Never leave a button spinning forever when a browser API (service worker, push service) stalls. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function pushBlocked() {
  return pushSupported() && Notification.permission === "denied";
}

export function announcePushChange(shopId: string, subscribed: boolean) {
  window.dispatchEvent(new CustomEvent(PUSH_CHANGED_EVENT, { detail: { shopId, subscribed } }));
}

/** True when this browser has a live subscription AND the shop has been told about it. */
export async function isSubscribedToShop(shopId: string): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    if (window.localStorage.getItem(pushStorageKey(shopId)) !== "true") return false;
    const registration = await withTimeout(navigator.serviceWorker.ready, 5_000);
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Ask permission, subscribe this browser and register it with the shop. */
export async function subscribeToShop(shopId: string, publicVapidKey: string): Promise<PushResult> {
  if (!pushSupported() || !publicVapidKey) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false, reason: "blocked" };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "blocked" : "dismissed" };
    const registration = await withTimeout(navigator.serviceWorker.ready, 10_000);
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await withTimeout(registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    }), 20_000);
    const response = await fetch("/api/notifications/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, subscription: subscription.toJSON() }),
    });
    if (!response.ok) return { ok: false, reason: "failed" };
    window.localStorage.setItem(pushStorageKey(shopId), "true");
    announcePushChange(shopId, true);
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export function pushFailureMessage(reason: PushFailure) {
  switch (reason) {
    case "unsupported":
      return "This browser cannot show alerts. On iPhone, tap Share, choose Add to Home Screen, then open the shop from your Home Screen and try again.";
    case "blocked":
      return "Notifications are blocked for this site. Allow them in your browser settings, then try again.";
    case "dismissed":
      return "Alerts were not turned on. Tap the button again and choose Allow.";
    default:
      return "We could not turn on alerts right now. Please try again in a moment.";
  }
}
