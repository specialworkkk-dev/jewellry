"use client";

import { useEffect, useRef, useState } from "react";

export function PwaServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadOnControllerChange = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        registrationRef.current = registration;

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
          if (!reloadOnControllerChange.current) return;
          reloadOnControllerChange.current = false;
          window.location.reload();
        });

        // register() may reuse an existing worker without checking immediately.
        // Explicit checks make installed apps discover every new deployment.
        await registration.update();
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    void registerServiceWorker();

    const checkForUpdates = () => {
      if (document.visibilityState === "visible") {
        void registrationRef.current?.update();
      }
    };
    const interval = window.setInterval(checkForUpdates, 5 * 60 * 1000);
    window.addEventListener("focus", checkForUpdates);
    document.addEventListener("visibilitychange", checkForUpdates);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkForUpdates);
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);

  const handleReload = async () => {
    setApplyingUpdate(true);
    reloadOnControllerChange.current = true;

    if (waitingWorker.current) {
      waitingWorker.current.postMessage({ type: "SKIP_WAITING" });
    } else {
      await registrationRef.current?.update();
      const worker = registrationRef.current?.waiting;
      if (worker) {
        waitingWorker.current = worker;
        worker.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-xl border border-amber-200 bg-white p-3 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Update</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">A new version is ready</p>
          <p className="mt-1 text-xs text-slate-600">Update now to get the latest features and fixes.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleReload()}
          disabled={applyingUpdate}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-70"
        >
          {applyingUpdate ? "Updating…" : "Update now"}
        </button>
      </div>
    </div>
  );
}
