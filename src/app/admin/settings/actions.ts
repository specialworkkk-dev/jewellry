"use server";

import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import PlatformSettings from "@/models/PlatformSettings";
import { requirePlatformAdmin } from "@/lib/admin-auth";

const parsePositiveInt = (value: FormDataEntryValue | null | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};

export async function updatePlatformSettings(formData: FormData) {
  await requirePlatformAdmin();

  await connectToDatabase();

  const updates = {
    key: "default",
    platformName: (formData.get("platformName")?.toString() || "LuxeStore SaaS").trim(),
    supportEmail: (formData.get("supportEmail")?.toString() || "support@luxestore.com").trim(),
    supportPhone: (formData.get("supportPhone")?.toString() || "+91 98765 43210").trim(),
    defaultMaxProducts: parsePositiveInt(formData.get("defaultMaxProducts"), 50),
    defaultMaxLinkOpens: parsePositiveInt(formData.get("defaultMaxLinkOpens"), 500),
    allowPublicRegistration: formData.get("allowPublicRegistration") === "on",
    allowAutoApproval: formData.get("allowAutoApproval") === "on",
  };

  await PlatformSettings.findOneAndUpdate(
    { key: "default" },
    { $set: updates },
    { upsert: true, new: true }
  );

  redirect("/admin/settings");
}
