"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ImageUp, Loader2 } from "lucide-react";

interface MediaUploaderProps {
  folder: "products" | "logos" | "covers" | "posts" | "stories";
  onUploadSuccess: (publicUrl: string, key: string) => void;
}

async function optimizeLargePhoto(file: File) {
  if (file.size <= 3.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}

export function MediaUploader({ folder, onUploadSuccess }: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputId = useId();

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
    setSuccess(false);

    try {
      const uploadFile = await optimizeLargePhoto(file);
      let result: { publicUrl: string; key: string } | null = null;

      try {
        const prepareResponse = await fetch("/api/upload/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: uploadFile.name, contentType: uploadFile.type, contentLength: uploadFile.size, folder }),
        });
        if (!prepareResponse.ok) throw new Error("Direct upload preparation failed");
        const prepared = await prepareResponse.json() as { signedUrl: string; publicUrl: string; key: string };
        const uploadResponse = await fetch(prepared.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadFile.type },
          body: uploadFile,
        });
        if (!uploadResponse.ok) throw new Error("Direct upload failed");
        result = { publicUrl: prepared.publicUrl, key: prepared.key };
      } catch {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("folder", folder);
        const fallbackResponse = await fetch("/api/upload/file", { method: "POST", body: formData });
        const fallbackData = await fallbackResponse.json() as { publicUrl?: string; key?: string; error?: string };
        if (!fallbackResponse.ok || !fallbackData.publicUrl || !fallbackData.key) {
          throw new Error(fallbackData.error || "Photo upload failed. Please try a smaller image or check your connection.");
        }
        result = { publicUrl: fallbackData.publicUrl, key: fallbackData.key };
      }

      onUploadSuccess(result.publicUrl, result.key);
      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        id={inputId}
        className="hidden"
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        className="min-h-11 gap-2"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><ImageUp className="h-4 w-4" /> Choose Photo</>}
      </Button>
      {success && <p role="status" className="flex items-center gap-1 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> Uploaded. Save changes below.</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
