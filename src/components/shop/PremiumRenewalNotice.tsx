"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarDays, Crown, MessageCircle, ShieldCheck, X } from "lucide-react";

type PremiumRenewalNoticeProps = {
  shopId: string;
  shopName: string;
  planPrice: number;
  planEndsAt: string;
  daysRemaining: number;
  expired: boolean;
  supportPhone?: string;
  supportEmail?: string;
};

function indiaDateAndSlot() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const date = `${value("year")}-${value("month")}-${value("day")}`;

  // Three reminder opportunities in India time: morning, afternoon and evening.
  if (hour < 8) return { date, slot: -1 };
  if (hour < 13) return { date, slot: 0 };
  if (hour < 18) return { date, slot: 1 };
  return { date, slot: 2 };
}

export function PremiumRenewalNotice({
  shopId,
  shopName,
  planPrice,
  planEndsAt,
  daysRemaining,
  expired,
  supportPhone,
  supportEmail,
}: PremiumRenewalNoticeProps) {
  const [showTimedReminder, setShowTimedReminder] = useState(false);
  const formattedPrice = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(planPrice);
  const formattedEndDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(planEndsAt));

  const paymentHref = useMemo(() => {
    const message = encodeURIComponent(
      `Hello, I want to renew the LuxeStore Premium plan for ${shopName}. Plan amount: ₹${formattedPrice}.`,
    );
    const phone = supportPhone?.replace(/\D/g, "") ?? "";
    if (phone) return `https://wa.me/${phone}?text=${message}`;
    if (supportEmail) return `mailto:${supportEmail}?subject=${encodeURIComponent(`Premium renewal — ${shopName}`)}&body=${message}`;
    return "#";
  }, [formattedPrice, shopName, supportEmail, supportPhone]);

  useEffect(() => {
    const checkReminder = () => {
      const { date, slot } = indiaDateAndSlot();
      if (slot < 0) return;
      const key = `luxestore-premium-reminder-v1:${shopId}:${date}:${slot}`;
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "shown");
      setShowTimedReminder(true);
    };

    const initialCheck = window.setTimeout(checkReminder, 0);
    const interval = window.setInterval(checkReminder, 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkReminder();
    };
    window.addEventListener("focus", checkReminder);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener("focus", checkReminder);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [shopId]);

  const heading = expired
    ? "Your Premium plan has expired"
    : daysRemaining === 1
      ? "Premium expires tomorrow"
      : `Premium expires in ${daysRemaining} days`;

  const action = (
    <a
      href={paymentHref}
      target={paymentHref.startsWith("http") ? "_blank" : undefined}
      rel={paymentHref.startsWith("http") ? "noreferrer" : undefined}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-black"
    >
      <MessageCircle className="h-4 w-4" /> Pay / Renew Premium
    </a>
  );

  return (
    <>
      <section className={`mb-6 overflow-hidden rounded-2xl border shadow-sm ${expired ? "border-red-200 bg-red-50" : "border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-white"}`}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${expired ? "bg-red-100 text-red-700" : "bg-amber-400 text-gray-950"}`}>
            <Crown className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-gray-950 sm:text-lg">{heading}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">₹{formattedPrice}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Valid until {formattedEndDate}</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Keep Premium service uninterrupted</span>
            </div>
          </div>
          {action}
        </div>
      </section>

      {showTimedReminder && (
        <aside role="alert" className="fixed inset-x-3 bottom-4 z-[75] mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-black/25">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><BellRing className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-950">Premium payment reminder</h3>
                <p className="mt-1 text-sm leading-5 text-gray-600">{heading}. Renew now to keep your shop&apos;s Premium service running smoothly.</p>
              </div>
              <button type="button" onClick={() => setShowTimedReminder(false)} aria-label="Dismiss reminder" className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowTimedReminder(false)} className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Remind later</button>
              {action}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
