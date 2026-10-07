import "server-only";

import { after } from "next/server";
import webpush from "web-push";
import connectToDatabase from "@/lib/mongoose";
import {
  customerNotificationTemplates,
  defaultTemplateForTrigger,
  renderNotificationText,
  type CustomerNotificationTrigger,
} from "@/lib/notification-templates";
import PushSubscriptionModel from "@/models/PushSubscription";
import Shop from "@/models/Shop";
import ShopNotificationSettings from "@/models/ShopNotificationSettings";
import { httpStatusFromError, isTransientHttpError, withRetry } from "@/lib/retry";
import NotificationJob from "@/models/NotificationJob";
import { cleanString, isObjectId } from "@/lib/validation";

type PushContext = {
  entityId?: string;
  productName?: string;
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
) {
  if (!configureWebPush()) return;
  await connectToDatabase();

  const [shop, settings, subscriptions] = await Promise.all([
    Shop.findOne({ _id: shopId, isApproved: true, isActive: true })
      .select("name slug")
      .lean(),
    ShopNotificationSettings.findOne({ shopId }).lean(),
    PushSubscriptionModel.find({ shopId })
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
  const values = { shopName: String(shop.name), productName: context.productName };
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
    tag: `luxestore:${shopId}:${trigger}`,
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
  await Promise.all(updates);
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
    await deliverShopNotification(
      job.shopId.toString(),
      job.trigger as CustomerNotificationTrigger,
      job.context || {},
    );
    await NotificationJob.updateOne({ _id: job._id }, {
      $set: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
      },
      $unset: { lockedAt: "", lastError: "" },
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
  await connectToDatabase();
  let jobId: string | null = null;
  try {
    const job = await NotificationJob.create({
      shopId,
      trigger,
      context: {
        entityId: cleanString(context.entityId, 100) || undefined,
        productName: cleanString(context.productName, 200) || undefined,
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
