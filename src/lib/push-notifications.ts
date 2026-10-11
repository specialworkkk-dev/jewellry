import "server-only";

import { after } from "next/server";
import webpush from "web-push";
import connectToDatabase from "@/lib/mongoose";
import {
  customerNotificationTemplates,
  defaultTemplateForTrigger,
  renderNotificationText,
  targetedNotificationTriggers,
  type CustomerNotificationTrigger,
} from "@/lib/notification-templates";
import PushSubscriptionModel from "@/models/PushSubscription";
import OwnerPushSubscription from "@/models/OwnerPushSubscription";
import Shop from "@/models/Shop";
import ShopNotificationSettings from "@/models/ShopNotificationSettings";
import { httpStatusFromError, isTransientHttpError, withRetry } from "@/lib/retry";
import NotificationJob from "@/models/NotificationJob";
import Interaction from "@/models/Interaction";
import Product from "@/models/Product";
import { cleanString, isObjectId } from "@/lib/validation";
import {
  BACK_IN_STOCK_ALERT_WINDOW_MS,
  PRICE_DROP_ALERT_WINDOW_MS,
  buildAlertValues,
  selectAudienceSubscriptionIds,
} from "@/lib/wishlist-alerts";

export const MAX_SUBSCRIPTION_FAILURES = 10;

class PartialDeliveryError extends Error {
  constructor(readonly failedIds: string[]) {
    super(`Push delivery failed for ${failedIds.length} subscription(s)`);
  }
}

type PushContext = {
  entityId?: string;
  productName?: string;
  price?: number;
};

type StoredSubscription = {
  _id: { toString(): string };
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

function pushIsConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    && process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;

  const configuredSubject = process.env.VAPID_SUBJECT?.trim();
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  const subject = configuredSubject || (appUrl?.startsWith("https://") ? appUrl : "mailto:support@luxestore.app");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function deliverShopNotification(
  shopId: string,
  trigger: CustomerNotificationTrigger,
  context: PushContext,
  /** undefined = every subscriber of the shop; an array (even empty) = ONLY those subscriptions. */
  restrictToSubscriptionIds?: string[],
) {
  // Safety net: alerts meant for people who saved a product must never fan out to the whole shop.
  if (!restrictToSubscriptionIds && targetedNotificationTriggers.includes(trigger)) return;
  if (!configureWebPush()) return;
  await connectToDatabase();

  const [shop, settings, subscriptions] = await Promise.all([
    Shop.findOne({ _id: shopId, isApproved: true, isActive: true })
      .select("name slug")
      .lean(),
    ShopNotificationSettings.findOne({ shopId }).lean(),
    PushSubscriptionModel.find(restrictToSubscriptionIds ? { shopId, _id: { $in: restrictToSubscriptionIds } } : { shopId })
      .select("endpoint expirationTime keys")
      .limit(5000)
      .lean<StoredSubscription[]>(),
  ]);

  if (!shop || settings?.enabled === false || subscriptions.length === 0) return;

  const triggerSetting = settings?.triggers?.find(
    (item: { trigger: CustomerNotificationTrigger }) => item.trigger === trigger,
  );
  if (triggerSetting?.enabled === false) return;

  const selectedTemplate = customerNotificationTemplates.find(
    (template) => template.id === triggerSetting?.templateId && template.trigger === trigger,
  ) || defaultTemplateForTrigger(trigger);
  const values = buildAlertValues({ shopName: String(shop.name), productName: context.productName, price: context.price });
  const rawTitle = triggerSetting?.customTitle?.trim() || selectedTemplate.title;
  const rawBody = triggerSetting?.customBody?.trim() || selectedTemplate.body;
  const productUrl = context.entityId && trigger.startsWith("product.")
    ? `/shop/${shop.slug}/product/${context.entityId}`
    : `/shop/${shop.slug}`;
  const payload = JSON.stringify({
    title: renderNotificationText(rawTitle, values),
    body: renderNotificationText(rawBody, values),
    url: productUrl,
    icon: `/api/shop/${shop.slug}/icon/192`,
    badge: "/icon-192.png",
    // Targeted alerts are per product so one product's alert never replaces another's on the device.
    tag: `luxestore:${shopId}:${trigger}${targetedNotificationTriggers.includes(trigger) && context.entityId ? `:${context.entityId}` : ""}`,
  });

  const expiredIds: string[] = [];
  const deliveredIds: string[] = [];
  const failedIds: string[] = [];

  for (let index = 0; index < subscriptions.length; index += 25) {
    const batch = subscriptions.slice(index, index + 25);
    await Promise.all(batch.map(async (subscription) => {
      try {
        await withRetry(() => webpush.sendNotification({
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
          }, payload, {
            TTL: 24 * 60 * 60,
            urgency: "normal",
            timeout: 8_000,
          }), {
            attempts: 3,
            baseDelayMs: 200,
            maxDelayMs: 1_000,
            shouldRetry: isTransientHttpError,
          });
        deliveredIds.push(subscription._id.toString());
      } catch (error: unknown) {
        const statusCode = httpStatusFromError(error);
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription._id.toString());
        else failedIds.push(subscription._id.toString());
      }
    }));
  }

  const updates: Promise<unknown>[] = [];
  if (expiredIds.length) updates.push(PushSubscriptionModel.deleteMany({ _id: { $in: expiredIds } }));
  if (deliveredIds.length) {
    updates.push(PushSubscriptionModel.updateMany(
      { _id: { $in: deliveredIds } },
      { $set: { lastDeliveredAt: new Date(), failureCount: 0 } },
    ));
  }
  if (failedIds.length) {
    updates.push(PushSubscriptionModel.updateMany(
      { _id: { $in: failedIds } },
      { $inc: { failureCount: 1 } },
    ));
  }
  // Prune subscriptions that keep failing so they stop slowing every send.
  updates.push(PushSubscriptionModel.deleteMany({ shopId, failureCount: { $gte: MAX_SUBSCRIPTION_FAILURES } }));
  await Promise.all(updates);
  if (failedIds.length) throw new PartialDeliveryError(failedIds);
}

const JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_JOB_ATTEMPTS = 5;

export async function processNotificationJob(jobId: string) {
  if (!pushIsConfigured() || !isObjectId(jobId)) return false;
  await connectToDatabase();
  const staleLock = new Date(Date.now() - 10 * 60 * 1000);
  const job = await NotificationJob.findOneAndUpdate(
    {
      _id: jobId,
      attempts: { $lt: MAX_JOB_ATTEMPTS },
      availableAt: { $lte: new Date() },
      $or: [
        { status: "PENDING" },
        { status: "PROCESSING", lockedAt: { $lt: staleLock } },
      ],
    },
    {
      $set: { status: "PROCESSING", lockedAt: new Date() },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  ).lean();
  if (!job) return false;

  try {
    const ids = (list?: { toString(): string }[]) => list?.map((id) => id.toString());
    const retryIds = ids(job.retrySubscriptionIds);
    // Retries target only the failed subscriptions; targeted alerts always stay inside their audience.
    const restrictTo = retryIds?.length ? retryIds : ids(job.audienceSubscriptionIds);
    await deliverShopNotification(
      job.shopId.toString(),
      job.trigger as CustomerNotificationTrigger,
      job.context || {},
      restrictTo,
    );
    await NotificationJob.updateOne({ _id: job._id }, {
      $set: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
      },
      $unset: { lockedAt: "", lastError: "", retrySubscriptionIds: "" },
    });
    return true;
  } catch (error) {
    const attempts = Number(job.attempts || 1);
    const terminal = attempts >= MAX_JOB_ATTEMPTS;
    const retryDelayMs = Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempts - 1));
    await NotificationJob.updateOne({ _id: job._id }, {
      $set: {
        status: terminal ? "FAILED" : "PENDING",
        availableAt: new Date(Date.now() + retryDelayMs),
        lastError: cleanString(error instanceof Error ? error.message : "Notification delivery failed", 500),
        expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
        // Retry only the subscriptions that failed so successful ones are not re-notified.
        ...(error instanceof PartialDeliveryError ? { retrySubscriptionIds: error.failedIds } : {}),
      },
      $unset: { lockedAt: "" },
    });
    throw error;
  }
}

export async function drainPendingNotificationJobs(limit = 5) {
  if (!pushIsConfigured()) return { processed: 0 };
  await connectToDatabase();
  const jobs = await NotificationJob.find({
    status: "PENDING",
    attempts: { $lt: MAX_JOB_ATTEMPTS },
    availableAt: { $lte: new Date() },
  })
    .sort({ availableAt: 1 })
    .limit(Math.min(20, Math.max(1, limit)))
    .select("_id")
    .lean();

  const results = await Promise.allSettled(
    jobs.map((job) => processNotificationJob(job._id.toString())),
  );
  return { processed: results.filter((result) => result.status === "fulfilled" && result.value).length };
}

