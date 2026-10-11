import type { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isObjectId } from "@/lib/validation";

const VISITOR_COOKIE = "luxestore_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Same identity rule as the storefront (getPublicActorId): signed-in user id, else the visitor cookie. */
export async function resolveActor(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const cookieId = req.cookies.get(VISITOR_COOKIE)?.value;
  const validCookie = cookieId && isObjectId(cookieId) ? cookieId : undefined;
  if (session?.user?.id && isObjectId(session.user.id)) return { actorId: session.user.id, newVisitorId: undefined };
  if (validCookie) return { actorId: validCookie, newVisitorId: undefined };
  const created = new Types.ObjectId().toString();
  return { actorId: created, newVisitorId: created };
}

/** Same cookie attributes as the interactions route. */
export function withVisitorCookie(response: NextResponse, visitorId: string | undefined) {
  if (visitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  return response;
}

/** The caller's existing identity (signed-in user, else visitor cookie) without minting a new one. */
export async function existingActor(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && isObjectId(session.user.id)) return session.user.id;
  const cookieId = req.cookies.get(VISITOR_COOKIE)?.value;
  return cookieId && isObjectId(cookieId) ? cookieId : undefined;
}
