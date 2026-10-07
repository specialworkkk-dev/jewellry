"use server";

import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongoose";
import {
  customerNotificationTemplates,
  customerNotificationTriggers,
} from "@/lib/notification-templates";
import { cleanString } from "@/lib/validation";
import ShopNotificationSettings from "@/models/ShopNotificationSettings";
import { requireOwnerTenant } from "@/lib/tenant";

export async function updateNotificationSettings(formData: FormData) {
  const { shopId } = await requireOwnerTenant();

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
    { shopId },
    {
      $set: {
        enabled: formData.get("notificationsEnabled") === "on",
        triggers,
      },
      $setOnInsert: { shopId },
    },
    { upsert: true, runValidators: true },
  );
  revalidatePath("/dashboard/settings");
}
