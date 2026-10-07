import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import { isObjectId } from "@/lib/validation";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);

/**
 * The JWT is only used to identify the user. The role is re-read from the
 * database (memoized per request) so demoted or deleted admins lose access
 * immediately rather than when the token expires.
 */
export const getVerifiedAdminSession = cache(async () => {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!session || !userId || !ADMIN_ROLES.has(session.user?.role ?? "") || !isObjectId(userId)) return null;

  try {
    await connectToDatabase();
    const user = await User.findById(userId).select("role").lean<{ role?: string }>();
    if (!user || !ADMIN_ROLES.has(user.role ?? "")) return null;
    return { ...session, user: { ...session.user, role: user.role as string } };
  } catch (error) {
    console.error("Admin session verification failed", error);
    return null;
  }
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
