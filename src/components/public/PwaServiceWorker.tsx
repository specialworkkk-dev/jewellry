"use client";

import { useEffect } from "react";

export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        const refreshWhenReady = () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        };

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              refreshWhenReady();
              window.location.reload();
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

  return null;
}
