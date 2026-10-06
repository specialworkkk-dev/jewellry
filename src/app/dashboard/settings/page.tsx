import { ShopSettingsForm } from "@/components/shop/ShopSettingsForm";
import { getCurrentSession } from "@/lib/session";
import { getOwnerShop } from "@/lib/owner-data";
import connectToDatabase from "@/lib/mongoose";
import {
  customerNotificationTriggers,
  templatesForTrigger,
  type CustomerNotificationTrigger,
} from "@/lib/notification-templates";
import { NotificationSettingsCard } from "@/components/shop/NotificationSettingsCard";
import PushSubscriptionModel from "@/models/PushSubscription";
import ShopNotificationSettings from "@/models/ShopNotificationSettings";

export default async function ShopSettingsPage() {
  const session = await getCurrentSession();
  const shopId = session?.user.shopId;
  await connectToDatabase();
  const [shop, notificationSettings, subscriberCount] = await Promise.all([
    shopId ? getOwnerShop(shopId) : null,
    shopId ? ShopNotificationSettings.findOne({ shopId }).lean() : null,
    shopId ? PushSubscriptionModel.countDocuments({ shopId }) : 0,
  ]);
  const serializableShop = shop ? JSON.parse(JSON.stringify(shop)) : undefined;
  const initialTriggers = customerNotificationTriggers.map((trigger) => {
    const saved = notificationSettings?.triggers?.find(
      (item: { trigger: CustomerNotificationTrigger }) => item.trigger === trigger,
    );
    return {
      trigger,
      enabled: saved?.enabled ?? true,
      templateId: saved?.templateId || templatesForTrigger(trigger)[0]?.id || "",
      customTitle: saved?.customTitle || "",
      customBody: saved?.customBody || "",
    };
  });

  return (
    <div className="space-y-6">
      <ShopSettingsForm shop={serializableShop} />
      {shop && (
        <NotificationSettingsCard
          shopName={shop.name}
          subscriberCount={subscriberCount}
          configured={Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)}
          initialEnabled={notificationSettings?.enabled ?? true}
          initialTriggers={JSON.parse(JSON.stringify(initialTriggers))}
        />
      )}
    </div>
  );
}