export async function scheduleShopPushNotification(
  shopId: string,
  trigger: CustomerNotificationTrigger,
  context: PushContext = {},
) {
  if (!pushIsConfigured()) return;
  if (targetedNotificationTriggers.includes(trigger)) {
    console.error(`Refusing to broadcast targeted notification ${trigger}`);
    return;
  }
  await connectToDatabase();
  let jobId: string | null = null;
  try {
    const job = await NotificationJob.create({
      shopId,
      trigger,
      context: {
        entityId: cleanString(context.entityId, 100) || undefined,
        productName: cleanString(context.productName, 200) || undefined,
        price: typeof context.price === "number" && Number.isFinite(context.price) && context.price > 0 ? context.price : undefined,
      },
      expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
    });
    jobId = job._id.toString();
  } catch (error) {
    // A queue write must not roll back the owner's successful business change.
    console.error("Unable to enqueue shop push notification", error);
  }

  after(async () => {
    try {
      if (jobId) await processNotificationJob(jobId);
      else await deliverShopNotification(shopId, trigger, context);
      await drainPendingNotificationJobs(2);
    } catch (error) {
      // A push-provider outage must never roll back the owner's successful edit.
      console.error("Shop push notification delivery failed", error);
    }
  });
}

type WishlistAlert = {
  shopId: string;
  productId: string;
  productName: string;
  trigger: "product.price-dropped" | "product.back-in-stock";
  /** New price, for price-drop alerts. */
  price?: number;
};

/**
 * Queue a targeted alert for the people who saved this product AND opted in to this shop's
 * notifications on the same device/browser. Never broadcasts: with no matching audience nothing is
 * created. Runs after the response so the owner's save is never slowed down or rolled back.
 */
export function scheduleWishlistAlert(alert: WishlistAlert) {
  if (!pushIsConfigured() || !isObjectId(alert.shopId) || !isObjectId(alert.productId)) return;
  after(async () => {
    try {
      const jobId = await queueWishlistAlert(alert);
      if (jobId) await processNotificationJob(jobId);
      await drainPendingNotificationJobs(2);
    } catch (error) {
      console.error("Wishlist alert failed", error);
    }
  });
}

/** Creates the targeted job (or returns null when there is nothing to send). Exported for tests/tools. */
export async function queueWishlistAlert(alert: WishlistAlert): Promise<string | null> {
  await connectToDatabase();
  const { shopId, productId, trigger } = alert;
  const now = Date.now();

  const [shop, settings] = await Promise.all([
    Shop.exists({ _id: shopId, isApproved: true, isActive: true }),
    ShopNotificationSettings.findOne({ shopId }).lean(),
  ]);
  if (!shop || settings?.enabled === false) return null;
  const triggerSetting = settings?.triggers?.find((item: { trigger: string }) => item.trigger === trigger);
  if (triggerSetting?.enabled === false) return null;

  // Audience = subscriptions of this shop whose visitor saved this product.
  const subscriptions = await PushSubscriptionModel.find({ shopId, actorId: { $exists: true, $ne: null } })
    .select("_id actorId")
    .limit(5000)
    .lean<{ _id: { toString(): string }; actorId?: { toString(): string } }[]>();
  if (subscriptions.length === 0) return null;
  const actorIds = [...new Set(subscriptions.map((item) => String(item.actorId)))];
  const savers = await Interaction.find({
    shopId,
    targetId: productId,
    targetType: "PRODUCT",
    interactionType: "LIKE",
    userId: { $in: actorIds },
  }).select("userId").lean<{ userId: { toString(): string } }[]>();
  const audience = selectAudienceSubscriptionIds(
    subscriptions.map((item) => ({ id: item._id.toString(), actorId: item.actorId ? String(item.actorId) : null })),
    savers.map((item) => item.userId.toString()),
  );
  if (audience.length === 0) return null;

  if (trigger === "product.price-dropped") {
    // Atomic once-per-24h guard: only the caller that flips lastPriceDropAlertAt may send.
    const claimed = await Product.findOneAndUpdate(
      {
        _id: productId,
        shopId,
        isPublished: true,
        stockStatus: { $ne: "OUT_OF_STOCK" },
        $or: [
          { lastPriceDropAlertAt: { $exists: false } },
          { lastPriceDropAlertAt: null },
          { lastPriceDropAlertAt: { $lte: new Date(now - PRICE_DROP_ALERT_WINDOW_MS) } },
        ],
      },
      { $set: { lastPriceDropAlertAt: new Date(now) } },
      { returnDocument: "after" },
    ).select("_id").lean();
    if (!claimed) return null;
  } else {
    const live = await Product.exists({ _id: productId, shopId, isPublished: true, stockStatus: { $ne: "OUT_OF_STOCK" } });
    if (!live) return null;
    const recent = await NotificationJob.exists({
      shopId,
      trigger,
      "context.entityId": productId,
      createdAt: { $gte: new Date(now - BACK_IN_STOCK_ALERT_WINDOW_MS) },
    });
    if (recent) return null;
  }

  const context = { entityId: productId, productName: alert.productName, price: alert.price };
  try {
    const job = await NotificationJob.create({
      shopId,
      trigger,
      context: {
        entityId: productId,
        productName: cleanString(alert.productName, 200) || undefined,
        price: typeof alert.price === "number" && Number.isFinite(alert.price) && alert.price > 0 ? alert.price : undefined,
      },
      audienceSubscriptionIds: audience,
      expiresAt: new Date(now + JOB_RETENTION_MS),
    });
    return job._id.toString();
  } catch (error) {
    console.error("Unable to enqueue wishlist alert", error);
    // Queue write failed: still deliver once, strictly inside the audience.
    await deliverShopNotification(shopId, trigger, context, audience);
    return null;
  }
}

