"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import {
  customerNotificationTemplates,
  customerNotificationTriggers,
} from "@/lib/notification-templates";
import { cleanString } from "@/lib/validation";
import ShopNotificationSettings from "@/models/ShopNotificationSettings";

export async function updateNotificationSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SHOP_OWNER" || !session.user.shopId) {
    throw new Error("Unauthorized");
  }

  const triggers = customerNotificationTriggers.map((trigger) => {
    const requestedTemplateId = cleanString(formData.get(`${trigger}:templateId`), 80);
    const allowedTemplate = customerNotificationTemplates.find(
      (template) => template.id === requestedTemplateId && template.trigger === trigger,
    ) || customerNotificationTemplates.find((template) => template.trigger === trigger);
    if (!allowedTemplate) throw new Error(`Missing templates for ${trigger}`);
    return {
      trigger,
      enabled: formData.get(`${trigger}:enabled`) === "on",
      templateId: allowedTemplate.id,
      customTitle: cleanString(formData.get(`${trigger}:customTitle`), 100),
      customBody: cleanString(formData.get(`${trigger}:customBody`), 240),
    };
  });

  await connectToDatabase();
  await ShopNotificationSettings.updateOne(
    { shopId: session.user.shopId },
    {
      $set: {
        enabled: formData.get("notificationsEnabled") === "on",
        triggers,
      },
      $setOnInsert: { shopId: session.user.shopId },
    },
    { upsert: true, runValidators: true },
  );
  revalidatePath("/dashboard/settings");
}

