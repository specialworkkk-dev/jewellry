export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export const PWA_INSTALL_READY_EVENT = "luxestore:pwa-install-ready";
export const PWA_APP_INSTALLED_EVENT = "luxestore:pwa-app-installed";

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
