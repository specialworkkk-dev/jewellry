"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongoose";
import PlatformSettings from "@/models/PlatformSettings";
import { requirePlatformAdmin } from "@/lib/admin-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s()-]{6,18}[0-9]$/;

function text(formData: FormData, name: string, fallback: string) {
  const v = formData.get(name)?.toString().trim();
  return v ? v : fallback;
}

function intField(formData: FormData, name: string, label: string, max: number, errors: string[]) {
  const raw = formData.get(name)?.toString().trim() ?? "";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    errors.push(`${label} must be a whole number between 1 and ${max.toLocaleString("en-IN")}.`);
    return 1;
  }
  return n;
}

export async function updatePlatformSettings(formData: FormData) {
  await requirePlatformAdmin();

  const errors: string[] = [];
  const platformName = text(formData, "platformName", "LuxeStore SaaS");
  const supportEmail = text(formData, "supportEmail", "support@luxestore.com");
  const supportPhone = text(formData, "supportPhone", "+91 98765 43210");
  if (platformName.length > 80) errors.push("Platform name must be at most 80 characters.");
  if (supportEmail.length > 254 || !EMAIL_RE.test(supportEmail)) errors.push("Support email is not a valid email address.");
  if (supportPhone.length > 24 || !PHONE_RE.test(supportPhone)) errors.push("Support phone is not a valid phone number.");
  const defaultMaxProducts = intField(formData, "defaultMaxProducts", "Default max products", 1_000_000, errors);
  const defaultMaxLinkOpens = intField(formData, "defaultMaxLinkOpens", "Default link opens", 1_000_000_000, errors);
  if (errors.length > 0) redirect(`/admin/settings?error=${encodeURIComponent(errors.join(" "))}`);

  await connectToDatabase();

  const updates = {
    key: "default",
    platformName,
    supportEmail,
    supportPhone,
    defaultMaxProducts,
    defaultMaxLinkOpens,
    allowPublicRegistration: formData.get("allowPublicRegistration") === "on",
    allowAutoApproval: formData.get("allowAutoApproval") === "on",
  };

  await PlatformSettings.findOneAndUpdate(
    { key: "default" },
    { $set: updates },
    { upsert: true, new: true }
  );

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
