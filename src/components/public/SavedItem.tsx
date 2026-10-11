"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";

/**
 * Wraps one server-rendered saved-product card and adds the "remove from saved" control.
 * The card disappears immediately; it comes back with a message if the request fails.
 */
export function SavedItem({
  productId,
  shopId,
  productName,
  className,
  children,
}: {
  productId: string;
  shopId: string;
  productName: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "removing" | "removed">("idle");
  const [error, setError] = useState("");

  const remove = async () => {
    if (phase !== "idle") return;
    setPhase("removing");
    setError("");
    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: productId, targetType: "PRODUCT", interactionType: "LIKE", shopId }),
      });
      const data = await response.json().catch(() => ({})) as { state?: boolean };
      if (!response.ok) throw new Error("remove-failed");
      if (data.state === true) {
        // The toggle re-saved it (it had already been removed elsewhere); toggle once more to remove it.
        const again = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: productId, targetType: "PRODUCT", interactionType: "LIKE", shopId }),
        });
        if (!again.ok) throw new Error("remove-failed");
      }
      setPhase("removed");
      router.refresh();
    } catch {
      setPhase("idle");
      setError("Could not remove it. Please try again.");
    }
  };

  if (phase === "removed") return null;
  return (
    <article className={`relative min-w-0 ${className ?? ""}`} aria-busy={phase === "removing"}>
      {children}
      <button
        type="button"
        onClick={() => void remove()}
        disabled={phase === "removing"}
        aria-label={`Remove ${productName} from saved`}
        title="Remove from saved"
        className="absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:opacity-70"
      >
        {phase === "removing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-5 w-5 fill-current" />}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </article>
  );
}
