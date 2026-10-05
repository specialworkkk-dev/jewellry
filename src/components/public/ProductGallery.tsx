"use client";

import { useState } from "react";
import { StoreImage } from "@/components/public/StoreImage";
import { Play } from "lucide-react";

export function ProductGallery({ images, videos = [], productName }: { images: string[]; videos?: string[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const media = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...videos.map((url) => ({ type: "video" as const, url })),
  ];
  const activeMedia = media[selected];

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
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, index) => (
            <button key={`${item.url}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Show ${item.type} ${index + 1}`} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-100 transition ${selected === index ? "border-amber-500" : "border-transparent hover:border-stone-300"}`}>
              {item.type === "image" ? (
                <StoreImage src={item.url} alt="" sizes="80px" className="h-full w-full object-cover" />
              ) : (
                <><video src={item.url} muted playsInline preload="metadata" className="h-full w-full bg-black object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/25"><Play className="h-6 w-6 fill-white text-white" /></span></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
