import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);

export const getVerifiedAdminSession = cache(async () => {
  const session = await getCurrentSession();
  const role = session?.user?.role ?? "";
  return session && ADMIN_ROLES.has(role) ? session : null;
});

/**
 * Page/data-access guard. It must run in the page before any database query;
 * relying on an enclosing layout can leak streamed page data during redirect.
 */
export async function requirePlatformAdmin() {
  const session = await getVerifiedAdminSession();
  if (!session) redirect("/login");
  return session;
}

/** Route handlers need a nullable result so they can return a JSON 401. */
export async function isPlatformAdmin() {
  return Boolean(await getVerifiedAdminSession());
}
