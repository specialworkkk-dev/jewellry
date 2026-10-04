"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function PwaInstallPrompt({ shopName }: { shopName: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 pb-4 px-4 z-[60] flex justify-center">
      <div className="bg-gray-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Add {shopName} to Home Screen</span>
          <span className="text-xs text-gray-400">Install for a faster, app-like experience</span>
        </div>
        <button 
          onClick={handleInstallClick}
          className="ml-auto bg-white text-black font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4 inline-block mr-1" /> Install
        </button>
      </div>
    </div>
  );
}
