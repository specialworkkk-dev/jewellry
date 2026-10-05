"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

const INSTALL_STORAGE_KEY = "luxestore-pwa-installed";
const INSTALL_DISMISSED_KEY = "luxestore-pwa-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as NavigatorWithStandalone).standalone);
}

export function PwaInstallPrompt({ shopName }: { shopName?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALL_STORAGE_KEY, "true");
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const initializePrompt = window.setTimeout(() => {
      const installed = localStorage.getItem(INSTALL_STORAGE_KEY) === "true" || isStandaloneMode();
      const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
      const recentlyDismissed = Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS;
      if (installed || recentlyDismissed) return;

      const ios = isIOSDevice();
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsIOS(ios);
      setIsVisible(ios || mobile);
    }, 0);

    return () => {
      window.clearTimeout(initializePrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const markInstalled = () => {
    localStorage.setItem(INSTALL_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        markInstalled();
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIOS) {
      setShowManualSteps(true);
      return;
    }

    setShowManualSteps(true);
  };

  const dismissPrompt = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const title = shopName ? `Install ${shopName}` : "Install app";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-4 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-600">
              {isIOS
                ? "Add this store to your Home Screen for faster access on iPhone and iPad."
                : "Install the app for a faster, app-like experience on your phone."}
            </div>

            {showManualSteps && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                {isIOS ? (
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Tap the Share button in Safari.</li>
                    <li>Select “Add to Home Screen”.</li>
                    <li>Tap “Add” to install it.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Open this page in Chrome or your browser.</li>
                    <li>Tap the browser menu.</li>
                    <li>Select “Install app” or “Add to Home Screen”.</li>
                  </ol>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label="Dismiss install prompt"
              className="self-end rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isIOS ? "Show steps" : "Install"}
            </button>
            {!showManualSteps && (
              <button
                type="button"
                onClick={() => setShowManualSteps(true)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Share className="mr-1 h-3 w-3" />
                Help
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