export function ownerPushIsConfigured() {
  return pushIsConfigured();
}

const MAX_OWNER_DEVICES = 20;

async function deliverOwnerEnquiryPush(shopId: string, enquiry: { customerName: string; message: string; productName?: string }) {
  if (!configureWebPush()) return;
  await connectToDatabase();
  const subscriptions = await OwnerPushSubscription.find({ shopId })
    .select("endpoint expirationTime keys")
    .limit(MAX_OWNER_DEVICES)
    .lean<StoredSubscription[]>();
  if (subscriptions.length === 0) return;

  const snippet = enquiry.message.length > 120 ? `${enquiry.message.slice(0, 117)}...` : enquiry.message;
  const payload = JSON.stringify({
    title: enquiry.productName ? `New enquiry: ${enquiry.productName}` : "New customer enquiry",
    body: `${enquiry.customerName}: ${snippet}`,
    url: "/dashboard/enquiries",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `luxestore-owner-enquiry:${shopId}`,
  });

  const expiredIds: string[] = [];
  const deliveredIds: string[] = [];
  const failedIds: string[] = [];
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await withRetry(() => webpush.sendNotification({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      }, payload, { TTL: 24 * 60 * 60, urgency: "high", timeout: 8_000 }), {
        attempts: 2,
        baseDelayMs: 200,
        maxDelayMs: 1_000,
        shouldRetry: isTransientHttpError,
      });
      deliveredIds.push(subscription._id.toString());
    } catch (error: unknown) {
      const statusCode = httpStatusFromError(error);
      if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription._id.toString());
      else failedIds.push(subscription._id.toString());
    }
  }));

  const updates: Promise<unknown>[] = [];
  if (expiredIds.length) updates.push(OwnerPushSubscription.deleteMany({ _id: { $in: expiredIds } }));
  if (deliveredIds.length) {
    updates.push(OwnerPushSubscription.updateMany(
      { _id: { $in: deliveredIds } },
      { $set: { lastDeliveredAt: new Date(), failureCount: 0 } },
    ));
  }
  if (failedIds.length) {
    updates.push(OwnerPushSubscription.updateMany({ _id: { $in: failedIds } }, { $inc: { failureCount: 1 } }));
  }
  updates.push(OwnerPushSubscription.deleteMany({ shopId, failureCount: { $gte: MAX_SUBSCRIPTION_FAILURES } }));
  await Promise.all(updates);
}

/**
 * Alert the shop owner's registered devices about a new enquiry. Best effort:
 * a no-op when VAPID is not configured, and failures never affect the customer.
 */
export function scheduleOwnerEnquiryPush(
  shopId: string,
  enquiry: { customerName: string; message: string; productName?: string },
) {
  if (!pushIsConfigured()) return;
  after(async () => {
    try {
      await deliverOwnerEnquiryPush(shopId, enquiry);
    } catch (error) {
      console.error("Owner enquiry push failed", error);
    }
  });
}
