import { NextRequest, NextResponse } from "next/server";
import { isObjectId, isRecord } from "@/lib/validation";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { isBotUserAgent } from "@/lib/engagement-dedupe";
import { castVote, invalidatePollCaches } from "@/lib/design-poll-data";
import { resolveActor, withVisitorCookie } from "../../visitor";

const VOTES_PER_HOUR_PER_IP = 30;
const NO_STORE = { "Cache-Control": "no-store" };

/** Public: cast one vote. One vote per visitor per poll; the poll must be running. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

    if (isBotUserAgent(req.headers.get("user-agent"))) {
      return NextResponse.json({ error: "Votes must come from a browser" }, { status: 403, headers: NO_STORE });
    }
    const rate = await checkRateLimit(`design-vote:${id}:${requestClientId(req)}`, VOTES_PER_HOUR_PER_IP, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many votes from this connection. Please try again later." },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body) || !isObjectId(body.productId)) {
      return NextResponse.json({ error: "Choose a design to vote for" }, { status: 400, headers: NO_STORE });
    }

    const { actorId, newVisitorId } = await resolveActor(req);
    const outcome = await castVote({ pollId: id, productId: body.productId, actorId });
    const reply = (data: unknown, status: number) => withVisitorCookie(NextResponse.json(data, { status, headers: NO_STORE }), newVisitorId);

    switch (outcome.kind) {
      case "not_found":
        return reply({ error: "This poll is not available" }, 404);
      case "bad_product":
        return reply({ error: "That design is not part of this poll" }, 400);
      case "ended":
        if (outcome.closedNow && outcome.shop) invalidatePollCaches(outcome.shop);
        return reply({ error: "Voting has ended", code: "ENDED", results: outcome.results }, 409);
      case "already":
        return reply({ error: "You have already voted in this poll", code: "ALREADY_VOTED", results: outcome.results, votedProductId: outcome.votedProductId }, 409);
      case "voted":
        return reply({ message: "Vote recorded", results: outcome.results, votedProductId: outcome.votedProductId }, 200);
    }
  } catch (error: unknown) {
    console.error("Design poll vote error:", error);
    return NextResponse.json({ error: "Unable to record your vote" }, { status: 500, headers: NO_STORE });
  }
}
