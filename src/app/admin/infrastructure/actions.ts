"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/authOptions";
import { collectAndStoreInfrastructureReport } from "@/lib/infrastructure-monitor";

export async function refreshInfrastructureReport() {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(session.user.role ?? "")) {
    redirect("/login");
  }

  await collectAndStoreInfrastructureReport("manual");
  revalidatePath("/admin");
  revalidatePath("/admin/infrastructure");
  redirect("/admin/infrastructure");
}
