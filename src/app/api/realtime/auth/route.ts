import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { getAblyRestClient, shopRealtimeChannel } from "@/lib/realtime";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { isObjectId } from "@/lib/validation";
import Shop from "@/models/Shop";
import { getVerifiedOwnerTenant } from "@/lib/tenant";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId") ?? "";
  const audience = request.nextUrl.searchParams.get("audience");
  if (!isObjectId(shopId) || (audience !== "customer" && audience !== "owner")) {
    return NextResponse.json({ error: "Invalid realtime subscription" }, { status: 400 });
  }

  // Mobile carriers and village Wi-Fi can place many real customers behind one
  // public IP, so customer token creation needs a higher shared-IP allowance.
  const rateLimit = audience === "owner" ? 30 : 300;
  const rate = await checkRateLimit(
    `realtime-auth:${audience}:${shopId}:${requestClientId(request)}`,
    rateLimit,
    60 * 1000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many realtime connection attempts" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const ably = getAblyRestClient();
  if (!ably) {
    return NextResponse.json({ error: "Realtime is not configured" }, { status: 503 });
  }

  await connectToDatabase();
  let channel: string;
  let clientId: string;

  if (audience === "owner") {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant || tenant.shopId !== shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    channel = shopRealtimeChannel(shopId, "owner");
    clientId = `owner:${tenant.session.user.id}`;
  } else {
    const shop = await Shop.findOne({ _id: shopId, isApproved: true, isActive: true }).select("_id").lean();
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    channel = shopRealtimeChannel(shopId, "public");
    clientId = `customer:${crypto.randomUUID()}`;
  }

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    ttl: TOKEN_TTL_MS,
    capability: JSON.stringify({ [channel]: ["subscribe"] }),
  });

  return NextResponse.json(tokenRequest, {
    headers: { "Cache-Control": "no-store" },
  });
}
