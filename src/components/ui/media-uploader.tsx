"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MediaUploaderProps {
  folder: "products" | "logos" | "covers" | "posts" | "stories";
  onUploadSuccess: (publicUrl: string, key: string) => void;
}

export function MediaUploader({ folder, onUploadSuccess }: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"]);
    const maxBytes = file.type.startsWith("image/") ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      setError(`Choose a supported ${file.type.startsWith("video/") ? "video under 50 MB" : "image under 10 MB"}.`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Failed to upload file");
      }
      
      const { publicUrl, key } = await res.json() as { publicUrl: string; key: string };

      // Callback with the final URL
      onUploadSuccess(publicUrl, key);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        id={`upload-${folder}`}
        className="hidden"
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => document.getElementById(`upload-${folder}`)?.click()}
      >
        {isUploading ? "Uploading..." : "Upload Media"}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
