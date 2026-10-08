"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Loader2 } from "lucide-react";
import { validateGoldRates } from "./gold-rate-validation";

export function GoldRateUpdater({ initial22K, initial24K, onSave }: { initial22K?: number, initial24K?: number, onSave: (rate22k: number | null, rate24k: number | null) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rate22K, setRate22K] = useState(initial22K?.toString() || "");
  const [rate24K, setRate24K] = useState(initial24K?.toString() || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const parsed22 = rate22K.trim() ? Number(rate22K) : null;
      const parsed24 = rate24K.trim() ? Number(rate24K) : null;
      const invalid = validateGoldRates(parsed22, parsed24);
      if (invalid) {
        setMessage(`Could not update rates. ${invalid}`);
        return;
      }
      await onSave(parsed22, parsed24);
      setMessage("Gold rates updated on your shop.");
    } catch (error) {
      console.error("Failed to update rates", error);
      setMessage("Could not update rates. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm border-amber-200 bg-amber-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-600" />
          Update Today&apos;s Gold Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
          <div className="flex-1 w-full space-y-1">
            <label htmlFor="gold-rate-22k" className="text-xs font-medium text-amber-800">22K Gold (per gram)</label>
            <input 
              id="gold-rate-22k"
              type="number" 
              value={rate22K}
              onChange={(e) => setRate22K(e.target.value)}
              placeholder="e.g. 6500" 
              className="min-h-11 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-base shadow-sm outline-none transition-colors hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 sm:text-sm"
            />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label htmlFor="gold-rate-24k" className="text-xs font-medium text-amber-800">24K Gold (per gram)</label>
            <input 
              id="gold-rate-24k"
              type="number" 
              value={rate24K}
              onChange={(e) => setRate24K(e.target.value)}
              placeholder="e.g. 7000" 
              className="min-h-11 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-base shadow-sm outline-none transition-colors hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 sm:text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="min-h-11 w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center min-w-[100px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Banner"}
          </button>
        </form>
        {message && <p role="status" className={`mt-3 text-sm font-medium ${message.startsWith("Could") ? "text-red-700" : "text-green-700"}`}>{message}</p>}
      </CardContent>
    </Card>
  );
}
