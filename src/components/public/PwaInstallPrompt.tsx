"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X, Zap } from "lucide-react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa-install";
import {
  clearCapturedInstallPrompt,
  getPwaBrowserEnvironment,
  getCapturedInstallPrompt,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa-install";

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as NavigatorWithStandalone).standalone);
}

interface PwaInstallPromptProps {
  appId: string;
  appName: string;
  description?: string;
  dismissDurationMs?: number;
  showDelayMs?: number;
}

export function PwaInstallPrompt({
  appId,
  appName,
  description,
  dismissDurationMs = DISMISS_DURATION_MS,
  showDelayMs = 0,
}: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const storageSuffix = appId.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  // Older builds stored installation as a permanent boolean. Browsers do not
  // send websites an uninstall event, so that value became stale forever after
  // an uninstall. Keep the key only to remove the legacy state.
  const legacyInstallStorageKey = `luxestore-pwa-${storageSuffix}-installed`;
  const dismissedStorageKey = `luxestore-pwa-${storageSuffix}-dismissed-at`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let revealTimer: number | undefined;
    let installSignalTimer: number | undefined;
    let installedDuringThisMount = false;

    const promptIsSuppressed = () => {
      const dismissedAt = Number(localStorage.getItem(dismissedStorageKey) || 0);
      const recentlyDismissed = Number.isFinite(dismissedAt) && Date.now() - dismissedAt < dismissDurationMs;
      return isStandaloneMode() || installedDuringThisMount || recentlyDismissed;
    };

    const revealPrompt = () => {
      if (promptIsSuppressed()) return;
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => setIsVisible(true), showDelayMs);
    };

    const handleBeforeInstallPrompt = () => {
      // A fresh browser install event is authoritative evidence that the app is
      // not currently installed, even if an older version left a stored flag.
      installedDuringThisMount = false;
      localStorage.removeItem(legacyInstallStorageKey);
      setDeferredPrompt(getCapturedInstallPrompt() || null);
      if (installSignalTimer) window.clearTimeout(installSignalTimer);
      revealPrompt();
    };

    const handleAppInstalled = () => {
      installedDuringThisMount = true;
      localStorage.removeItem(legacyInstallStorageKey);
      setIsVisible(false);
    };

    const recheckInstallState = () => {
      if (document.visibilityState === "hidden") return;
      if (isStandaloneMode()) {
        setIsVisible(false);
        return;
      }

      // A normal browser visit must never be suppressed by a stale historical
      // install flag. After uninstall, Chrome will normally provide a new
      // beforeinstallprompt event, which immediately reveals the prompt.
      localStorage.removeItem(legacyInstallStorageKey);
      const capturedPrompt = getCapturedInstallPrompt();
      if (capturedPrompt) {
        installedDuringThisMount = false;
        setDeferredPrompt(capturedPrompt);
        revealPrompt();
      }
    };

    window.addEventListener(PWA_INSTALL_READY_EVENT, handleBeforeInstallPrompt);
    window.addEventListener(PWA_APP_INSTALLED_EVENT, handleAppInstalled);
    window.addEventListener("focus", recheckInstallState);
    window.addEventListener("pageshow", recheckInstallState);
    document.addEventListener("visibilitychange", recheckInstallState);
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    displayModeQuery.addEventListener?.("change", recheckInstallState);

    const initializePrompt = window.setTimeout(() => {
      if (!isStandaloneMode()) localStorage.removeItem(legacyInstallStorageKey);
      if (promptIsSuppressed()) return;

      const capturedPrompt = getCapturedInstallPrompt();
      if (capturedPrompt) setDeferredPrompt(capturedPrompt);

      const environment = getPwaBrowserEnvironment();
      const { isIOS: ios, isAndroid: android } = environment;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsIOS(ios);
      setIsAndroid(android);
      setIsChrome(environment.isChrome);
      setIsInAppBrowser(environment.isInAppBrowser);

      if (capturedPrompt || ios || environment.isInAppBrowser) {
        revealPrompt();
      } else if (mobile) {
        // Chrome may need the manifest, service worker and page paint before it
        // emits beforeinstallprompt. Do not show a dead Install button while it
        // is still deciding whether the page is installable.
        installSignalTimer = window.setTimeout(revealPrompt, 12_000);
      }
    }, 0);

    return () => {
      window.clearTimeout(initializePrompt);
      if (installSignalTimer) window.clearTimeout(installSignalTimer);
      if (revealTimer) window.clearTimeout(revealTimer);
      window.removeEventListener(PWA_INSTALL_READY_EVENT, handleBeforeInstallPrompt);
      window.removeEventListener(PWA_APP_INSTALLED_EVENT, handleAppInstalled);
      window.removeEventListener("focus", recheckInstallState);
      window.removeEventListener("pageshow", recheckInstallState);
      document.removeEventListener("visibilitychange", recheckInstallState);
      displayModeQuery.removeEventListener?.("change", recheckInstallState);
    };
  }, [dismissedStorageKey, dismissDurationMs, legacyInstallStorageKey, showDelayMs]);

  const markInstalled = () => {
    localStorage.removeItem(legacyInstallStorageKey);
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          markInstalled();
        } else {
          setShowManualSteps(true);
        }
      } catch {
        setShowManualSteps(true);
      } finally {
        clearCapturedInstallPrompt();
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIOS) {
      setShowManualSteps(true);
      return;
    }

    setShowManualSteps(true);
  };

  const dismissPrompt = () => {
    localStorage.setItem(dismissedStorageKey, String(Date.now()));
    setIsVisible(false);
  };

  const openInChrome = () => {
    const chromeIntent = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=${window.location.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
    window.location.assign(chromeIntent);
  };

  if (!isVisible) return null;

  const title = `Install ${appName}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-4 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <Zap className="h-3 w-3" /> Free · quick install
            </div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-600">
              {description || (isIOS
                ? `Add ${appName} to your Home Screen for faster access on iPhone and iPad.`
                : `Install ${appName} for a faster, app-like experience.`)}
            </div>

            {showManualSteps && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                {isIOS ? (
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Tap the Share button in Safari.</li>
                    <li>Select “Add to Home Screen”.</li>
                    <li>Tap “Add” to install it.</li>
                  </ol>
                ) : isInAppBrowser ? (
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Open this page in the full Chrome browser.</li>
                    <li>Tap Chrome&apos;s three-dot menu.</li>
                    <li>Select <strong>Install app</strong> (not “Create shortcut”).</li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Tap the browser&apos;s three-dot menu.</li>
                    <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>Confirm by tapping <strong>Install</strong>.</li>
                  </ol>
                )}
                {isAndroid && !isChrome && !deferredPrompt && (
                  <button
                    type="button"
                    onClick={openInChrome}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white"
                  >
                    Open in Chrome to install
                  </button>
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
              {isIOS ? "Show steps" : deferredPrompt ? "Install now" : "How to install"}
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
