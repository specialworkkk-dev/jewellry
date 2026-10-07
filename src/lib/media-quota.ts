import "server-only";

import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongoose";
import MediaUpload from "@/models/MediaUpload";
import { istDayKey } from "@/lib/plan";

export type MediaKind = "photos" | "videos";

export function dailyLimit(kind: MediaKind, shop: { maxPhotosPerDay?: number; maxVideosPerDay?: number }) {
  return kind === "videos"
    ? Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2)))
    : Math.max(1, Number(shop.maxPhotosPerDay ?? 30));
}

/**
 * Atomically reserves one upload for today (IST). Returns false when the daily
 * limit is already reached. The conditional $inc is a single operation, so
 * concurrent requests can never exceed the limit.
 */
export async function reserveDailyUpload(shopId: string, kind: MediaKind, limit: number) {
  await connectToDatabase();
  const shopObjectId = new Types.ObjectId(shopId);
  const day = istDayKey();
  try {
    await MediaUpload.updateOne(
      { shopId: shopObjectId, day },
      { $setOnInsert: { photos: 0, videos: 0, expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error; // concurrent creation is fine
  }
  const updated = await MediaUpload.findOneAndUpdate(
    { shopId: shopObjectId, day, [kind]: { $lt: limit } },
    { $inc: { [kind]: 1 } },
    { projection: { _id: 1 } },
  );
  return Boolean(updated);
}

/** Gives back a reservation when the upload itself failed. */
export async function releaseDailyUpload(shopId: string, kind: MediaKind) {
  await connectToDatabase();
  await MediaUpload.updateOne(
    { shopId: new Types.ObjectId(shopId), day: istDayKey(), [kind]: { $gt: 0 } },
    { $inc: { [kind]: -1 } },
  ).catch(() => undefined);
}

export function dailyLimitMessage(kind: MediaKind, limit: number) {
  const noun = kind === "videos" ? "video" : "photo";
  return `Daily ${noun} upload limit reached. This shop can upload ${limit} ${noun}${limit === 1 ? "" : "s"} per day.`;
}
