"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { collectAndStoreInfrastructureReport } from "@/lib/infrastructure-monitor";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export async function refreshInfrastructureReport() {
  await requirePlatformAdmin();

  await collectAndStoreInfrastructureReport("manual");
  revalidatePath("/admin");
  revalidatePath("/admin/infrastructure");
  redirect("/admin/infrastructure");
}
