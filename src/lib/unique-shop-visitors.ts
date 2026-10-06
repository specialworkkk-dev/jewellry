import "server-only";

import { createHmac } from "node:crypto";
import { Types } from "mongoose";
import Shop from "@/models/Shop";
import ShopVisitor from "@/models/ShopVisitor";
import { isDuplicateKeyError } from "@/lib/validation";
import connectToDatabase from "@/lib/mongoose";

const TRACKING_VERSION = 1;
const ADMISSION_CACHE_TTL_MS = 10 * 60 * 1000;
const ADMISSION_CACHE_MAX_ENTRIES = 10_000;

type AdmissionResult = { allowed: boolean; returning: boolean };
type AdmissionCacheEntry = {
  expiresAt: number;
  result: Promise<AdmissionResult>;
};

const globalWithAdmissionCache = globalThis as typeof globalThis & {
  shopAdmissionCache?: Map<string, AdmissionCacheEntry>;
};
const admissionCache = globalWithAdmissionCache.shopAdmissionCache
  ?? (globalWithAdmissionCache.shopAdmissionCache = new Map());

function cachedAdmission(key: string) {
  const entry = admissionCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    admissionCache.delete(key);
    return null;
  }
  return entry.result;
}

function rememberAdmission(key: string, result: Promise<AdmissionResult>) {
  if (admissionCache.size >= ADMISSION_CACHE_MAX_ENTRIES) {
    const oldestKey = admissionCache.keys().next().value;
    if (oldestKey) admissionCache.delete(oldestKey);
  }
  admissionCache.set(key, { expiresAt: Date.now() + ADMISSION_CACHE_TTL_MS, result });
  result.catch(() => admissionCache.delete(key));
  return result;
}

function clientIp(requestHeaders: Headers) {
  return requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("cf-connecting-ip")
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || "unknown";
}

function hashIp(ip: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for private visitor counting");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function admitUniqueShopVisitor(
  shopId: string,
  maximumVisitors: number,
  requestHeaders: Headers,
  trackingVersion?: number,
) {
  const normalizedLimit = Math.max(1, Math.trunc(maximumVisitors));
  const ipHash = hashIp(clientIp(requestHeaders));
  const cacheKey = `${shopId}:${trackingVersion ?? 0}:${normalizedLimit}:${ipHash}`;
  const warmAdmission = cachedAdmission(cacheKey);
  if (warmAdmission) return warmAdmission;

  return rememberAdmission(cacheKey, admitUncachedVisitor(
    shopId,
    normalizedLimit,
    ipHash,
    trackingVersion,
  ));
}

async function admitUncachedVisitor(
  shopId: string,
  normalizedLimit: number,
  ipHash: string,
  trackingVersion?: number,
): Promise<AdmissionResult> {
  // Public shop data may come from Next's cross-request cache on a fresh
  // serverless instance, so this uncached visitor query must own its connection.
  await connectToDatabase();
  const objectId = new Types.ObjectId(shopId);
  const now = new Date();

  // Existing counters represented total page opens. Reset each shop exactly once
  // when it first moves to unique-IP tracking.
  if (trackingVersion !== TRACKING_VERSION) {
    await Shop.updateOne(
      { _id: objectId, uniqueVisitorTrackingVersion: { $ne: TRACKING_VERSION } },
      { $set: { currentLinkOpens: 0, uniqueVisitorTrackingVersion: TRACKING_VERSION } },
    );
  }

  // Admission is lifetime-based, so returning visitors need only a read. Avoiding
  // a write on every page open keeps the free MongoDB operation budget healthy.
  const returningVisitor = await ShopVisitor.exists({ shopId: objectId, ipHash });
  if (returningVisitor) return { allowed: true, returning: true };

  const reserved = await Shop.findOneAndUpdate(
    { _id: objectId, currentLinkOpens: { $lt: normalizedLimit } },
    { $inc: { currentLinkOpens: 1 } },
    { returnDocument: "after" },
  ).select("currentLinkOpens").lean();

  if (!reserved) {
    const admittedMeanwhile = await ShopVisitor.exists({ shopId: objectId, ipHash });
    return { allowed: Boolean(admittedMeanwhile), returning: Boolean(admittedMeanwhile) };
  }

  try {
    await ShopVisitor.create({ shopId: objectId, ipHash, firstSeenAt: now, lastSeenAt: now });
    return { allowed: true, returning: false };
  } catch (error: unknown) {
    await Shop.updateOne(
      { _id: objectId, currentLinkOpens: { $gt: 0 } },
      { $inc: { currentLinkOpens: -1 } },
    );
    if (isDuplicateKeyError(error)) return { allowed: true, returning: true };
    throw error;
  }
}
