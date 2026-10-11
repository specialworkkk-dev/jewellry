"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import {
  PUSH_CHANGED_EVENT,
  isSubscribedToShop,
  pushFailureMessage,
  pushSupported,
  subscribeToShop,
} from "./push-client";

type Phase = "checking" | "off" | "working" | "on";

/** "Get alerted when prices drop": turns on this shop's notifications from the Saved page. */
export function SavedAlertsPrompt({
  shopId,
  shopName,
  publicVapidKey,
  panelClass,
  headingClass,
  subtleClass,
  buttonClass,
}: {
  shopId: string;
  shopName: string;
  publicVapidKey?: string;
  panelClass: string;
  headingClass: string;
  subtleClass: string;
  buttonClass: string;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [supported, setSupported] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void isSubscribedToShop(shopId).then((on) => {
      if (cancelled) return;
      setSupported(pushSupported());
      setPhase(on ? "on" : "off");
    });
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ shopId: string; subscribed: boolean }>).detail;
      if (detail?.shopId === shopId) setPhase(detail.subscribed ? "on" : "off");
    };
    window.addEventListener(PUSH_CHANGED_EVENT, onChange);
    return () => { cancelled = true; window.removeEventListener(PUSH_CHANGED_EVENT, onChange); };
  }, [shopId]);

  if (phase === "checking") return null;
  if (!publicVapidKey) return null;

  if (phase === "on") {
    return (
      <p role="status" className={`mb-6 flex items-start gap-2 rounded-lg p-3 text-sm sm:p-4 ${panelClass} ${headingClass}`}>
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
        <span className="min-w-0">Alerts are on. {shopName} will tell you when a saved design drops in price or is back in stock.</span>
      </p>
    );
  }

  const enable = async () => {
    setPhase("working");
    setMessage("");
    const result = await subscribeToShop(shopId, publicVapidKey);
    if (result.ok) {
      setPhase("on");
    } else {
      setPhase("off");
      setMessage(pushFailureMessage(result.reason));
    }
  };

  return (
    <div className={`mb-6 flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${panelClass}`}>
      <div className="min-w-0">
        <p className={`flex items-center gap-2 text-sm font-semibold ${headingClass}`}>
          <BellRing className="h-4 w-4 shrink-0" /> Get alerted when prices drop
        </p>
        <p className={`mt-1 text-xs sm:text-sm ${subtleClass}`}>
          We will notify you if a saved design gets cheaper or comes back in stock. Only you get these alerts.
        </p>
        {!supported && (
          <p className={`mt-1 text-xs sm:text-sm [overflow-wrap:anywhere] ${subtleClass}`}>{pushFailureMessage("unsupported")}</p>
        )}
        {message && <p role="alert" className={`mt-1 text-xs sm:text-sm [overflow-wrap:anywhere] ${subtleClass}`}>{message}</p>}
      </div>
      {supported && (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={phase === "working"}
          className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-70 sm:w-auto ${buttonClass}`}
        >
          {phase === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Turn on alerts
        </button>
      )}
    </div>
  );
}
