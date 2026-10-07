"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Sends PATCH (toggle) or DELETE to an owner content endpoint, then refreshes the page. */
export function RowActions({
  endpoint,
  noun,
  toggle,
}: {
  endpoint: string;
  noun: string;
  toggle?: { field: "isActive" | "isPublished"; value: boolean; onLabel: string; offLabel: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState("");

  const run = async (kind: "toggle" | "delete") => {
    if (kind === "delete" && !window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    setBusy(kind);
    setError("");
    try {
      const response = await fetch(endpoint, kind === "delete"
        ? { method: "DELETE" }
        : {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [toggle!.field]: !toggle!.value }),
          });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || `Could not update ${noun}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not update ${noun}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {toggle && (
          <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("toggle")}>
            {busy === "toggle" ? <Loader2 className="h-4 w-4 animate-spin" /> : toggle.value ? toggle.offLabel : toggle.onLabel}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("delete")} className="text-red-600 hover:text-red-700" aria-label={`Delete ${noun}`}>
          {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p role="alert" className="max-w-56 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
