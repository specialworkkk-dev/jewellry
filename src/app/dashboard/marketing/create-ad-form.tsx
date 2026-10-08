"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MediaUploader = dynamic(
  () => import("@/components/ui/media-uploader").then((module) => module.MediaUploader),
  { ssr: false, loading: () => <div className="h-11 animate-pulse rounded-md border bg-gray-50" aria-label="Loading uploader" /> },
);

const inputClass = "block min-h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

const TYPES = [
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/advertisements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title, message,
          imageUrl: imageUrl || undefined,
          linkUrl: linkUrl || undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create advertisement");
      setTitle(""); setMessage(""); setLinkUrl(""); setValidUntil(""); setImageUrl(""); setDone(true);
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
      <input value={title} onChange={(e) => { setDone(false); setTitle(e.target.value); }} maxLength={160} required placeholder={type === "GOLD_RATE" ? "Title (e.g. Today's gold rate)" : "Title"} className={inputClass} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required rows={3} placeholder={type === "GOLD_RATE" ? "e.g. 22K Rs 6,850/g | 24K Rs 7,470/g" : "Message"} className={inputClass} />
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
      <label className="block min-w-0 text-xs text-gray-600">Valid until (optional)
        <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-green-700">Published to your storefront.</p>}
      <Button type="submit" disabled={busy || !title.trim() || !message.trim()} className="min-h-11 w-full">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : "Publish"}
      </Button>
    </form>
  );
}
