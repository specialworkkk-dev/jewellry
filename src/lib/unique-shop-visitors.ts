import "server-only";

import { createHmac } from "node:crypto";
import { Types } from "mongoose";
import Shop from "@/models/Shop";
import ShopVisitor from "@/models/ShopVisitor";
import { isDuplicateKeyError } from "@/lib/validation";

const TRACKING_VERSION = 1;

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
  const objectId = new Types.ObjectId(shopId);
  const ipHash = hashIp(clientIp(requestHeaders));
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
