import { NextResponse } from "next/server";
import { getVerifiedOwnerTenant } from "@/lib/tenant";
import { isObjectId } from "@/lib/validation";
import { endPollEarly, invalidatePollCaches, toResults } from "@/lib/design-poll-data";

/** Owner: end their own poll now. The shop comes from the session, so another shop's poll id is a plain 404. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

    const outcome = await endPollEarly(tenant.shopId, id);
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    invalidatePollCaches({ shopId: tenant.shopId, slug: tenant.shop.slug });
    return NextResponse.json({ message: "Poll ended", results: outcome.closed ? toResults(outcome.closed) : null });
  } catch (error: unknown) {
    console.error("End design poll error:", error);
    return NextResponse.json({ error: "Unable to end the poll" }, { status: 500 });
  }
}
