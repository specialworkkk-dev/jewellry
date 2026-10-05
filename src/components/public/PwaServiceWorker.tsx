"use client";

import { useEffect, useRef, useState } from "react";

export function PwaServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (registration.waiting) {
          waitingWorker.current = registration.waiting;
          setUpdateAvailable(true);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              waitingWorker.current = installingWorker;
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, []);

  const handleReload = () => {
    if (waitingWorker.current) {
      waitingWorker.current.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-xl border border-amber-200 bg-white p-3 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Update</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">A new version is ready</p>
          <p className="mt-1 text-xs text-slate-600">Refresh to get the latest store updates.</p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
