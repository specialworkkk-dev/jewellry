export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export const PWA_INSTALL_READY_EVENT = "luxestore:pwa-install-ready";
export const PWA_APP_INSTALLED_EVENT = "luxestore:pwa-app-installed";

export type PwaBrowserEnvironment = {
  isAndroid: boolean;
  isIOS: boolean;
  isChrome: boolean;
  isInAppBrowser: boolean;
};

declare global {
  interface Window {
    __luxestoreInstallPrompt?: BeforeInstallPromptEvent;
    __luxestorePwaCaptureReady?: boolean;
  }
}

export function getCapturedInstallPrompt() {
  return typeof window === "undefined" ? undefined : window.__luxestoreInstallPrompt;
}

export function clearCapturedInstallPrompt() {
  if (typeof window !== "undefined") delete window.__luxestoreInstallPrompt;
}

export function getPwaBrowserEnvironment(userAgent?: string): PwaBrowserEnvironment {
  const ua = (userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent)).toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua)
    || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  const isInAppBrowser = /; wv\)|\bwv\b|fban|fbav|instagram|whatsapp|line\/|snapchat|twitter|micromessenger|musical_ly/.test(ua);
  const isChrome = /chrome\//.test(ua)
    && !/edg\/|edga|opr\/|opera|samsungbrowser|ucbrowser|miuibrowser|vivobrowser|huaweibrowser|heytapbrowser|oppobrowser/.test(ua);

  return { isAndroid, isIOS, isChrome, isInAppBrowser };
}
