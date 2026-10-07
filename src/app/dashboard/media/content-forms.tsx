"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MediaUploader = dynamic(
  () => import("@/components/ui/media-uploader").then((module) => module.MediaUploader),
  { ssr: false, loading: () => <div className="h-11 animate-pulse rounded-md border bg-gray-50" aria-label="Loading uploader" /> },
);

const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

async function submitJson(url: string, payload: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
}

function Preview({ url, isVideo, onRemove }: { url: string; isVideo: boolean; onRemove: () => void }) {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-gray-100">
      {isVideo
        ? <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        : <Image src={url} alt="Selected media" fill sizes="80px" className="object-cover" />}
      <button type="button" onClick={onRemove} aria-label="Remove media" className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function CreatePostForm({
  products,
  videoEnabled,
  maxVideoSeconds,
}: {
  products: { id: string; name: string }[];
  videoEnabled: boolean;
  maxVideoSeconds: number;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"image" | "video">("image");
  const [urls, setUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const addUrl = (url: string) => {
    setDone(false);
    setUrls((prev) => (kind === "video" ? [url] : [...prev, url].slice(0, 10)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (urls.length === 0) { setError("Upload at least one photo or video first."); return; }
    setBusy(true); setError("");
    try {
      await submitJson("/api/posts", {
        mediaUrls: urls,
        mediaType: kind === "video" ? "VIDEO" : "IMAGE",
        caption,
        tags: tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean),
        linkedProductId: productId || undefined,
      });
      setUrls([]); setCaption(""); setTags(""); setProductId(""); setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish post");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {videoEnabled && (
        <div className="flex gap-2" role="group" aria-label="Post type">
          {(["image", "video"] as const).map((option) => (
            <Button key={option} type="button" size="sm" variant={kind === option ? "default" : "outline"} onClick={() => { setKind(option); setUrls([]); }}>
              {option === "image" ? "Photo post" : "Video reel"}
            </Button>
          ))}
        </div>
      )}
      <MediaUploader key={kind} folder="posts" mediaType={kind} maxVideoDurationSeconds={maxVideoSeconds} onUploadSuccess={addUrl} />
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => <Preview key={url} url={url} isVideo={kind === "video"} onRemove={() => setUrls((prev) => prev.filter((item) => item !== url))} />)}
        </div>
      )}
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} rows={3} placeholder="Write a caption..." className={inputClass} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={inputClass} />
      {products.length > 0 && (
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass} aria-label="Linked product">
          <option value="">No linked product</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-green-700">Post published.</p>}
      <Button type="submit" disabled={busy || urls.length === 0} className="w-full">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : "Publish post"}
      </Button>
    </form>
  );
}

export function CreateStoryForm({ videoEnabled, maxVideoSeconds }: { videoEnabled: boolean; maxVideoSeconds: number }) {
  const router = useRouter();
  const [kind, setKind] = useState<"image" | "video">("image");
  const [url, setUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url) { setError("Upload a photo or video first."); return; }
    setBusy(true); setError("");
    try {
      await submitJson("/api/stories", { mediaUrl: url, mediaType: kind === "video" ? "VIDEO" : "IMAGE", linkUrl: linkUrl || undefined });
      setUrl(""); setLinkUrl(""); setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish story");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {videoEnabled && (
        <div className="flex gap-2" role="group" aria-label="Story type">
          {(["image", "video"] as const).map((option) => (
            <Button key={option} type="button" size="sm" variant={kind === option ? "default" : "outline"} onClick={() => { setKind(option); setUrl(""); }}>
              {option === "image" ? "Photo" : "Video"}
            </Button>
          ))}
        </div>
      )}
      <MediaUploader key={kind} folder="stories" mediaType={kind} maxVideoDurationSeconds={maxVideoSeconds} onUploadSuccess={(next) => { setDone(false); setUrl(next); }} />
      {url && <Preview url={url} isVideo={kind === "video"} onRemove={() => setUrl("")} />}
      <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Optional link (https://...)" className={inputClass} />
      <p className="text-xs text-gray-500">Stories disappear automatically after 24 hours.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-green-700">Story published.</p>}
      <Button type="submit" disabled={busy || !url} className="w-full">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : "Publish story"}
      </Button>
    </form>
  );
}
