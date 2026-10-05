"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X, Zap } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallCard({ appName }: { appName: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const initialize = window.setTimeout(() => setHidden(isStandalone()), 0);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const handleInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (hidden) return null;

  const install = async () => {
    if (!prompt) {
      setShowSteps(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setHidden(true);
    setPrompt(null);
  };

  return (
    <section className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm sm:p-7">
        <button type="button" onClick={() => setHidden(true)} aria-label="Hide install suggestion" className="absolute right-3 top-3 rounded-full p-1.5 text-stone-400 hover:bg-white hover:text-stone-700">
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-amber-300 shadow-md">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700"><Zap className="h-3.5 w-3.5" /> Faster access</p>
              <h2 className="mt-1 text-xl font-serif font-semibold text-stone-900">Keep {appName} on your phone</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">Install this shop for one-tap access to new jewellery, gold rates and WhatsApp enquiries.</p>
            </div>
          </div>
          <button type="button" onClick={install} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white hover:bg-stone-800">
            <Download className="h-4 w-4" /> Install shop
          </button>
        </div>
        {showSteps && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-stone-700">
            <p className="flex items-center gap-2 font-semibold"><Share className="h-4 w-4" /> If the install window does not appear:</p>
            <p className="mt-1">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
          </div>
        )}
      </div>
    </section>
  );
}
