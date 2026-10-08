"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ImageUp, Loader2, Video } from "lucide-react";
import { withRetry } from "@/lib/retry";

interface MediaUploaderProps {
  folder: "products" | "logos" | "covers" | "posts" | "stories";
  onUploadSuccess: (publicUrl: string, key: string) => void;
  mediaType?: "image" | "video";
  maxVideoDurationSeconds?: number;
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Unable to read video duration."));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This video cannot be read. Please use MP4, WebM, or MOV."));
    };
    video.src = objectUrl;
  });
}

async function optimizeLargePhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    const needsResize = Math.max(bitmap.width, bitmap.height) > maxDimension;
    const needsCompression = file.size > 1.5 * 1024 * 1024;
    if (!needsResize && !needsCompression) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}

async function fetchWithTransientRetry(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if ([408, 425, 429].includes(response.status) || response.status >= 500) {
        throw new Error(`Temporary upload service failure (${response.status})`);
      }
      return response;
    } finally {
      window.clearTimeout(timeout);
    }
  }, { attempts: 3, baseDelayMs: 200, maxDelayMs: 1_200 });
}

export function MediaUploader({ folder, onUploadSuccess, mediaType = "image", maxVideoDurationSeconds = 30 }: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputId = useId();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = mediaType === "video";
    const allowedTypes = isVideo
      ? new Set(["video/mp4", "video/webm", "video/quicktime"])
      : new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const maxBytes = (isVideo ? 50 : 10) * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      setError(isVideo
        ? "Choose an MP4, WebM, or MOV video under 50 MB."
        : "Choose a JPEG, PNG, WebP or AVIF photo under 10 MB.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const durationSeconds = isVideo ? await readVideoDuration(file) : undefined;
      if (durationSeconds && durationSeconds > maxVideoDurationSeconds + 0.25) {
        throw new Error(`Video must be ${maxVideoDurationSeconds} seconds or shorter.`);
      }
      const uploadFile = isVideo ? file : await optimizeLargePhoto(file);
      let result: { publicUrl: string; key: string } | null = null;

      try {
        const prepareResponse = await fetchWithTransientRetry("/api/upload/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: uploadFile.name, contentType: uploadFile.type, contentLength: uploadFile.size, folder, durationSeconds }),
        }, 10_000);
        const prepared = await prepareResponse.json() as { signedUrl?: string; publicUrl?: string; key?: string; error?: string };
        if (!prepareResponse.ok || !prepared.signedUrl || !prepared.publicUrl || !prepared.key) {
          throw new Error(prepared.error || "Direct upload preparation failed");
        }
        const uploadResponse = await fetchWithTransientRetry(prepared.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadFile.type },
          body: uploadFile,
        }, 90_000);
        if (!uploadResponse.ok) throw new Error("Direct upload failed");
        // Server verifies the stored object (size + real file type) before the key is usable.
        let confirmed = false;
        let confirmError = "Upload verification failed";
        for (let attempt = 0; attempt < 3 && !confirmed; attempt += 1) {
          const confirmResponse = await fetchWithTransientRetry("/api/upload/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: prepared.key }),
          }, 15_000);
          if (confirmResponse.ok) { confirmed = true; break; }
          const confirmData = await confirmResponse.json().catch(() => ({})) as { error?: string };
          confirmError = confirmData.error || confirmError;
          if (confirmResponse.status !== 404) break;
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        if (!confirmed) throw new Error(confirmError);
        result = { publicUrl: prepared.publicUrl, key: prepared.key };
      } catch (directUploadError) {
        if (isVideo) {
          // A TypeError from fetch() means the browser never got a response: network loss, or the
          // storage bucket rejecting this site's origin (CORS). Say so instead of "Failed to fetch".
          if (directUploadError instanceof TypeError) {
            throw new Error("Video upload could not reach storage. Check your connection and try again. If it keeps failing, the storage bucket's CORS rule must allow this website.");
          }
          throw directUploadError;
        }
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("folder", folder);
        if (durationSeconds) formData.append("durationSeconds", durationSeconds.toString());
        const fallbackResponse = await fetchWithTransientRetry(
          "/api/upload/file",
          { method: "POST", body: formData },
          90_000,
        );
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
    <div className="flex min-w-0 max-w-full flex-col gap-2">
      <input
        type="file"
        id={inputId}
        className="hidden"
        onChange={handleFileChange}
        accept={mediaType === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/avif"}
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        className="min-h-11 w-full gap-2 sm:w-auto"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : mediaType === "video" ? <><Video className="h-4 w-4" /> Choose Video</> : <><ImageUp className="h-4 w-4" /> Choose Photo</>}
      </Button>
      {success && <p role="status" className="flex items-start gap-1 text-sm font-medium text-green-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Uploaded successfully.</p>}
      {error && <p role="alert" className="break-words text-sm text-red-600 [overflow-wrap:anywhere]">{error}</p>}
    </div>
  );
}
