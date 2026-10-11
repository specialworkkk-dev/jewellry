"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FESTIVAL_LABEL_MAX,
  FESTIVAL_PRESETS,
  formatCountdown,
  formatIstDisplay,
  parseIstLocal,
  sanitizeFestivalLabel,
  suggestFestivalTitle,
  validateFestivalOffer,
} from "@/lib/festival";

const MediaUploader = dynamic(
  () => import("@/components/ui/media-uploader").then((module) => module.MediaUploader),
  { ssr: false, loading: () => <div className="h-11 animate-pulse rounded-md border bg-gray-50" aria-label="Loading uploader" /> },
);

const inputClass = "block min-h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

const TYPES = [
  { value: "FESTIVAL_OFFER", label: "Festival offer", hint: "A premium card with a live countdown. Dates are in Indian Standard Time (IST). Up to 2 at a time." },
  { value: "GOLD_RATE", label: "Gold rate", hint: "Shown as a rate strip. Replaces your previous gold-rate ad." },
  { value: "PROMO_STRIP", label: "Promo strip", hint: "A slim offer banner above your catalogue." },
  { value: "HERO_BANNER", label: "Hero banner", hint: "A larger banner with an image." },
] as const;

export function CreateAdForm() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("PROMO_STRIP");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [festival, setFestival] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [previewNow, setPreviewNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isFestival = type === "FESTIVAL_OFFER";
  const endMs = parseIstLocal(validUntil);
  const startMs = parseIstLocal(startsAt);

  useEffect(() => {
    if (!isFestival) return;
    const update = () => setPreviewNow(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isFestival]);

  const pickPreset = (label: string) => {
    setDone(false);
    const suggested = suggestFestivalTitle(festival);
    setFestival(label);
    // Only replace the title when it is empty or still our previous suggestion.
    if (!title.trim() || title === suggested) setTitle(suggestFestivalTitle(label));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (isFestival) {
      if (validUntil && endMs === null) { setError("End date and time is invalid"); return; }
      if (startsAt && startMs === null) { setError("Start date and time is invalid"); return; }
      const problem = validateFestivalOffer({ title, message, startsAt: startMs, endsAt: endMs });
      if (problem) { setError(problem); return; }
    }
    setBusy(true);
    try {
      const response = await fetch("/api/advertisements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title, message,
          imageUrl: imageUrl || undefined,
          linkUrl: linkUrl || undefined,
          // datetime-local values are IST wall-clock: convert explicitly, never via the browser zone.
          validUntil: isFestival
            ? (endMs !== null ? new Date(endMs).toISOString() : undefined)
            : validUntil ? new Date(validUntil).toISOString() : undefined,
          ...(isFestival
            ? {
                festival: sanitizeFestivalLabel(festival) || undefined,
                startsAt: startMs !== null ? new Date(startMs).toISOString() : undefined,
              }
            : {}),
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create advertisement");
      setTitle(""); setMessage(""); setLinkUrl(""); setValidUntil(""); setImageUrl(""); setFestival(""); setStartsAt(""); setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create advertisement");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClass} aria-label="Advertisement type">
        {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className="text-xs text-gray-500">{TYPES.find((option) => option.value === type)?.hint}</p>
      {isFestival && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Festival (fills the label and title; set your own dates below)</p>
          <div className="flex flex-wrap gap-2">
            {FESTIVAL_PRESETS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => pickPreset(label)}
                aria-pressed={festival === label}
                className={`min-h-11 rounded-full border px-3 text-sm ${festival === label ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700"}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setDone(false); setFestival(""); }}
              aria-pressed={festival !== "" && !(FESTIVAL_PRESETS as readonly string[]).includes(festival)}
              className="min-h-11 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-700"
            >
              Custom
            </button>
          </div>
          <input value={festival} onChange={(e) => setFestival(e.target.value)} maxLength={FESTIVAL_LABEL_MAX} placeholder="Festival label (e.g. Dhanteras)" aria-label="Festival label" className={inputClass} />
        </div>
      )}
      <input value={title} onChange={(e) => { setDone(false); setTitle(e.target.value); }} maxLength={160} required placeholder={type === "GOLD_RATE" ? "Title (e.g. Today's gold rate)" : "Title"} className={inputClass} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required rows={3} placeholder={isFestival ? "Offer, e.g. 15% off making charges" : type === "GOLD_RATE" ? "e.g. 22K Rs 6,850/g | 24K Rs 7,470/g" : "Message"} className={inputClass} />
      {type !== "GOLD_RATE" && (
        <>
          <MediaUploader folder="posts" onUploadSuccess={(url) => setImageUrl(url)} />
          {imageUrl && (
            <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-gray-100">
              <Image src={imageUrl} alt="Banner" fill sizes="80px" className="object-cover" />
              <button type="button" onClick={() => setImageUrl("")} aria-label="Remove image" className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60"><X className="h-3 w-3" /></span></button>
            </div>
          )}
        </>
      )}
      <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Optional link (https://...)" className={inputClass} />
      {isFestival && (
        <label className="block min-w-0 text-xs text-gray-600">Starts (optional, IST)
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
      )}
      <label className="block min-w-0 text-xs text-gray-600">{isFestival ? "Ends (required, IST)" : "Valid until (optional)"}
        <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required={isFestival} className={`${inputClass} mt-1`} />
      </label>
      {isFestival && (
        <div className="min-w-0 rounded-xl bg-neutral-900 p-3 text-white" aria-label="Countdown preview">
          <p className="text-[11px] uppercase tracking-widest text-white/60">Preview</p>
          {festival && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-300 [overflow-wrap:anywhere]">{festival}</p>}
          <p className="mt-1 text-base font-semibold [overflow-wrap:anywhere]">{title || "Your offer title"}</p>
          <p className="mt-0.5 text-sm text-white/80 [overflow-wrap:anywhere]">{message || "Your offer message"}</p>
          <p className="mt-2 text-sm font-semibold tabular-nums text-amber-200">
            {endMs === null || previewNow === null
              ? "Pick an end time to see the countdown"
              : endMs <= previewNow
                ? "End time is in the past"
                : startMs !== null && startMs > previewNow
                  ? `Goes live ${formatIstDisplay(startMs)}`
                  : `Ends in ${formatCountdown(endMs - previewNow)}`}
          </p>
          {endMs !== null && <p className="mt-1 text-xs text-white/60">Ends {formatIstDisplay(endMs)}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-green-700">Published to your storefront.</p>}
      <Button type="submit" disabled={busy || !title.trim() || !message.trim() || (isFestival && !validUntil)} className="min-h-11 w-full">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : "Publish"}
      </Button>
    </form>
  );
}
