"use client";

import { useEffect } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa-install";
import {
  clearCapturedInstallPrompt,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa-install";

/**
 * Captures Chromium's one-use install event before route-level UI mounts.
 * Every install surface can then use the same native prompt without racing.
 */
export function PwaInstallCapture() {
  useEffect(() => {
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      window.__luxestoreInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT));
    };

    const handleInstalled = () => {
      clearCapturedInstallPrompt();
      window.dispatchEvent(new Event(PWA_APP_INSTALLED_EVENT));
    };

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return null;
}
