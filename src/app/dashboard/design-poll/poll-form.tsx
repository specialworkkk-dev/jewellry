"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import {
  POLL_DEFAULT_DAYS,
  POLL_DEFAULT_TITLE,
  POLL_MAX_CANDIDATES,
  POLL_MAX_DAYS,
  POLL_MIN_CANDIDATES,
  POLL_MIN_DAYS,
  POLL_TITLE_MAX,
} from "@/lib/design-poll";

interface Option {
  id: string;
  name: string;
  image: string;
}

export function PollForm({ products, blockedReason }: { products: Option[]; blockedReason?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState(POLL_DEFAULT_TITLE);
  const [days, setDays] = useState(POLL_DEFAULT_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => {
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return current.length >= POLL_MAX_CANDIDATES ? current : [...current, id];
    });
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (selected.length < POLL_MIN_CANDIDATES) {
      setError(`Choose at least ${POLL_MIN_CANDIDATES} designs.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/design-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, productIds: selected, durationDays: days }),
      });
      const data: { error?: string } | null = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not start the poll. Please try again.");
        // 409 means another poll is running (maybe from another tab): show it.
        if (res.status === 409) router.refresh();
        return;
      }
      setSelected([]);
      router.refresh();
    } catch {
      setError("No internet connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (products.length < POLL_MIN_CANDIDATES) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        You need at least {POLL_MIN_CANDIDATES} published products that are in stock to start a poll. Add or publish more products first.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="poll-title" className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            id="poll-title"
            value={title}
            maxLength={POLL_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="poll-days" className="mb-1 block text-sm font-medium text-gray-700">Runs for</label>
          <select
            id="poll-days"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            {Array.from({ length: POLL_MAX_DAYS - POLL_MIN_DAYS + 1 }, (_, i) => POLL_MIN_DAYS + i).map((value) => (
              <option key={value} value={value}>{value} days</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">Choose {POLL_MIN_CANDIDATES} to {POLL_MAX_CANDIDATES} designs</p>
          <p className="text-sm tabular-nums text-gray-500">{selected.length} of {POLL_MAX_CANDIDATES} chosen</p>
        </div>
        <ul className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => {
            const position = selected.indexOf(product.id);
            const isOn = position !== -1;
            const full = !isOn && selected.length >= POLL_MAX_CANDIDATES;
            return (
              <li key={product.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  disabled={full}
                  aria-pressed={isOn}
                  className={`relative block w-full overflow-hidden rounded-lg border-2 text-left transition focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40 ${isOn ? "border-amber-500" : "border-transparent hover:border-gray-300"}`}
                >
                  <span className="relative block aspect-square bg-gray-100">
                    <StoreImage src={product.image} alt="" thumb sizes="(min-width: 1024px) 15vw, (min-width: 640px) 25vw, 45vw" className="h-full w-full object-cover" />
                    {isOn && (
                      <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black shadow">
                        {position + 1}
                      </span>
                    )}
                  </span>
                  <span className="flex min-h-11 items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-800">
                    {isOn && <Check className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />}
                    <span className="line-clamp-2 [overflow-wrap:anywhere]">{product.name}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-gray-500">If two designs end with the same number of votes, the one you chose first wins.</p>
      </div>

      {(error || blockedReason) && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || blockedReason}</p>
      )}

      <button
        type="submit"
        disabled={busy || Boolean(blockedReason) || selected.length < POLL_MIN_CANDIDATES}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-black transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Start the poll now
      </button>
    </form>
  );
}
