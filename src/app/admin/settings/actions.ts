"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import PlatformSettings from "@/models/PlatformSettings";

export async function updatePlatformSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  const allowedAdminRoles = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);
  const activeRole = session?.user?.role ?? "";

  if (!session || !allowedAdminRoles.has(activeRole)) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();

  const updates = {
    key: "default",
    platformName: (formData.get("platformName")?.toString() || "LuxeStore SaaS").trim(),
    supportEmail: (formData.get("supportEmail")?.toString() || "support@luxestore.com").trim(),
    supportPhone: (formData.get("supportPhone")?.toString() || "+91 98765 43210").trim(),
    defaultMaxProducts: Number(formData.get("defaultMaxProducts") || 50),
    defaultMaxLinkOpens: Number(formData.get("defaultMaxLinkOpens") || 500),
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
