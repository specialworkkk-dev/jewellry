import "server-only";

import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongoose";
import MediaUpload from "@/models/MediaUpload";
import MediaReservation from "@/models/MediaReservation";
import { istDayKey } from "@/lib/plan";
import { deleteR2Keys, shopOwnedR2Keys } from "@/lib/r2";
import { RESERVATION_RETENTION_MS, reservationExpiresAt } from "@/lib/media-sniff";

export type MediaKind = "photos" | "videos";

export function dailyLimit(kind: MediaKind, shop: { maxPhotosPerDay?: number; maxVideosPerDay?: number }) {
  return kind === "videos"
    ? Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2)))
    : Math.max(1, Number(shop.maxPhotosPerDay ?? 30));
}

/**
 * Atomically reserves one upload for today (IST). Returns the IST day the unit
 * was charged to, or null when the daily limit is already reached. The
 * conditional $inc is a single operation, so concurrent requests can never
 * exceed the limit. Expired unconfirmed presigned reservations are returned to
 * the counter first.
 */
export async function reserveDailyUpload(shopId: string, kind: MediaKind, limit: number): Promise<string | null> {
  await connectToDatabase();
  await sweepExpiredReservations(shopId);
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
  return updated ? day : null;
}

/** Gives back a reservation when the upload itself failed. */
export async function releaseDailyUpload(shopId: string, kind: MediaKind, day: string = istDayKey()) {
  await connectToDatabase();
  await MediaUpload.updateOne(
    { shopId: new Types.ObjectId(shopId), day, [kind]: { $gt: 0 } },
    { $inc: { [kind]: -1 } },
  ).catch(() => undefined);
}

export function dailyLimitMessage(kind: MediaKind, limit: number) {
  const noun = kind === "videos" ? "video" : "photo";
  return `Daily ${noun} upload limit reached. This shop can upload ${limit} ${noun}${limit === 1 ? "" : "s"} per day.`;
}

/** Records an issued key. State "pending" means a quota unit is held until confirmed or expired. */
export async function createReservation(input: {
  shopId: string;
  key: string;
  kind: MediaKind;
  day: string;
  contentType: string;
  contentLength: number;
  state: "pending" | "confirmed";
}) {
  await connectToDatabase();
  await MediaReservation.create({
    ...input,
    shopId: new Types.ObjectId(input.shopId),
    expiresAt: reservationExpiresAt(),
    purgeAt: new Date(Date.now() + RESERVATION_RETENTION_MS),
  });
}

/**
 * Returns quota for this shop's pending reservations that were never confirmed
 * and deletes their (possibly uploaded) objects. Each reservation is claimed by
 * an atomic pending -> expired transition, so a unit is refunded exactly once
 * and never after a successful confirm.
 */
export async function sweepExpiredReservations(shopId: string, maxClaims = 25) {
  try {
    await connectToDatabase();
    const shopObjectId = new Types.ObjectId(shopId);
    const keys: string[] = [];
    for (let i = 0; i < maxClaims; i += 1) {
      const claimed = await MediaReservation.findOneAndUpdate(
        { shopId: shopObjectId, state: "pending", expiresAt: { $lte: new Date() } },
        { $set: { state: "expired" } },
        { projection: { key: 1, kind: 1, day: 1 } },
      );
      if (!claimed) break;
      await releaseDailyUpload(shopId, claimed.kind, claimed.day);
      keys.push(claimed.key);
    }
    await deleteR2Keys(keys);
  } catch (error) {
    console.error("Reservation sweep failed:", error instanceof Error ? error.message : "unknown error");
  }
}

/** Atomically pending -> confirmed. False when the reservation was already swept/rejected. */
export async function markReservationConfirmed(shopId: string, key: string) {
  await connectToDatabase();
  const updated = await MediaReservation.findOneAndUpdate(
    { shopId: new Types.ObjectId(shopId), key, state: "pending" },
    { $set: { state: "confirmed" } },
    { projection: { _id: 1 } },
  );
  return Boolean(updated);
}

/** Atomically pending -> rejected, refunding the quota unit. Caller deletes the object. */
export async function rejectReservation(shopId: string, key: string) {
  await connectToDatabase();
  const claimed = await MediaReservation.findOneAndUpdate(
    { shopId: new Types.ObjectId(shopId), key, state: "pending" },
    { $set: { state: "rejected" } },
    { projection: { kind: 1, day: 1 } },
  );
  if (claimed) await releaseDailyUpload(shopId, claimed.kind, claimed.day);
  return Boolean(claimed);
}

/**
 * Returns the media URLs that do not map to a confirmed upload of this shop.
 * Empty array means every URL is safe to attach to content.
 */
export async function findUnconfirmedMedia(shopId: string, urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];
  await connectToDatabase();
  const keyByUrl = new Map(urls.map((url) => [url, shopOwnedR2Keys(shopId, [url])[0]]));
  const keys = [...new Set([...keyByUrl.values()].filter((key): key is string => Boolean(key)))];
  const confirmed = new Set(
    (await MediaReservation.find({ shopId: new Types.ObjectId(shopId), key: { $in: keys }, state: "confirmed" })
      .select("key").lean()).map((doc) => doc.key),
  );
  return urls.filter((url) => {
    const key = keyByUrl.get(url);
    return !key || !confirmed.has(key);
  });
}
