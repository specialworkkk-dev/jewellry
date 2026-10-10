"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { StoryViewer } from "@/components/public/StoryViewer";
import { StoreImage } from "@/components/public/StoreImage";

interface RowStory {
  _id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
}

export function StoriesRow({
  stories,
  shopId,
  shopName,
  shopLogo,
  ringClass,
  labelClass,
}: {
  stories: RowStory[];
  shopId: string;
  shopName: string;
  shopLogo: string;
  ringClass: string;
  labelClass: string;
}) {
  // Index to start from; the viewer receives the tail so earlier stories are skipped.
  const [openFrom, setOpenFrom] = useState<number | null>(null);
  if (stories.length === 0) return null;

  const open = (index: number) => {
    setOpenFrom(index);
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, eventType: "STORY_VIEW", targetId: stories[index]._id }),
      keepalive: true,
    }).catch(() => undefined);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1" aria-label="Stories">
        {stories.map((story, index) => (
          <button
            key={story._id}
            type="button"
            onClick={() => open(index)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 rounded-full"
            aria-label={`Open story ${index + 1} from ${shopName}`}
          >
            <span className={`relative block h-16 w-16 overflow-hidden rounded-full border-2 p-0.5 ${ringClass}`}>
              <span className="relative block h-full w-full overflow-hidden rounded-full bg-black/10">
                {story.mediaType === "VIDEO" ? (
                  <video src={story.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <StoreImage src={story.mediaUrl} alt="" thumb sizes="64px" className="h-full w-full object-cover" />
                )}
              </span>
            </span>
            <span className={`w-full truncate text-center text-[11px] ${labelClass}`}>{index === 0 ? shopName : `Story ${index + 1}`}</span>
          </button>
        ))}
      </div>
      {/* Portal to <body>: an ancestor with backdrop-filter would otherwise become the
          containing block of the viewer's `position: fixed` and clip it to that card. */}
      {openFrom !== null && typeof document !== "undefined" && createPortal(
        <StoryViewer
          stories={stories.slice(openFrom)}
          shopLogo={shopLogo}
          shopName={shopName}
          onClose={() => setOpenFrom(null)}
        />,
        document.body,
      )}
    </>
  );
}
