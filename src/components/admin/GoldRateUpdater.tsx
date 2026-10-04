"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Loader2 } from "lucide-react";

export function GoldRateUpdater({ initial22K, initial24K, onSave }: { initial22K?: number, initial24K?: number, onSave: (rate22k: number | null, rate24k: number | null) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [rate22K, setRate22K] = useState(initial22K?.toString() || "");
  const [rate24K, setRate24K] = useState(initial24K?.toString() || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed22 = rate22K ? parseInt(rate22K) : null;
      const parsed24 = rate24K ? parseInt(rate24K) : null;
      await onSave(parsed22, parsed24);
    } catch (error) {
      console.error("Failed to update rates", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm border-amber-200 bg-amber-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-600" />
          Update Today's Gold Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-medium text-amber-800">22K Gold (per gram)</label>
            <input 
              type="number" 
              value={rate22K}
              onChange={(e) => setRate22K(e.target.value)}
              placeholder="e.g. 6500" 
              className="w-full px-3 py-2 text-sm border-amber-200 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white" 
            />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-medium text-amber-800">24K Gold (per gram)</label>
            <input 
              type="number" 
              value={rate24K}
              onChange={(e) => setRate24K(e.target.value)}
              placeholder="e.g. 7000" 
              className="w-full px-3 py-2 text-sm border-amber-200 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center min-w-[100px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Banner"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
