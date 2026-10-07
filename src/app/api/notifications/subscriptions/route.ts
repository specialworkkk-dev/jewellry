import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { cleanString, isObjectId, isRecord } from "@/lib/validation";
import PushSubscriptionModel from "@/models/PushSubscription";
import Shop from "@/models/Shop";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

// The server POSTs to this URL when sending pushes, so reject anything that is
// not a public https hostname (IP literals, localhost, credentials, odd ports).
function isSafePushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (url.port && url.port !== "443") return false;
    if (!host.includes(".") || host.startsWith("[") || /^[\d.]+$/.test(host)) return false;
    if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp)$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function subscriptionDetails(value: unknown) {
  if (!isRecord(value) || !isRecord(value.keys)) return null;
  const endpoint = cleanString(value.endpoint, 2048);
  const p256dh = cleanString(value.keys.p256dh, 512);
  const auth = cleanString(value.keys.auth, 512);
  if (!isSafePushEndpoint(endpoint) || !p256dh || !auth) return null;
  return {
    endpoint,
    p256dh,
    auth,
    expirationTime: typeof value.expirationTime === "number" ? value.expirationTime : null,
  };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rate = await checkRateLimit(`push-subscribe:${requestClientId(request)}`, 30, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many subscription attempts" }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isObjectId(body.shopId)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const subscription = subscriptionDetails(body.subscription);
  if (!subscription) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  await connectToDatabase();
  const shop = await Shop.findOne({ _id: body.shopId, isApproved: true, isActive: true }).select("_id").lean();
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  await PushSubscriptionModel.updateOne(
    { shopId: body.shopId, endpoint: subscription.endpoint },
    {
      $set: {
        expirationTime: subscription.expirationTime,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        userAgent: cleanString(request.headers.get("user-agent"), 500),
        failureCount: 0,
      },
      $setOnInsert: { shopId: body.shopId, endpoint: subscription.endpoint },
    },
    { upsert: true, runValidators: true },
  );

  return NextResponse.json({ subscribed: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rate = await checkRateLimit(`push-unsubscribe:${requestClientId(request)}`, 30, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isObjectId(body.shopId)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const endpoint = cleanString(body.endpoint, 2048);
  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectToDatabase();
  await PushSubscriptionModel.deleteOne({ shopId: body.shopId, endpoint });
  return NextResponse.json({ subscribed: false }, { headers: { "Cache-Control": "no-store" } });
}
