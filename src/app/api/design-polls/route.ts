import { NextResponse } from "next/server";
import { getVerifiedOwnerTenant } from "@/lib/tenant";
import { getPlanBlock } from "@/lib/plan";
import { isRecord } from "@/lib/validation";
import { createPoll, invalidatePollCaches } from "@/lib/design-poll-data";
import { scheduleShopEvent } from "@/lib/realtime";

/** Owner: start a "Design of the Week" poll (one active poll per shop). */
export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const planBlock = getPlanBlock(tenant.shop);
    if (planBlock) return NextResponse.json({ error: planBlock.error }, { status: planBlock.status });

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });

    const shopRef = { shopId: tenant.shopId, slug: tenant.shop.slug };
    const outcome = await createPoll(shopRef, { title: body.title, productIds: body.productIds, durationDays: body.durationDays });
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    invalidatePollCaches(shopRef);
    scheduleShopEvent(tenant.shopId, "shop.settings.updated", "both", outcome.pollId);
    return NextResponse.json({ message: "Poll started", pollId: outcome.pollId, endsAt: outcome.endsAt.toISOString() }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create design poll error:", error);
    return NextResponse.json({ error: "Unable to start the poll" }, { status: 500 });
  }
}
