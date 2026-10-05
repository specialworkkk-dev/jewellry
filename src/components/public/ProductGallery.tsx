"use client";

import { useState } from "react";
import { StoreImage } from "@/components/public/StoreImage";

export function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
        {activeImage ? (
          <StoreImage src={activeImage} alt={`${productName} view ${selected + 1}`} sizes="(max-width: 1023px) 100vw, 50vw" preload={selected === 0} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400">No image available</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button key={`${image}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Show image ${index + 1}`} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-100 transition ${selected === index ? "border-amber-500" : "border-transparent hover:border-stone-300"}`}>
              <StoreImage src={image} alt="" sizes="80px" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
