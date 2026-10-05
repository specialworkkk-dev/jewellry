"use client";

import { useState, useEffect, useCallback } from "react";
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

  const currentStory = stories[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, onClose, stories.length]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (stories.length === 0) return;
    
    // Auto advance progress bar every 50ms for a 5 second image duration
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / (5000 / 50)); 
      });
    }, 50);

    return () => clearInterval(timer);
  }, [handleNext, stories.length]);

  if (stories.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <div className="relative w-full max-w-md h-full sm:h-[90vh] bg-gray-900 sm:rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
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
          <div className="absolute top-6 inset-x-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <StoreImage src={shopLogo} alt={shopName} className="w-8 h-8 rounded-full border border-white/20" />
              <span className="text-white font-medium text-sm drop-shadow-md">{shopName}</span>
            </div>
            <button onClick={onClose} className="text-white p-1 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media */}
          <div className="flex-1 relative bg-black">
            {currentStory.mediaType === "VIDEO" ? (
              <video src={currentStory.mediaUrl} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <StoreImage src={currentStory.mediaUrl} alt={`${shopName} story`} className="w-full h-full object-cover" />
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
