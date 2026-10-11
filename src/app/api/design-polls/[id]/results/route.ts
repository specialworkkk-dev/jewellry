import { NextRequest, NextResponse } from "next/server";
import { isObjectId } from "@/lib/validation";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { invalidatePollCaches, readPollForResults } from "@/lib/design-poll-data";
import { existingActor } from "../../visitor";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Public: live tallies. Withheld (403) until the caller has voted or the poll is closed, so non-voters
 * cannot scrape running totals.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    const rate = await checkRateLimit(`design-results:${id}:${requestClientId(req)}`, 240, 60 * 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: NO_STORE });

    const data = await readPollForResults(id, await existingActor(req));
    if (!data) return NextResponse.json({ error: "This poll is not available" }, { status: 404, headers: NO_STORE });
    if (data.closedNow) invalidatePollCaches(data.shop);
    if (data.poll.status === "ACTIVE" && !data.votedProductId) {
      return NextResponse.json({ error: "Vote to see the results" }, { status: 403, headers: NO_STORE });
    }
    return NextResponse.json({ results: data.results, votedProductId: data.votedProductId }, { headers: NO_STORE });
  } catch (error: unknown) {
    console.error("Design poll results error:", error);
    return NextResponse.json({ error: "Unable to load results" }, { status: 500, headers: NO_STORE });
  }
}
