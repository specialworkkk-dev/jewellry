"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StoreImage } from "@/components/public/StoreImage";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";
import type { StorefrontTemplateId } from "@/lib/storefront-template";
import { formatCountdown, countdownBreakdown, spokenCountdown } from "@/lib/festival";

export interface FestivalOfferData {
  id: string;
  festival?: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  /** ISO time the offer ends. */
  endsAt: string;
  /** ISO server time at render; the countdown follows this, not the visitor's clock. */
  serverNow: string;
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

/**
 * One festival offer with a live countdown. The first render uses only server-provided values
 * (so hydration matches); after mount it measures the server/phone clock offset once and ticks:
 * every 30s normally, every 1s in the last hour, paused while the tab is hidden. At zero it hides
 * itself and refreshes the route once.
 */
export function FestivalOfferCard({ offer, template }: { offer: FestivalOfferData; template: StorefrontTemplateId }) {
  const router = useRouter();
  const theme = STOREFRONT_THEMES[template];
  const endMs = Date.parse(offer.endsAt);
  const serverNowMs = Date.parse(offer.serverNow);
  const [now, setNow] = useState(serverNowMs);
  const refreshed = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(endMs) || !Number.isFinite(serverNowMs)) return;
    const offset = serverNowMs - Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => Date.now() + offset;

    const tick = () => {
      const t = current();
      setNow(t);
      const remaining = endMs - t;
      if (remaining <= 0) {
        if (!refreshed.current) {
          refreshed.current = true;
          router.refresh();
        }
        return;
      }
      // 1s ticks (aligned to the second) in the last hour, else 30s but never past the 1h mark.
      const toLastHour = remaining - 3_600_000;
      const delay = toLastHour <= 0 ? remaining % 1000 || 1000 : Math.min(30_000, toLastHour);
      timer = setTimeout(tick, Math.max(50, delay));
    };
    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (document.visibilityState === "visible") tick();
    };

    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [endMs, serverNowMs, router]);

  if (!Number.isFinite(endMs)) return null;
  const remaining = endMs - now;
  if (remaining <= 0) return null;
  const lastHour = countdownBreakdown(remaining).showSeconds;

  const body = (
    <>
      {offer.imageUrl && (
        <div className="relative aspect-[16/7] w-full shrink-0 bg-black/20 sm:aspect-auto sm:w-2/5 sm:min-h-40">
          <StoreImage src={offer.imageUrl} alt={offer.title} sizes="(min-width: 768px) 40vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2.5 px-4 py-4 sm:px-5">
        {offer.festival && (
          <span className="inline-block max-w-full rounded-full border border-current/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] [overflow-wrap:anywhere]">
            {offer.festival}
          </span>
        )}
        <h3 className="[overflow-wrap:anywhere] text-xl font-semibold leading-snug sm:text-2xl" style={{ fontFamily: theme.display }}>
          {offer.title}
        </h3>
        <p className="[overflow-wrap:anywhere] text-sm leading-relaxed opacity-90">{offer.message}</p>
        <div
          role="timer"
          aria-label={`Offer ends in ${spokenCountdown(remaining)}`}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-current/25 bg-black/20 px-3 py-2 text-sm font-semibold tabular-nums"
        >
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full bg-current ${lastHour ? "motion-safe:animate-pulse" : ""}`} />
          <span aria-hidden className="[overflow-wrap:anywhere]">Ends in {formatCountdown(remaining)}</span>
        </div>
      </div>
    </>
  );

  const cls = `${theme.banner} flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-md sm:flex-row sm:items-stretch ${offer.linkUrl ? "transition hover:shadow-lg" : ""}`;
  if (!offer.linkUrl) return <div className={cls}>{body}</div>;
  return isExternal(offer.linkUrl)
    ? <a href={offer.linkUrl} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <Link href={offer.linkUrl} className={cls}>{body}</Link>;
}
