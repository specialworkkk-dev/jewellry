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
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime ?? null,
          keys: subscription.keys,
        }, payload, { TTL: 24 * 60 * 60, urgency: "normal" });
        deliveredIds.push(subscription._id.toString());
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 0;
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

export function scheduleShopPushNotification(
  shopId: string,
  trigger: CustomerNotificationTrigger,
  context: PushContext = {},
) {
  if (!pushIsConfigured()) return;
  after(async () => {
    try {
      await deliverShopNotification(shopId, trigger, context);
    } catch (error) {
      // A push-provider outage must never roll back the owner's successful edit.
      console.error("Shop push notification delivery failed", error);
    }
  });
}
