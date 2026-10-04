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
        const data = await res.json();
        throw new Error(data.error || "Failed to upload file");
      }
      
      const { publicUrl, key } = await res.json();

      // Callback with the final URL
      onUploadSuccess(publicUrl, key);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed");
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
        accept="image/*,video/*"
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
