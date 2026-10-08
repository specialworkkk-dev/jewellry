"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";

interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
}

interface StoryViewerProps {
  stories: Story[];
  shopLogo: string;
  shopName: string;
  onClose: () => void;
}

export function StoryViewer({ stories, shopLogo, shopName, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const currentStory = stories[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      progressRef.current = 0;
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, onClose, stories.length]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      progressRef.current = 0;
      setProgress(0);
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") handleNext();
      else if (event.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleNext, onClose]);

  useEffect(() => {
    if (stories.length === 0) return;
    // Videos advance when they end (see onEnded); only images use the timer.
    if (stories[currentIndex]?.mediaType === "VIDEO") return;

    // Auto advance progress bar every 50ms for a 5 second image duration
    const timer = setInterval(() => {
      const next = progressRef.current + 100 / (5000 / 50);
      if (next >= 100) {
        progressRef.current = 0;
        handleNext();
      } else {
        progressRef.current = next;
        setProgress(next);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [handleNext, stories, currentIndex]);

  if (stories.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain bg-black"
      >
        <div role="dialog" aria-modal="true" aria-label={`${shopName} stories`} className="relative w-full max-w-md h-full sm:h-[90vh] bg-gray-900 sm:rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Progress Bars */}
          <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-4">
            {stories.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ 
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute inset-x-0 top-6 z-20 flex items-center justify-between gap-2 px-4 pr-2">
            <div className="flex min-w-0 items-center gap-2">
              <StoreImage src={shopLogo} alt={shopName} sizes="32px" className="h-8 w-8 shrink-0 rounded-full border border-white/20 object-cover" />
              <span className="truncate text-white font-medium text-sm drop-shadow-md">{shopName}</span>
            </div>
            <button type="button" aria-label="Close stories" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media */}
          <div className="flex-1 relative bg-black">
            {currentStory.mediaType === "VIDEO" ? (
              <video
                key={currentStory._id}
                src={currentStory.mediaUrl}
                autoPlay
                muted
                playsInline
                onTimeUpdate={(event) => {
                  const video = event.currentTarget;
                  if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
                }}
                onEnded={handleNext}
                onError={handleNext}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <StoreImage src={currentStory.mediaUrl} alt={`${shopName} story`} sizes="(max-width: 640px) 100vw, 480px" className="w-full h-full object-cover" />
            )}
            
            {/* Click zones for navigation */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer" onClick={handleNext} />
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
