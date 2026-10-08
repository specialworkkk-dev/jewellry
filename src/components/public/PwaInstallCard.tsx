"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, Share, Smartphone, X, Zap } from "lucide-react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa-install";
import {
  clearCapturedInstallPrompt,
  getPwaBrowserEnvironment,
  getCapturedInstallPrompt,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa-install";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallCard({ appName }: { appName: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [checkedInstallState, setCheckedInstallState] = useState(false);
  const [installSignalSettled, setInstallSignalSettled] = useState(false);

  useEffect(() => {
    const recheckInstallState = () => {
      if (document.visibilityState === "hidden") return;
      if (isStandalone()) {
        setHidden(true);
        return;
      }
      const capturedPrompt = getCapturedInstallPrompt() || null;
      if (capturedPrompt) {
        setPrompt(capturedPrompt);
        setHidden(false);
        setInstallSignalSettled(true);
      }
    };
    const initialize = window.setTimeout(() => {
      const environment = getPwaBrowserEnvironment();
      const capturedPrompt = getCapturedInstallPrompt() || null;
      setHidden(isStandalone());
      setIsAndroid(environment.isAndroid);
      setIsIOS(environment.isIOS);
      setIsChrome(environment.isChrome);
      setIsInAppBrowser(environment.isInAppBrowser);
      setPrompt(capturedPrompt);
      if (capturedPrompt || environment.isIOS || environment.isInAppBrowser) setInstallSignalSettled(true);
      setCheckedInstallState(true);
    }, 0);
    const signalTimeout = window.setTimeout(() => setInstallSignalSettled(true), 12_000);
    const handlePrompt = () => {
      setPrompt(getCapturedInstallPrompt() || null);
      setHidden(false);
      setCheckedInstallState(true);
      setInstallSignalSettled(true);
    };
    const handleInstalled = () => {
      setHidden(true);
      setCheckedInstallState(true);
    };
    window.addEventListener(PWA_INSTALL_READY_EVENT, handlePrompt);
    window.addEventListener(PWA_APP_INSTALLED_EVENT, handleInstalled);
    window.addEventListener("focus", recheckInstallState);
    window.addEventListener("pageshow", recheckInstallState);
    document.addEventListener("visibilitychange", recheckInstallState);
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    displayModeQuery.addEventListener?.("change", recheckInstallState);
    return () => {
      window.clearTimeout(initialize);
      window.clearTimeout(signalTimeout);
      window.removeEventListener(PWA_INSTALL_READY_EVENT, handlePrompt);
      window.removeEventListener(PWA_APP_INSTALLED_EVENT, handleInstalled);
      window.removeEventListener("focus", recheckInstallState);
      window.removeEventListener("pageshow", recheckInstallState);
      document.removeEventListener("visibilitychange", recheckInstallState);
      displayModeQuery.removeEventListener?.("change", recheckInstallState);
    };
  }, []);

  if (!checkedInstallState || hidden) return null;

  const install = async () => {
    if (!prompt) {
      setShowSteps(true);
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearCapturedInstallPrompt();
      setPrompt(null);
      if (choice.outcome === "accepted") {
        setHidden(true);
      } else {
        setShowSteps(true);
      }
    } catch {
      clearCapturedInstallPrompt();
      setPrompt(null);
      setShowSteps(true);
    } finally {
      setInstalling(false);
    }
  };

  const openInChrome = () => {
    const chromeIntent = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=${window.location.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
    window.location.assign(chromeIntent);
  };

  return (
    <section className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm sm:p-7">
        <button type="button" onClick={() => setHidden(true)} aria-label="Hide install suggestion" className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-stone-400 hover:bg-white hover:text-stone-700">
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-4 pr-8 sm:pr-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-amber-300 shadow-md">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700"><Zap className="h-3.5 w-3.5" /> Faster access</p>
              <h2 className="mt-1 text-lg font-serif font-semibold text-stone-900 [overflow-wrap:anywhere] sm:text-xl">Keep {appName} on your phone</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">Install this shop for one-tap access to new jewellery, gold rates and WhatsApp enquiries.</p>
            </div>
          </div>
          <button type="button" onClick={install} disabled={installing || !installSignalSettled} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-stone-900 px-6 max-sm:w-full py-3 text-sm font-bold text-white shadow-lg shadow-stone-900/15 transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-wait disabled:opacity-70">
            {installing || !installSignalSettled ? <LoaderCircle className="h-4 w-4 animate-spin" /> : prompt ? <Download className="h-4 w-4" /> : <Share className="h-4 w-4" />}
            {installing ? "Opening…" : !installSignalSettled ? "Getting ready…" : prompt ? "Install in one tap" : isIOS ? "Add to iPhone" : "How to install"}
          </button>
        </div>
        {showSteps && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-stone-700">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {isIOS ? "Install from Safari" : "Install from your browser"}</p>
            <p className="mt-1">{isIOS
              ? <>Tap <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>. Apple does not allow websites to skip these confirmation steps.</>
              : isInAppBrowser
                ? <>Open this page in Chrome, tap the three-dot menu and choose <strong>Install app</strong>.</>
                : <>Tap the browser&apos;s three-dot menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>}</p>
            {isAndroid && !isChrome && !prompt && (
              <button type="button" onClick={openInChrome} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-xs font-bold text-white">
                Open in Chrome to install
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
