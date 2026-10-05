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

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const maxBytes = 10 * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      setError("Choose a JPEG, PNG, WebP or AVIF photo under 10 MB.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const prepareResponse = await fetch("/api/upload/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          contentLength: file.size,
          folder,
        }),
      });

      if (!prepareResponse.ok) {
        const data = await prepareResponse.json() as { error?: string };
        throw new Error(data.error || "Failed to upload file");
      }
      const { signedUrl, publicUrl, key } = await prepareResponse.json() as { signedUrl: string; publicUrl: string; key: string };

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Photo upload failed. Check your connection and try again.");

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
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => document.getElementById(`upload-${folder}`)?.click()}
      >
        {isUploading ? "Uploading photo..." : "Choose Photo"}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
