"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

export function ShopPlanFields({ initialPrice, initialEndDate }: { initialPrice: number; initialEndDate: string }) {
  const [price, setPrice] = useState(Math.max(0, initialPrice));
  const premium = price > 0;

  return (
    <div className="space-y-4 min-w-0 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-amber-400 p-2 text-gray-950"><Crown className="h-4 w-4" /></div>
        <div>
          <h4 className="font-semibold text-gray-950">Billing & Plan</h4>
          <p className="mt-1 text-xs leading-5 text-gray-600">₹0 keeps this shop on Free. Any positive price activates Premium and enables expiry reminders.</p>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="plan-price">Plan price (₹)</label>
        <input
          id="plan-price"
          type="number"
          name="planPrice"
          min={0}
          max={10000000}
          step="0.01"
          value={price}
          onChange={(event) => setPrice(Math.max(0, Number(event.target.value) || 0))}
          className="min-h-11 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-base font-semibold text-gray-900 sm:text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800" htmlFor="plan-end-date">Premium end date</label>
        <input
          id="plan-end-date"
          type="date"
          name="planEndsAt"
          defaultValue={initialEndDate}
          disabled={!premium}
          required={premium}
          className="min-h-11 w-full min-w-0 rounded-md border border-amber-200 bg-white px-3 py-2 text-base sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        />
        <p className="text-xs text-amber-800">{premium ? "Required. Reminders begin three days before this date." : "Enter a price above ₹0 to enable the Premium end date."}</p>
      </div>
      <div className="rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-gray-700">
        Current selection: {premium ? `Premium — ₹${price.toLocaleString("en-IN")}` : "Free"}
      </div>
    </div>
  );
}
