"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function EndPollButton({ pollId }: { pollId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function end() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/design-polls/${pollId}/end`, { method: "POST" });
      const data: { error?: string } | null = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) {
        setError(data?.error || "Could not end the poll. Please try again.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("No internet connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
        End poll now
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700">End now and pick the winner from the votes so far?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={end} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Yes, end it
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Keep running
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
