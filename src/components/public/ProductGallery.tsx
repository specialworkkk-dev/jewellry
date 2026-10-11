"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoreImage } from "@/components/public/StoreImage";
import { Check, Download, LoaderCircle, Play } from "lucide-react";

export interface ProductGalleryProps {
  images: string[];
  videos?: string[];
  productName: string;
  productId: string;
  shopId: string;
  shopSlug: string;
  /** Shop opted in to customers saving watermarked photos (Shop.allowPhotoDownload). */
  allowDownload?: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProductGallery({ images, videos = [], productName, productId, shopId, shopSlug, allowDownload = false }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const mounted = useRef(true);
  const busy = useRef(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(resetTimer.current);
    };
  }, []);

  // Choosing another photo starts from a clean button (an in-flight save keeps its own state).
  const selectMedia = (index: number) => {
    setSelected(index);
    if (busy.current) return;
    window.clearTimeout(resetTimer.current);
    setSaveState("idle");
    setSaveError("");
  };

  const media = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...videos.map((url) => ({ type: "video" as const, url })),
  ];
  const activeMedia = media[selected];
  const canSave = allowDownload && activeMedia?.type === "image" && Boolean(productId && shopId && shopSlug);

  const savePhoto = useCallback(async () => {
    if (busy.current || selected >= images.length) return;
    busy.current = true;
    const index = selected;
    setSaveState("saving");
    setSaveError("");
    let objectUrl: string | undefined;
    try {
      const response = await fetch(`/api/shop/${encodeURIComponent(shopSlug)}/photo?product=${encodeURIComponent(productId)}&i=${index}`);
      if (!response.ok) {
        throw new Error(response.status === 429 ? "Too many saves. Please wait a minute and try again." : "This photo can't be saved right now.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("This photo can't be saved right now.");
      const file = new File([blob], `${shopSlug}-photo-${index + 1}.jpg`, { type: "image/jpeg" });

      let shared = false;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      if (coarse && typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: productName });
          shared = true;
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") {
            // The customer closed the share sheet: nothing was saved, nothing to report.
            if (mounted.current) setSaveState("idle");
            return;
          }
          // Sharing failed for another reason: fall back to a normal download below.
        }
      }
      if (!shared) {
        objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      if (mounted.current) {
        setSaveState("saved");
        resetTimer.current = window.setTimeout(() => { if (mounted.current) setSaveState("idle"); }, 3000);
      }
      // Count the save only after it really happened. Fire-and-forget: analytics must never affect the customer.
      try {
        void fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, eventType: "PHOTO_SAVE", targetId: productId }),
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // ignore
      }
    } catch (error) {
      if (mounted.current) {
        setSaveError(error instanceof Error && error.message ? error.message : "This photo can't be saved right now.");
        setSaveState("error");
      }
    } finally {
      busy.current = false;
      if (objectUrl) {
        const url = objectUrl;
        // Give the browser a moment to start reading the blob before releasing it.
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    }
  }, [selected, images.length, shopSlug, productId, shopId, productName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
        {activeMedia?.type === "image" ? (
          <StoreImage src={activeMedia.url} alt={`${productName} view ${selected + 1}`} sizes="(max-width: 1023px) 100vw, 50vw" preload={selected === 0} className="h-full w-full object-cover" />
        ) : activeMedia?.type === "video" ? (
          <video src={activeMedia.url} controls playsInline preload="metadata" aria-label={`${productName} video ${selected - images.length + 1}`} className="h-full w-full bg-black object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400">No media available</div>
        )}
      </div>
      {canSave && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={savePhoto}
            disabled={saveState === "saving"}
            aria-busy={saveState === "saving"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-wait disabled:opacity-80"
          >
            {saveState === "saving" ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : saveState === "saved" ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Download className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{saveState === "saving" ? "Preparing photo…" : saveState === "saved" ? "Saved" : "Save photo"}</span>
          </button>
          <p role="status" aria-live="polite" className={saveState === "error" ? "text-center text-xs font-medium text-red-600" : "sr-only"}>
            {saveState === "error" ? saveError : saveState === "saving" ? "Preparing your photo" : saveState === "saved" ? "Photo saved" : ""}
          </p>
        </div>
      )}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, index) => (
            <button key={`${item.url}-${index}`} type="button" onClick={() => selectMedia(index)} aria-label={`Show ${item.type} ${index + 1}`} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-100 transition ${selected === index ? "border-amber-500" : "border-transparent hover:border-stone-300"}`}>
              {item.type === "image" ? (
                <StoreImage src={item.url} alt="" thumb sizes="80px" className="h-full w-full object-cover" />
              ) : (
                <><video src={item.url} muted playsInline preload="none" className="h-full w-full bg-black object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/25"><Play className="h-6 w-6 fill-white text-white" /></span></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
