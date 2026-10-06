import "server-only";

import { cookies } from "next/headers";
import { isObjectId } from "@/lib/validation";
import { getCurrentSession } from "@/lib/session";

const VISITOR_COOKIE = "luxestore_visitor_id";
const SESSION_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

export async function getPublicActorId() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const hasSession = SESSION_COOKIES.some((name) => Boolean(cookieStore.get(name)?.value));
  if (!hasSession) return visitorId && isObjectId(visitorId) ? visitorId : undefined;

  const session = await getCurrentSession();
  return session?.user?.id || (visitorId && isObjectId(visitorId) ? visitorId : undefined);
}
