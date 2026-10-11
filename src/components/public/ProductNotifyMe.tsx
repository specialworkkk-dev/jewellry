"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2, PackageX } from "lucide-react";
import { PUSH_CHANGED_EVENT, isSubscribedToShop, pushFailureMessage, subscribeToShop } from "./push-client";

export const PRODUCT_SAVED_EVENT = "luxestore:product-saved";

type Phase = "idle" | "working" | "done";

/**
 * Shown on a sold-out product page. "Notify me" makes sure the product is saved (so the owner's
 * back-in-stock alert can find this visitor) and turns on this shop's push notifications.
 */
export function ProductNotifyMe({
  shopId,
  productId,
  publicVapidKey,
  initialSaved,
  panelClass,
  headingClass,
  subtleClass,
  buttonClass,
}: {
  shopId: string;
  productId: string;
  publicVapidKey?: string;
  initialSaved: boolean;
  panelClass: string;
  headingClass: string;
  subtleClass: string;
  buttonClass: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [saved, setSaved] = useState(initialSaved);
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void isSubscribedToShop(shopId).then((value) => { if (!cancelled) setSubscribed(value); });
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ shopId: string; subscribed: boolean }>).detail;
      if (detail?.shopId === shopId) setSubscribed(detail.subscribed);
    };
    window.addEventListener(PUSH_CHANGED_EVENT, onChange);
    return () => { cancelled = true; window.removeEventListener(PUSH_CHANGED_EVENT, onChange); };
  }, [shopId]);

  const covered = saved && subscribed;

  const notifyMe = async () => {
    if (phase === "working") return;
    setPhase("working");
    setMessage("");
    try {
      if (!saved) {
        const response = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: productId, targetType: "PRODUCT", interactionType: "LIKE", shopId, ensure: true }),
        });
        if (!response.ok) throw new Error("save-failed");
        setSaved(true);
        window.dispatchEvent(new CustomEvent(PRODUCT_SAVED_EVENT, { detail: { productId } }));
      }
      if (!subscribed) {
        const result = await subscribeToShop(shopId, publicVapidKey || "");
        if (!result.ok) {
          setPhase("idle");
          setMessage(`Saved to your list. ${pushFailureMessage(result.reason)}`);
          return;
        }
        setSubscribed(true);
      }
      setPhase("done");
    } catch {
      setPhase("idle");
      setMessage("We could not save this right now. Please try again.");
    }
  };

  return (
    <div className={`mt-6 rounded-lg p-4 ${panelClass}`} data-testid="sold-out-notice">
      <p className={`flex items-center gap-2 text-base font-semibold ${headingClass}`}>
        <PackageX className="h-5 w-5 shrink-0" /> Currently sold out
      </p>
      <p className={`mt-1 text-sm ${subtleClass}`}>
        This design is not available right now. You can still message the shop on WhatsApp to ask about it.
      </p>
      {covered || phase === "done" ? (
        <p role="status" className={`mt-3 flex items-start gap-2 text-sm font-medium ${headingClass}`}>
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
          <span className="min-w-0">Done. We will send you an alert as soon as it is back in stock.</span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void notifyMe()}
          disabled={phase === "working"}
          className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-70 sm:w-auto ${buttonClass}`}
        >
          {phase === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Notify me when it&apos;s back
        </button>
      )}
      {message && <p role="alert" className={`mt-3 text-sm [overflow-wrap:anywhere] ${subtleClass}`}>{message}</p>}
    </div>
  );
}
